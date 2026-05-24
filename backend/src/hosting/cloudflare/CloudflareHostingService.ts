/**
 * Cloudflare Hosting Service
 *
 * Service layer that orchestrates Cloudflare Pages deployments.
 * Handles database persistence, status polling, and error recovery.
 *
 * Usage example:
 *
 * ```typescript
 * const service = getCloudflareHostingService();
 *
 * // Create a site
 * const site = await service.createHostingSite(orgId, projectId, 'my-site');
 *
 * // Deploy
 * const deployment = await service.deployProject(site._id, project._id, {
 *   commitMessage: 'Initial deploy'
 * });
 *
 * // Poll status
 * const status = await service.getDeploymentStatus(deployment._id);
 * ```
 */

import mongoose from 'mongoose';
import { HostingSite, Deployment, Entitlement } from '../../models/hosting.index';
import { IHostingSite } from '../../models/HostingSite';
import { IDeployment } from '../../models/Deployment';
import Project from '../../models/Project';
import { CloudflarePagesAdapter, getCloudflarePagesAdapter } from './CloudflarePagesAdapter';
import { DeploymentFiles, DeploymentProgress } from '../HostingAdapter';
import { getDeploymentService } from '../DeploymentService';

// ============================================
// SERVICE IMPLEMENTATION
// ============================================

export class CloudflareHostingService {
  private adapter: CloudflarePagesAdapter;

  constructor() {
    this.adapter = getCloudflarePagesAdapter();
  }

  // ============================================
  // SITE OPERATIONS
  // ============================================

  /**
   * Create a new hosting site with Cloudflare Pages project
   *
   * This:
   * 1. Creates the HostingSite record in MongoDB
   * 2. Creates the Cloudflare Pages project
   * 3. Updates HostingSite with providerProjectId and liveUrl
   */
  async createHostingSite(
    orgId: string,
    projectId: string,
    name: string,
    slug?: string
  ): Promise<IHostingSite> {
    // Check entitlement limits
    const entitlement = await Entitlement.findOne({ orgId });
    if (entitlement) {
      const siteCount = await HostingSite.countDocuments({ orgId });
      const limits = this.getPlanLimits(entitlement.plan);
      if (siteCount >= limits.maxSites) {
        throw new Error(`Site limit reached (${limits.maxSites}). Please upgrade your plan.`);
      }
    }

    // Generate slug if not provided
    const siteSlug = slug || this.generateSlug(name);

    // Check slug availability
    const existing = await HostingSite.findOne({ slug: siteSlug });
    if (existing) {
      throw new Error(`Slug "${siteSlug}" is already taken`);
    }

    // Create the HostingSite record
    const site = new HostingSite({
      orgId,
      projectId,
      name,
      slug: siteSlug,
      status: 'draft',
      settings: {},
      analytics: { totalVisits: 0 },
    });

    await site.save();

    // Create Cloudflare Pages project
    const result = await this.adapter.createSite(site);

    if (result.success) {
      // Update site with provider info
      site.providerProjectId = result.providerProjectId;
      site.liveUrl = result.liveUrl;
      await site.save();
    } else {
      // Clean up on failure
      await HostingSite.findByIdAndDelete(site._id);
      throw new Error(result.error || 'Failed to create Cloudflare project');
    }

    return site;
  }

  /**
   * Delete a hosting site and its Cloudflare project
   */
  async deleteHostingSite(siteId: string): Promise<void> {
    const site = await HostingSite.findById(siteId);
    if (!site) {
      throw new Error('Site not found');
    }

    // Delete Cloudflare project
    await this.adapter.deleteSite(site);

    // Delete all deployments
    await Deployment.deleteMany({ siteId });

    // Delete the site record
    await HostingSite.findByIdAndDelete(siteId);
  }

  // ============================================
  // DEPLOYMENT OPERATIONS
  // ============================================

