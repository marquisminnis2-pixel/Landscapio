import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Organization from '../models/Organization';
import Membership from '../models/Membership';
import { AuthRequest } from '../middleware/auth';

// Helper: create org + membership for a verified user
async function createDefaultOrg(userId: any, userName: string) {
  const baseSlug = userName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-workspace';
  let slug = baseSlug;
  let counter = 1;
  while (await Organization.findOne({ slug, deletedAt: null })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  const org = new Organization({
    name: `${userName}'s Workspace`,
    slug,
    ownerId: userId,
    plan: 'free',
    billingPeriod: 'monthly',
    subscription: { status: 'active' },
    limits: { maxSites: 1, maxCollaborators: 1, storageGB: 0, monthlyVisitors: 0 },
  });
  await org.save();
  await Membership.create({ userId, orgId: org._id, role: 'owner' });
  return org;
}

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    // Check if email is already taken
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      globalRole: 'user',
      emailVerified: true,
    });
    await user.save();

    // Auto-create org + membership so user can log in immediately
    const org = await createDefaultOrg(user._id, name);

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: { _id: user._id, name: user.name, email: user.email, globalRole: user.globalRole },
      defaultOrgId: org._id,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.query as { token: string };

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required.' });
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'This verification link is invalid or has expired.' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: 'This email has already been verified. Please log in.' });
    }

    // Mark verified
    user.emailVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpiry = null;
    await user.save();

    // Create org + membership
    const org = await createDefaultOrg(user._id, user.name);

    // Issue JWT — user is now logged in
    const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    return res.json({
      token: jwtToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        globalRole: user.globalRole,
      },
      defaultOrgId: org._id,
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Server error during email verification' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check lockout
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const hoursLeft = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / (1000 * 60 * 60));
      return res.status(423).json({ message: `Account locked. Try again in ${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}.` });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 3) {
        user.lockoutUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await user.save();
        return res.status(423).json({ message: 'Too many failed attempts. Account locked for 24 hours.' });
      }
      await user.save();
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Reset failed attempts on successful login
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    user.lastLoginAt = new Date();
    await user.save();

    let memberships = await Membership.find({ userId: user._id });
    let orgIds = memberships.map((m) => m.orgId);
    let orgs = await Organization.find({ _id: { $in: orgIds } });

    // Recovery: if the user has no org (e.g. registration failed after user was created),
    // auto-create one now so they can log in and work normally.
    if (orgs.length === 0) {
      const recoveredOrg = await createDefaultOrg(user._id, user.name);
      memberships = await Membership.find({ userId: user._id });
      orgIds = memberships.map((m) => m.orgId);
      orgs = [recoveredOrg];
    }

    const defaultOrg = orgs.find((o) => o.ownerId.toString() === user._id.toString()) || orgs[0];

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        globalRole: user.globalRole,
        subscriptionActive: user.subscriptionActive ?? true,
      },
      defaultOrgId: defaultOrg?._id || null,
      orgs: orgs.map((o) => ({
        _id: o._id,
        name: o.name,
        slug: o.slug,
        plan: o.plan,
        myRole: memberships.find((m) => m.orgId.toString() === o._id.toString())?.role,
      })),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const memberships = await Membership.find({ userId: req.userId });
    const orgIds = memberships.map((m) => m.orgId);
    const orgs = await Organization.find({ _id: { $in: orgIds } });
    res.json({
      ...user.toObject(),
      orgs: orgs.map((o) => ({
        _id: o._id,
        name: o.name,
        slug: o.slug,
        plan: o.plan,
        myRole: memberships.find((m) => m.orgId.toString() === o._id.toString())?.role,
      })),
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    // Always return generic message for security
    res.json({ message: 'If an account with that email exists, we sent password reset instructions' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
