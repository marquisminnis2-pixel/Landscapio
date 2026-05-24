import { Response } from 'express';
import mongoose from 'mongoose';
import { HostingSite, IHostingSite, Deployment, Domain, Entitlement, PLAN_LIMITS } from '../models/hosting.index';
import Project from '../models/Project';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middleware/auth';
import { getDeploymentService } from '../hosting/DeploymentService';
import { getHostingAdapter } from '../hosting';

/**
 * Generate a unique slug from project name
 */
const generateSlug = async (name: string): Promise<string> => {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);

  let slug = base || 'site';
  let counter = 0;

  while (await HostingSite.findOne({ slug })) {
    counter++;
    slug = `${base}-${counter}`;
  }

  return slug;
};

/**
 * Get or create entitlement for an organization
 */
const getOrCreateEntitlement = async (orgId: mongoose.Types.ObjectId) => {
  let entitlement = await Entitlement.findOne({ orgId });
  if (!entitlement) {
    entitlement = await Entitlement.create({
      orgId,
      planTier: 'free',
      usage: {
        sitesCreated: 0,
        deploymentsThisMonth: 0,
        bandwidthUsedMb: 0,
        customDomainsUsed: 0,
      },
    });
  }
  return entitlement;
};

/**
 * Get all sites for an organization
 */