  /**
   * Deploy a project to Cloudflare Pages
   *
   * This:
   * 1. Creates a Deployment record with 'queued' status
   * 2. Builds static files from the project
   * 3. Deploys to Cloudflare Pages
   * 4. Updates Deployment status throughout
   * 5. Returns the completed Deployment
   */
  async deployProject(
    siteId: string,
    projectId: string,
    options?: {
      commitMessage?: string;
      triggeredBy?: 'manual' | 'auto' | 'api';
    },
    onProgress?: (progress: DeploymentProgress) => void
  ): Promise<IDeployment> {
    const site = await HostingSite.findById(siteId);
    if (!site) {
      throw new Error('Site not found');
    }

    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Get next version number
    const lastDeployment = await Deployment.findOne({ siteId })
      .sort({ version: -1 })
      .limit(1);
    const version = (lastDeployment?.version || 0) + 1;

    // Create deployment record
    const deployment = new Deployment({
      siteId,
      orgId: site.orgId,
      projectId,
      version,
      status: 'queued',
      provider: 'cloudflare',
      triggeredBy: options?.triggeredBy || 'manual',
      commitMessage: options?.commitMessage,
      assets: [],
      totalSize: 0,
    });

    await deployment.save();

    try {
      // Build static files
      deployment.status = 'building';
      deployment.buildStartedAt = new Date();
      await deployment.save();

      onProgress?.({
        stage: 'building',
        progress: 0,
        message: 'Generating static files...',
      });

      // NOTE: actual file building goes through DeploymentService which handles
      // rawHtml template mode, nav fixes, and asset bundling. This class is not
      // currently used in the active deployment flow (hostingController uses
      // DeploymentService.processDeployment directly).
      const deploymentService = getDeploymentService();
      void deploymentService; // referenced for future use
      const files = await this.buildStaticFiles(project);

      deployment.buildCompletedAt = new Date();
      await deployment.save();

      onProgress?.({
        stage: 'building',
        progress: 100,
        message: 'Build complete',
      });

      // Upload to Cloudflare
      deployment.status = 'uploading';
      deployment.uploadStartedAt = new Date();
      await deployment.save();

      const result = await this.adapter.deploy(site, deployment, files, onProgress);

      deployment.uploadCompletedAt = new Date();

      if (result.success) {
        deployment.status = 'live';
        deployment.previewUrl = result.previewUrl;
        deployment.productionUrl = result.productionUrl;
        deployment.providerDeploymentId = result.providerDeploymentId;
        deployment.assets = result.assets || [];
        deployment.totalSize = result.totalSize || 0;
        deployment.liveAt = new Date();

        // Update site
        site.activeDeploymentId = deployment._id as mongoose.Types.ObjectId;
        site.status = 'live';
        site.lastDeployedAt = new Date();
        await site.save();

        // Update project
        project.isPublished = true;
        project.publishedUrl = result.productionUrl;
        await project.save();
      } else {
        deployment.status = 'failed';
        deployment.error = result.error;
      }

      await deployment.save();
      return deployment;
    } catch (error: any) {
      deployment.status = 'failed';
      deployment.error = error.message;
      await deployment.save();
      throw error;
    }
  }

  /**
   * Get deployment status (with polling support)
   */
  async getDeploymentStatus(deploymentId: string): Promise<{
    status: string;
    progress: number;
    message: string;
    previewUrl?: string;
    productionUrl?: string;
  }> {
    const deployment = await Deployment.findById(deploymentId);
    if (!deployment) {
      throw new Error('Deployment not found');
    }

    const site = await HostingSite.findById(deployment.siteId);
    if (!site) {
      throw new Error('Site not found');
    }

    // If deployment has a provider ID, check Cloudflare status
    if (deployment.providerDeploymentId && deployment.status !== 'live' && deployment.status !== 'failed') {
      const cfStatus = await this.adapter.getDeploymentStatus(
        site,
        deployment.providerDeploymentId
      );

      // Update local status if changed
      if (cfStatus.status === 'live' && deployment.status !== 'live') {
        deployment.status = 'live';
        deployment.previewUrl = cfStatus.previewUrl;
        deployment.liveAt = new Date();
        await deployment.save();

        site.status = 'live';
        site.activeDeploymentId = deployment._id as mongoose.Types.ObjectId;
        await site.save();
      } else if (cfStatus.status === 'failed' && deployment.status !== 'failed') {
        deployment.status = 'failed';
        deployment.error = cfStatus.error;
        await deployment.save();
      }
    }

    const progress = this.getProgressFromStatus(deployment.status);

    return {
      status: deployment.status,
      progress,
      message: this.getStatusMessage(deployment.status),
      previewUrl: deployment.previewUrl,
      productionUrl: deployment.productionUrl,
    };
  }

