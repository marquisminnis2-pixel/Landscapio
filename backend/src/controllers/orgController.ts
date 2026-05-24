import { Response } from 'express';
import Organization from '../models/Organization';
import Membership from '../models/Membership';
import Project from '../models/Project';
import Asset from '../models/Asset';
import PublishedSite from '../models/PublishedSite';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middleware/auth';

/**
 * Get all organizations the current user belongs to.
 */
export const getMyOrgs = async (req: AuthRequest, res: Response) => {
  try {
    const memberships = await Membership.find({ userId: req.userId });
    const orgIds = memberships.map((m) => m.orgId);

    const orgs = await Organization.find({ _id: { $in: orgIds } });

    // Attach the user's role for each org
    const result = orgs.map((org) => {
      const membership = memberships.find((m) => m.orgId.toString() === org._id.toString());
      return {
        ...org.toObject(),
        myRole: membership?.role,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('getMyOrgs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get a single organization by ID.
 * Requires resolveOrg middleware (user must be a member).
 */
export const getOrg = async (req: AuthRequest, res: Response) => {
  try {
    const org = await Organization.findById(req.orgId);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.json({ ...org.toObject(), myRole: req.membershipRole });
  } catch (error) {
    console.error('getOrg error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create a new organization.
 * The creating user becomes the owner.
 */
export const createOrg = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Organization name is required' });
    }

    // Generate a slug from the name
    const baseSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    let slug = baseSlug;
    let counter = 1;

    // Ensure slug uniqueness
    while (await Organization.findOne({ slug, deletedAt: null })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const org = new Organization({
      name,
      slug,
      ownerId: req.userId,
      plan: 'free',
      billingPeriod: 'monthly',
      subscription: { status: 'active' },
      limits: {
        maxSites: 2,
        maxCollaborators: 1,
        storageGB: 1,
        monthlyVisitors: 1000,
      },
    });

    await org.save();

    // Create owner membership
    await Membership.create({
      userId: req.userId,
      orgId: org._id,
      role: 'owner',
    });

    // Audit log
    await AuditLog.create({
      orgId: org._id,
      userId: req.userId,
      action: 'org:create',
      targetType: 'Organization',
      targetId: org._id,
    });

    res.status(201).json({ ...org.toObject(), myRole: 'owner' });
  } catch (error) {
    console.error('createOrg error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update organization settings (name, etc).
 * Requires org:settings permission.
 */
export const updateOrg = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;

    const updates: Record<string, any> = {};
    if (name) updates.name = name;

    const org = await Organization.findByIdAndUpdate(
      req.orgId,
      { $set: updates },
      { new: true }
    );

    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    await AuditLog.create({
      orgId: req.orgId,
      userId: req.userId,
      action: 'org:update',
      targetType: 'Organization',
      targetId: org._id,
      metadata: updates,
    });

    res.json(org);
  } catch (error) {
    console.error('updateOrg error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete (soft-delete) an organization.
 * Only the owner can delete. Cascades soft-delete to projects, assets, published sites.
 */
export const deleteOrg = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.orgId;

    // Soft-delete all projects in this org
    await Project.updateMany({ orgId }, { $set: { deletedAt: new Date() } });

    // Remove assets
    await Asset.deleteMany({ orgId });

    // Remove published sites
    await PublishedSite.deleteMany({ orgId });

    // Remove all memberships
    await Membership.deleteMany({ orgId });

    // Soft-delete the org
    await Organization.findByIdAndUpdate(orgId, { $set: { deletedAt: new Date() } });

    await AuditLog.create({
      orgId,
      userId: req.userId,
      action: 'org:delete',
      targetType: 'Organization',
      targetId: orgId,
    });

    res.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error('deleteOrg error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};