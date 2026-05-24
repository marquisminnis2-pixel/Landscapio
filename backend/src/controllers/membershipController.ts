import { Response } from 'express';
import Membership from '../models/Membership';
import User from '../models/User';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middleware/auth';
import { OrgRole } from '../models/Membership';

/**
 * List all members of the current org.
 */
export const listMembers = async (req: AuthRequest, res: Response) => {
  try {
    const members = await Membership.find({ orgId: req.orgId })
      .populate('userId', 'name email avatar');

    res.json(members);
  } catch (error) {
    console.error('listMembers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Invite a user to the org by email.
 * Creates a membership with the specified role.
 */
export const inviteMember = async (req: AuthRequest, res: Response) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ message: 'Email and role are required' });
    }

    const validRoles: OrgRole[] = ['admin', 'editor', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be admin, editor, or viewer.' });
    }

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No user found with that email' });
    }

    // Check if already a member
    const existing = await Membership.findOne({ userId: user._id, orgId: req.orgId });
    if (existing) {
      return res.status(400).json({ message: 'User is already a member of this organization' });
    }

    const membership = await Membership.create({
      userId: user._id,
      orgId: req.orgId,
      role,
      invitedBy: req.userId,
      inviteAcceptedAt: new Date(), // Auto-accept for now; add invite flow later
    });

    await AuditLog.create({
      orgId: req.orgId,
      userId: req.userId,
      action: 'member:invite',
      targetType: 'Membership',
      targetId: membership._id,
      metadata: { invitedEmail: email, role },
    });

    res.status(201).json(membership);
  } catch (error) {
    console.error('inviteMember error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Change a member's role.
 */
export const changeRole = async (req: AuthRequest, res: Response) => {
  try {
    const { memberId } = req.params;
    const { role } = req.body;

    const validRoles: OrgRole[] = ['owner', 'admin', 'editor', 'viewer'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const target = await Membership.findOne({ _id: memberId, orgId: req.orgId });
    if (!target) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Prevent demoting the last owner
    if (target.role === 'owner' && role !== 'owner') {
      const ownerCount = await Membership.countDocuments({ orgId: req.orgId, role: 'owner' });
      if (ownerCount <= 1) {
        return res.status(400).json({ message: 'Cannot demote the last owner. Transfer ownership first.' });
      }
    }

    // Prevent self-demotion
    if (target.userId.toString() === req.userId) {
      return res.status(400).json({ message: 'Cannot change your own role. Have another owner or admin do it.' });
    }

    const previousRole = target.role;
    target.role = role;
    await target.save();

    await AuditLog.create({
      orgId: req.orgId,
      userId: req.userId,
      action: 'member:role',
      targetType: 'Membership',
      targetId: target._id,
      metadata: { previousRole, newRole: role },
    });

    res.json(target);
  } catch (error) {
    console.error('changeRole error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Remove a member from the org.
 */
export const removeMember = async (req: AuthRequest, res: Response) => {
  try {
    const { memberId } = req.params;

    const target = await Membership.findOne({ _id: memberId, orgId: req.orgId });
    if (!target) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Can't remove yourself
    if (target.userId.toString() === req.userId) {
      return res.status(400).json({ message: 'Cannot remove yourself. Use the leave endpoint instead.' });
    }

    // Can't remove the last owner
    if (target.role === 'owner') {
      const ownerCount = await Membership.countDocuments({ orgId: req.orgId, role: 'owner' });
      if (ownerCount <= 1) {
        return res.status(400).json({ message: 'Cannot remove the last owner.' });
      }
    }

    await Membership.deleteOne({ _id: memberId });

    await AuditLog.create({
      orgId: req.orgId,
      userId: req.userId,
      action: 'member:remove',
      targetType: 'Membership',
      targetId: target._id,
      metadata: { removedUserId: target.userId, removedRole: target.role },
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('removeMember error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Leave an org (self-removal).
 */
export const leaveOrg = async (req: AuthRequest, res: Response) => {
  try {
    const membership = await Membership.findOne({ userId: req.userId, orgId: req.orgId });
    if (!membership) {
      return res.status(404).json({ message: 'Membership not found' });
    }

    // Can't leave if you're the last owner
    if (membership.role === 'owner') {
      const ownerCount = await Membership.countDocuments({ orgId: req.orgId, role: 'owner' });
      if (ownerCount <= 1) {
        return res.status(400).json({ message: 'Cannot leave as the last owner. Transfer ownership first.' });
      }
    }

    await Membership.deleteOne({ _id: membership._id });

    await AuditLog.create({
      orgId: req.orgId,
      userId: req.userId,
      action: 'member:leave',
      targetType: 'Membership',
      targetId: membership._id,
    });

    res.json({ message: 'Left organization successfully' });
  } catch (error) {
    console.error('leaveOrg error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};