  /**
   * Rollback to a previous deployment
   */
  async rollbackDeployment(
    siteId: string,
    targetDeploymentId: string
  ): Promise<IDeployment> {
    const site = await HostingSite.findById(siteId);
    if (!site) {
      throw new Error('Site not found');
    }

    const targetDeployment = await Deployment.findById(targetDeploymentId);
    if (!targetDeployment || !targetDeployment.providerDeploymentId) {
      throw new Error('Target deployment not found or has no provider ID');
    }

    // Mark current active deployment as superseded
    if (site.activeDeploymentId) {
      await Deployment.findByIdAndUpdate(site.activeDeploymentId, {
        status: 'superseded',
      });
    }

    // Rollback via Cloudflare
    const result = await this.adapter.rollback(
      site,
      targetDeployment.providerDeploymentId
    );

    if (!result.success) {
      throw new Error(result.error || 'Rollback failed');
    }

    // Create a new deployment record for the rollback
    const rollbackDeployment = new Deployment({
      siteId,
      orgId: site.orgId,
      projectId: targetDeployment.projectId,
      version: (await this.getNextVersion(siteId)),
      status: 'live',
      provider: 'cloudflare',
      triggeredBy: 'rollback',
      commitMessage: `Rollback to v${targetDeployment.version}`,
      providerDeploymentId: result.providerDeploymentId,
      previewUrl: result.previewUrl,
      productionUrl: result.liveUrl,
      assets: targetDeployment.assets,
      totalSize: targetDeployment.totalSize,
      liveAt: new Date(),
    });

    await rollbackDeployment.save();

    // Update site
    site.activeDeploymentId = rollbackDeployment._id as mongoose.Types.ObjectId;
    site.lastDeployedAt = new Date();
    await site.save();

    return rollbackDeployment;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Build static files from project (delegates to DeploymentService)
   */
  private async buildStaticFiles(project: any): Promise<DeploymentFiles[]> {
    // This is a simplified version - actual implementation in DeploymentService
    const files: DeploymentFiles[] = [];

    // Generate HTML
    const html = this.generateHTML(project);
    files.push({
      path: '/index.html',
      content: Buffer.from(html, 'utf-8'),
      contentType: 'text/html',
    });

    // Generate CSS
    const css = this.generateCSS(project);
    files.push({
      path: '/styles.css',
      content: Buffer.from(css, 'utf-8'),
      contentType: 'text/css',
    });

    // Generate JS
    const js = this.generateJS();
    files.push({
      path: '/script.js',
      content: Buffer.from(js, 'utf-8'),
      contentType: 'application/javascript',
    });

    return files;
  }

  private generateHTML(project: any): string {
    const renderElement = (el: any): string => {
      if (!el) return '';
      const children = el.children?.map(renderElement).join('') || '';
      const content = el.content || children;

      switch (el.type) {
        case 'text':
          return `<p class="el-${el.id}">${content}</p>`;
        case 'heading':
          const level = el.attributes?.level || 1;
          return `<h${level} class="el-${el.id}">${content}</h${level}>`;
        case 'image':
          return `<img class="el-${el.id}" src="${el.attributes?.src || ''}" alt="${el.attributes?.alt || ''}" />`;
        case 'container':
        case 'section':
        case 'div':
          return `<div class="el-${el.id}">${children}</div>`;
        default:
          return `<div class="el-${el.id}">${content}</div>`;
      }
    };

    const bodyContent = (project.elements || []).map(renderElement).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name || 'Website'}</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
${bodyContent}
<script src="/script.js"></script>
</body>
</html>`;
  }

  private generateCSS(project: any): string {
    const cssRules: string[] = [
      `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }`,
      `body { font-family: system-ui, sans-serif; line-height: 1.5; }`,
      `img { max-width: 100%; height: auto; }`,
    ];

    const processElement = (el: any) => {
      if (!el) return;
      if (el.styles?.desktop) {
        const css = Object.entries(el.styles.desktop)
          .map(([prop, val]) => `${prop.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${val}`)
          .join('; ');
        cssRules.push(`.el-${el.id} { ${css} }`);
      }
      el.children?.forEach(processElement);
    };

    (project.elements || []).forEach(processElement);
    return cssRules.join('\n\n');
  }

  private generateJS(): string {
    return `document.addEventListener('DOMContentLoaded', function() {
  console.log('Site loaded');
});`;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 63);
  }

  private async getNextVersion(siteId: string): Promise<number> {
    const last = await Deployment.findOne({ siteId }).sort({ version: -1 });
    return (last?.version || 0) + 1;
  }

  private getPlanLimits(plan: string): { maxSites: number } {
    const limits: Record<string, { maxSites: number }> = {
      free: { maxSites: 1 },
    };
    return limits[plan] || limits.free;
  }

  private getProgressFromStatus(status: string): number {
    const progress: Record<string, number> = {
      queued: 10,
      building: 30,
      uploading: 60,
      propagating: 80,
      live: 100,
      failed: 100,
      superseded: 100,
    };
    return progress[status] || 0;
  }

  private getStatusMessage(status: string): string {
    const messages: Record<string, string> = {
      queued: 'Deployment queued...',
      building: 'Building static files...',
      uploading: 'Uploading to Cloudflare...',
      propagating: 'Propagating to edge network...',
      live: 'Deployment live!',
      failed: 'Deployment failed',
      superseded: 'Deployment superseded',
    };
    return messages[status] || status;
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let serviceInstance: CloudflareHostingService | null = null;

export function getCloudflareHostingService(): CloudflareHostingService {
  if (!serviceInstance) {
    serviceInstance = new CloudflareHostingService();
  }
  return serviceInstance;
}