export const getSites = async (req: AuthRequest, res: Response) => {
  try {
    const sites = await HostingSite.find({ orgId: req.orgId })
      .populate('activeDeploymentId', 'version status liveAt productionUrl previewUrl provider')
      .sort({ updatedAt: -1 });

    res.json(sites);
  } catch (error) {
    console.error('Get sites error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get a single site by ID
 */
export const getSite = async (req: AuthRequest, res: Response) => {
  try {
    const site = await HostingSite.findOne({
      _id: req.params.siteId,
      orgId: req.orgId,
    }).populate('activeDeploymentId');

    if (!site) {
      return res.status(404).json({ message: 'Site not found' });
    }

    // Get domains for this site
    const domains = await Domain.find({ siteId: site._id, orgId: req.orgId });

    res.json({ ...site.toObject(), domains });
  } catch (error) {
    console.error('Get site error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get site for a specific project
 */
export const getSiteByProject = async (req: AuthRequest, res: Response) => {
  try {
    const site = await HostingSite.findOne({
      projectId: req.params.projectId,
      orgId: req.orgId,
    }).populate('activeDeploymentId');

    if (!site) {
      return res.status(404).json({ message: 'Site not found for this project' });
    }

    // Get domains for this site
    const domains = await Domain.find({ siteId: site._id, orgId: req.orgId });

    res.json({ ...site.toObject(), domains });
  } catch (error) {
    console.error('Get site by project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create a new site (linked to a project)
 */
export const createSite = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, name, slug: requestedSlug } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }

    // Check entitlement limits
    const entitlement = await getOrCreateEntitlement(req.orgId as mongoose.Types.ObjectId);
    if (!entitlement.canCreateSite()) {
      const limits = PLAN_LIMITS[entitlement.planTier];
      return res.status(403).json({
        message: `Site limit reached. Your ${entitlement.planTier} plan allows ${limits.maxSites} sites.`,
        upgradeRequired: true,
      });
    }

    // Verify project exists and belongs to org
    const project = await Project.findOne({
      _id: projectId,
      orgId: req.orgId,
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if site already exists for this project
    const existingSite = await HostingSite.findOne({
      projectId,
      orgId: req.orgId,
    });

    if (existingSite) {
      return res.status(400).json({
        message: 'Site already exists for this project',
        site: existingSite,
      });
    }

    // Generate slug
    const slug = requestedSlug
      ? requestedSlug.toLowerCase().replace(/[^a-z0-9-]/g, '')
      : await generateSlug(name || project.name);

    // Validate slug length
    if (slug.length < 3 || slug.length > 63) {
      return res.status(400).json({ message: 'Slug must be between 3 and 63 characters' });
    }

    // Check slug availability
    if (await HostingSite.findOne({ slug })) {
      return res.status(400).json({ message: 'Subdomain is already taken' });
    }

    const site = new HostingSite({
      orgId: req.orgId,
      projectId,
      name: name || project.name,
      slug,
      status: 'draft',
      settings: {},
      analytics: { totalVisits: 0 },
    });

    await site.save();

    // Update entitlement usage
    entitlement.usage.sitesCreated += 1;
    await entitlement.save();

    await AuditLog.create({
      orgId: req.orgId,
      userId: req.userId,
      action: 'site:create',
      targetType: 'HostingSite',
      targetId: site._id,
    });

    res.status(201).json(site);
  } catch (error: any) {
    console.error('Create site error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Subdomain is already taken' });
    }
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * Update site settings
 */
export const updateSite = async (req: AuthRequest, res: Response) => {
  try {
    const { name, slug, settings, status } = req.body;
    const updateData: Partial<IHostingSite> = {};

    if (name) updateData.name = name;
    if (settings) updateData.settings = settings;
    if (status && ['draft', 'live', 'paused'].includes(status)) {
      updateData.status = status;
    }

    // Fetch existing site so we can detect slug changes
    const oldSite = await HostingSite.findOne({
      _id: req.params.siteId,
      orgId: req.orgId,
    });
    if (!oldSite) {
      return res.status(404).json({ message: 'Site not found' });
    }

    let slugChanged = false;

    // Handle slug change
    if (slug) {
      const normalized = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (normalized.length < 3 || normalized.length > 63) {
        return res.status(400).json({ message: 'Slug must be between 3 and 63 characters' });
      }
      if (normalized !== oldSite.slug) {
        const existing = await HostingSite.findOne({
          slug: normalized,
          _id: { $ne: req.params.siteId },
        });
        if (existing) {
          return res.status(400).json({ message: 'Subdomain is already taken' });
        }
        updateData.slug = normalized;
        slugChanged = true;
      }
    }

    const site = await HostingSite.findOneAndUpdate(
      { _id: req.params.siteId, orgId: req.orgId },
      { $set: updateData },
      { new: true }
    );

    if (!site) {
      return res.status(404).json({ message: 'Site not found' });
    }

    // If slug changed and site was previously deployed, clean up the old Cloudflare project
    if (slugChanged && oldSite.status !== 'draft') {
      try {
        const adapter = getHostingAdapter();
        // Build a temporary site object with the old slug so the adapter deletes the right project
        const oldSiteForDelete = { ...oldSite.toObject(), slug: oldSite.slug } as IHostingSite;
        await adapter.deleteSite(oldSiteForDelete);
        console.log(`[updateSite] Deleted old Cloudflare project for slug "${oldSite.slug}"`);
      } catch (err) {
        // Non-blocking: log but don't fail the update
        console.warn(`[updateSite] Failed to delete old Cloudflare project for slug "${oldSite.slug}":`, err);
      }
    }

    await AuditLog.create({
      orgId: req.orgId,
      userId: req.userId,
      action: 'site:update',
      targetType: 'HostingSite',
      targetId: site._id,
    });

    res.json(site);
  } catch (error: any) {
    console.error('Update site error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * Delete a site and all its deployments
 */
export const deleteSite = async (req: AuthRequest, res: Response) => {
  try {
    const site = await HostingSite.findOne({
      _id: req.params.siteId,
      orgId: req.orgId,
    });

    if (!site) {
      return res.status(404).json({ message: 'Site not found' });
    }

    // Delete hosted files from provider
    try {
      const adapter = getHostingAdapter();
      await adapter.deleteSite(site);
    } catch (hostingErr) {
      console.warn('Failed to delete hosted files:', hostingErr);
      // Continue with database deletion even if hosting cleanup fails
    }

    // Delete all deployments for this site
    await Deployment.deleteMany({ siteId: site._id });

    // Delete all domains for this site
    await Domain.deleteMany({ siteId: site._id });

    // Delete the site
    await HostingSite.findByIdAndDelete(site._id);

    // Update entitlement usage
    const entitlement = await Entitlement.findOne({ orgId: req.orgId });
    if (entitlement && entitlement.usage.sitesCreated > 0) {
      entitlement.usage.sitesCreated -= 1;
      await entitlement.save();
    }

    await AuditLog.create({
      orgId: req.orgId,
      userId: req.userId,
      action: 'site:delete',
      targetType: 'HostingSite',
      targetId: site._id,
    });

    res.json({ message: 'Site deleted successfully' });
  } catch (error) {
    console.error('Delete site error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get deployments for a site
 */
export const getDeployments = async (req: AuthRequest, res: Response) => {
  try {
    const { siteId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    // Verify site access
    const site = await HostingSite.findOne({ _id: siteId, orgId: req.orgId });
    if (!site) {
      return res.status(404).json({ message: 'Site not found' });
    }

    const deployments = await Deployment.find({ siteId, orgId: req.orgId })
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .populate('createdBy', 'name email');

    const total = await Deployment.countDocuments({ siteId, orgId: req.orgId });

    res.json({
      deployments,
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error('Get deployments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get a single deployment
 */
export const getDeployment = async (req: AuthRequest, res: Response) => {
  try {
    const deployment = await Deployment.findOne({
      _id: req.params.deploymentId,
      orgId: req.orgId,
    }).populate('createdBy', 'name email');

    if (!deployment) {
      return res.status(404).json({ message: 'Deployment not found' });
    }

    res.json(deployment);
  } catch (error) {
    console.error('Get deployment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Trigger a new deployment
 */
export const createDeployment = async (req: AuthRequest, res: Response) => {
  try {
    const { siteId } = req.params;
    const { commitMessage, triggeredBy = 'manual' } = req.body;

    // Check entitlement limits
    const entitlement = await getOrCreateEntitlement(req.orgId as mongoose.Types.ObjectId);
    if (!entitlement.canDeploy()) {
      const limits = PLAN_LIMITS[entitlement.planTier];
      return res.status(403).json({
        message: `Monthly deployment limit reached. Your ${entitlement.planTier} plan allows ${limits.deploymentsPerMonth} deployments per month.`,
        upgradeRequired: true,
      });
    }

    // Verify site access
    const site = await HostingSite.findOne({ _id: siteId, orgId: req.orgId });
    if (!site) {
      return res.status(404).json({ message: 'Site not found' });
    }

    // Check for in-progress deployment
    const inProgress = await Deployment.findOne({
      siteId,
      status: { $in: ['queued', 'building', 'uploading', 'propagating'] },
    });

    if (inProgress) {
      return res.status(400).json({
        message: 'A deployment is already in progress',
        deployment: inProgress,
      });
    }

    // Determine hosting provider from environment
    const hostingProvider = process.env.HOSTING_PROVIDER || 'local';

    // Create new deployment (version auto-increments via pre-save hook)
    const deployment = new Deployment({
      siteId,
      orgId: req.orgId,
      projectId: site.projectId,
      status: 'queued',
      provider: hostingProvider,
      commitMessage,
      createdBy: req.userId,
      triggeredBy,
    });

    await deployment.save();

    // Update entitlement usage
    entitlement.usage.deploymentsThisMonth += 1;
    await entitlement.save();

    await AuditLog.create({
      orgId: req.orgId,
      userId: req.userId,
      action: 'deployment:create',
      targetType: 'Deployment',
      targetId: deployment._id,
      metadata: { siteId, version: deployment.version },
    });

    // Trigger deployment asynchronously (don't await - let client poll for status)
    const deploymentService = getDeploymentService();
    deploymentService.processDeployment(deployment._id.toString()).catch((err) => {
      console.error('Deployment processing failed:', err);
    });

    res.status(201).json(deployment);
  } catch (error: any) {
    console.error('Create deployment error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * Rollback to a previous deployment
 */
export const rollbackDeployment = async (req: AuthRequest, res: Response) => {
  try {
    const { deploymentId } = req.params;

    // Find the deployment to rollback to (must be live or superseded)
    const targetDeployment = await Deployment.findOne({
      _id: deploymentId,
      orgId: req.orgId,
      status: { $in: ['live', 'superseded'] },
    });

    if (!targetDeployment) {
      return res.status(404).json({
        message: 'Deployment not found or cannot be rolled back to',
      });
    }

    const site = await HostingSite.findOne({
      _id: targetDeployment.siteId,
      orgId: req.orgId,
    });

    if (!site) {
      return res.status(404).json({ message: 'Site not found' });
    }

    // Mark current active deployment as superseded
    if (site.activeDeploymentId) {
      await Deployment.findByIdAndUpdate(site.activeDeploymentId, {
        status: 'superseded',
      });
    }

    // Update target deployment status to live
    targetDeployment.status = 'live';
    targetDeployment.liveAt = new Date();
    await targetDeployment.save();

    // Update site to point to this deployment
    site.activeDeploymentId = targetDeployment._id as mongoose.Types.ObjectId;
    site.lastDeployedAt = new Date();
    site.status = 'live';
    await site.save();

    await AuditLog.create({
      orgId: req.orgId,
      userId: req.userId,
      action: 'deployment:rollback',
      targetType: 'Deployment',
      targetId: targetDeployment._id,
      metadata: { siteId: site._id, version: targetDeployment.version },
    });

    res.json({
      message: 'Rollback successful',
      site,
      deployment: targetDeployment,
    });
  } catch (error) {
    console.error('Rollback deployment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Check slug availability
 */
export const checkSubdomain = async (req: AuthRequest, res: Response) => {
  try {
    const { subdomain } = req.params;
    const normalized = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');

    if (!normalized || normalized.length < 3) {
      return res.json({ available: false, reason: 'Subdomain must be at least 3 characters' });
    }

    if (normalized.length > 63) {
      return res.json({ available: false, reason: 'Subdomain must be at most 63 characters' });
    }

    const existing = await HostingSite.findOne({ slug: normalized });
    res.json({ available: !existing, subdomain: normalized });
  } catch (error) {
    console.error('Check subdomain error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get entitlement/plan info for organization
 */
export const getEntitlement = async (req: AuthRequest, res: Response) => {
  try {
    const entitlement = await getOrCreateEntitlement(req.orgId as mongoose.Types.ObjectId);
    const limits = PLAN_LIMITS[entitlement.planTier];

    res.json({
      entitlement,
      limits,
      usage: entitlement.usage,
    });
  } catch (error) {
    console.error('Get entitlement error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==================== DOMAIN MANAGEMENT ====================

/**
 * Add a custom domain to a site
 */
export const addDomain = async (req: AuthRequest, res: Response) => {
  try {
    const { siteId } = req.params;
    const { domain, isPrimary = false } = req.body;

    if (!domain) {
      return res.status(400).json({ message: 'Domain is required' });
    }

    // Check entitlement for custom domains
    const entitlement = await getOrCreateEntitlement(req.orgId as mongoose.Types.ObjectId);
    if (!entitlement.canAddCustomDomain()) {
      const limits = PLAN_LIMITS[entitlement.planTier];
      return res.status(403).json({
        message: `Custom domain limit reached. Your ${entitlement.planTier} plan allows ${limits.customDomains} custom domains.`,
        upgradeRequired: true,
      });
    }

    // Verify site access
    const site = await HostingSite.findOne({ _id: siteId, orgId: req.orgId });
    if (!site) {
      return res.status(404).json({ message: 'Site not found' });
    }

    // Check if domain already exists
    const existingDomain = await Domain.findOne({ domain: domain.toLowerCase() });
    if (existingDomain) {
      return res.status(400).json({ message: 'Domain is already in use' });
    }

    // Determine if apex domain
    const domainParts = domain.toLowerCase().split('.');
    const isApex = domainParts.length === 2;

    // Generate verification token
    const verificationToken = `genesis-verify-${mongoose.Types.ObjectId()}`;

    const newDomain = new Domain({
      orgId: req.orgId,
      siteId,
      domain: domain.toLowerCase(),
      isApex,
      status: 'pending',
      verificationMethod: 'dns_cname',
      verificationToken,
      expectedCname: `${site.slug}.genesis.site`,
      isPrimary,
    });

    await newDomain.save();

    // Update entitlement usage
    entitlement.usage.customDomainsUsed += 1;
    await entitlement.save();

    await AuditLog.create({
      orgId: req.orgId,
      userId: req.userId,
      action: 'domain:add',
      targetType: 'Domain',
      targetId: newDomain._id,
      metadata: { siteId, domain },
    });

    res.status(201).json({
      domain: newDomain,
      verification: {
        method: 'dns_cname',
        record: newDomain.expectedCname,
        instructions: isApex
          ? `Add an A record pointing to our IP, or use ANAME/ALIAS if your DNS provider supports it.`
          : `Add a CNAME record pointing ${domain} to ${newDomain.expectedCname}`,
      },
    });
  } catch (error: any) {
    console.error('Add domain error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Domain is already in use' });
    }
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * Get domains for a site
 */
export const getDomains = async (req: AuthRequest, res: Response) => {
  try {
    const { siteId } = req.params;

    // Verify site access
    const site = await HostingSite.findOne({ _id: siteId, orgId: req.orgId });
    if (!site) {
      return res.status(404).json({ message: 'Site not found' });
    }

    const domains = await Domain.find({ siteId, orgId: req.orgId }).sort({ isPrimary: -1, createdAt: 1 });

    res.json(domains);
  } catch (error) {
    console.error('Get domains error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Verify a domain
 */
export const verifyDomain = async (req: AuthRequest, res: Response) => {
  try {
    const { domainId } = req.params;

    const domain = await Domain.findOne({
      _id: domainId,
      orgId: req.orgId,
    });

    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' });
    }

    // Update verification attempt
    domain.lastVerificationAttempt = new Date();
    domain.verificationAttempts += 1;
    domain.status = 'verifying';
    await domain.save();

    // Perform actual DNS verification
    const { verifyDomain: verifyDNS } = await import('../services/dnsVerification');
    const result = await verifyDNS(
      domain.domain,
      domain.verificationMethod,
      domain.expectedCname,
      domain.verificationToken,
      domain.isApex
    );

    if (result.verified) {
      domain.status = 'active';
      domain.verifiedAt = new Date();
      domain.detectedCname = result.actualValue;
      domain.sslStatus = 'provisioning';
      await domain.save();

      // Trigger SSL provisioning asynchronously
      const { provisionSSLForDomain } = await import('../services/sslProvisioning');
      provisionSSLForDomain(domain.domain).catch((err) => {
        console.error('SSL provisioning failed:', err);
      });

      res.json({
        domain,
        message: 'Domain verified successfully! SSL certificate provisioning has started.',
        verification: result,
      });
    } else {
      // Don't mark as failed immediately - allow retries
      if (domain.verificationAttempts >= 10) {
        domain.status = 'failed';
      } else {
        domain.status = 'pending';
      }
      await domain.save();

      res.json({
        domain,
        message: result.error || 'Verification failed. Please check your DNS settings.',
        verification: result,
      });
    }
  } catch (error) {
    console.error('Verify domain error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Remove a domain
 */
export const removeDomain = async (req: AuthRequest, res: Response) => {
  try {
    const { domainId } = req.params;

    const domain = await Domain.findOne({
      _id: domainId,
      orgId: req.orgId,
    });

    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' });
    }

    await Domain.findByIdAndDelete(domainId);

    // Update entitlement usage
    const entitlement = await Entitlement.findOne({ orgId: req.orgId });
    if (entitlement && entitlement.usage.customDomainsUsed > 0) {
      entitlement.usage.customDomainsUsed -= 1;
      await entitlement.save();
    }

    await AuditLog.create({
      orgId: req.orgId,
      userId: req.userId,
      action: 'domain:remove',
      targetType: 'Domain',
      targetId: domain._id,
      metadata: { siteId: domain.siteId, domain: domain.domain },
    });

    res.json({ message: 'Domain removed successfully' });
  } catch (error) {
    console.error('Remove domain error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Set primary domain for a site
 */
export const setPrimaryDomain = async (req: AuthRequest, res: Response) => {
  try {
    const { domainId } = req.params;

    const domain = await Domain.findOne({
      _id: domainId,
      orgId: req.orgId,
      status: 'active', // Must be verified
    });

    if (!domain) {
      return res.status(404).json({ message: 'Domain not found or not verified' });
    }

    // The pre-save hook on Domain will handle unsetting other primary domains
    domain.isPrimary = true;
    await domain.save();

    await AuditLog.create({
      orgId: req.orgId,
      userId: req.userId,
      action: 'domain:set_primary',
      targetType: 'Domain',
      targetId: domain._id,
      metadata: { siteId: domain.siteId, domain: domain.domain },
    });

    res.json(domain);
  } catch (error) {
    console.error('Set primary domain error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};