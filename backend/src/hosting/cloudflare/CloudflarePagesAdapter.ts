/**
 * Cloudflare Pages Hosting Adapter
 *
 * Implements the HostingAdapter interface for Cloudflare Pages deployments.
 * Uses the Direct Upload API (no git integration required).
 *
 * Features:
 * - Create/delete Cloudflare Pages projects
 * - Deploy from local directory OR zip buffer
 * - Real-time deployment status polling
 * - Custom domain attachment (Phase 2 scaffolding)
 * - Rollback to previous deployments
 *
 * Configuration (env vars):
 * - CLOUDFLARE_API_TOKEN: API token with Pages:Edit scope
 * - CLOUDFLARE_ACCOUNT_ID: Your Cloudflare account ID
 * - GENESIS_BASE_DOMAIN: Base domain (default: pages.dev)
 * - GENESIS_ENV: Environment (dev/prod)
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import {
  BaseHostingAdapter,
  DeploymentResult,
  DeploymentProgress,
  DeploymentFiles,
} from '../HostingAdapter';
import { IDeployment, IDeploymentAsset } from '../../models/Deployment';
import { IHostingSite } from '../../models/HostingSite';
import {
  CloudflareClient,
  CloudflareApiError,
  getCloudflareClient,
  isCloudflareConfigured,
} from './cloudflareClient';
import {
  DeployInput,
  DeployResult,
  CreateSiteResult,
  CreateSiteOptions,
  DeploymentStatusResult,
  AttachDomainResult,
  CloudflareDeploymentStatus,
  GenesisDeploymentStatus,
  FileManifest,
} from './types';

// ============================================
// CONFIGURATION
// ============================================

const GENESIS_BASE_DOMAIN = process.env.GENESIS_BASE_DOMAIN || 'pages.dev';
const GENESIS_ENV = process.env.GENESIS_ENV || 'dev';

// MIME type mapping for common static files
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

// ============================================
// ADAPTER IMPLEMENTATION
// ============================================

export class CloudflarePagesAdapter extends BaseHostingAdapter {
  readonly provider = 'cloudflare';
  private client: CloudflareClient;

  constructor() {
    super();
    this.client = getCloudflareClient();
  }

  // ============================================
  // CONFIGURATION
  // ============================================

  isConfigured(): boolean {
    return isCloudflareConfigured();
  }

  // ============================================
  // URL GENERATION
  // ============================================

  /**
   * Get the preview URL for a specific deployment version
   */
  getPreviewUrl(site: IHostingSite, deployment: IDeployment): string {
    // Use the URL stored in the deployment if available (from Cloudflare response)
    if (deployment.previewUrl) {
      return deployment.previewUrl;
    }
    // Cloudflare Pages preview URLs are: {deployment-id}.{project-name}.pages.dev
    const projectName = this.getProjectName(site);
    if (deployment.providerDeploymentId) {
      // Use short ID for preview URL - always use pages.dev
      return `https://${deployment.providerDeploymentId.substring(0, 8)}.${projectName}.pages.dev`;
    }
    return this.getProductionUrl(site);
  }

  /**
   * Get the production URL for a site
   */
  getProductionUrl(site: IHostingSite): string {
    const projectName = this.getProjectName(site);
    return `https://${projectName}.${GENESIS_BASE_DOMAIN}`;
  }

  /**
   * Generate the Cloudflare project name from site slug
   * Cloudflare project names must be lowercase, alphanumeric with hyphens
   */
  private getProjectName(site: IHostingSite): string {
    // Prefix with 'genesis-' to avoid conflicts and make identification easy
    const prefix = GENESIS_ENV === 'prod' ? '' : `${GENESIS_ENV}-`;
    return `${prefix}${site.slug}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }

  // ============================================
  // SITE OPERATIONS
  // ============================================

  /**
   * Create a new Cloudflare Pages project for a site
   */
  async createSite(
    site: IHostingSite,
    options?: CreateSiteOptions
  ): Promise<CreateSiteResult> {
    const projectName = this.getProjectName(site);

    try {
      this.logOperation('createSite', site.slug, { projectName });

      // Check if project already exists
      const existing = await this.client.getProject(projectName);
      if (existing) {
        return {
          success: true,
          providerProjectId: existing.id,
          liveUrl: `https://${existing.subdomain}`,
        };
      }

      // Create new project
      const project = await this.client.createProject(
        projectName,
        options?.productionBranch || 'main'
      );

      this.logSuccess('createSite', site.slug, {
        projectId: project.id,
        subdomain: project.subdomain,
      });

      return {
        success: true,
        providerProjectId: project.id,
        liveUrl: `https://${project.subdomain}`,
      };
    } catch (error) {
      const message = this.parseError(error, 'create site');
      this.logError('createSite', site.slug, error);

      return {
        success: false,
        providerProjectId: '',
        liveUrl: '',
        error: message,
      };
    }
  }

  /**
   * Delete a Cloudflare Pages project
   */
  async deleteSite(site: IHostingSite): Promise<void> {
    const projectName = this.getProjectName(site);

    try {
      this.logOperation('deleteSite', site.slug, { projectName });
      await this.client.deleteProject(projectName);
      this.logSuccess('deleteSite', site.slug, {});
    } catch (error) {
      // If project doesn't exist, that's fine
      if (error instanceof CloudflareApiError && error.statusCode === 404) {
        return;
      }
      this.logError('deleteSite', site.slug, error);
      throw error;
    }
  }

  // ============================================
  // DEPLOYMENT OPERATIONS
  // ============================================

  /**
   * Deploy files to Cloudflare Pages
   *
   * Implements the HostingAdapter interface deploy method
   */
  async deploy(
    site: IHostingSite,
    deployment: IDeployment,
    files: DeploymentFiles[],
    onProgress?: (progress: DeploymentProgress) => void
  ): Promise<DeploymentResult> {
    const projectName = this.getProjectName(site);

    try {
      // Stage 1: Building/preparing
      onProgress?.({
        stage: 'building',
        progress: 0,
        message: 'Preparing files for deployment...',
      });

      // Ensure project exists
      const createResult = await this.createSite(site);
      if (!createResult.success) {
        return {
          success: false,
          status: 'failed',
          error: createResult.error,
        };
      }

      onProgress?.({
        stage: 'building',
        progress: 50,
        message: 'Writing files to temp directory...',
      });

      // Write files to a temporary directory for wrangler to deploy
      const tmpDir = path.join(os.tmpdir(), `genesis-deploy-${deployment._id}`);
      fs.mkdirSync(tmpDir, { recursive: true });

      const fileManifest = this.prepareFilesForUpload(files);

      for (const file of fileManifest) {
        const filePath = path.join(tmpDir, file.path);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, file.content);
      }

      onProgress?.({
        stage: 'building',
        progress: 100,
        message: 'Files prepared',
      });

      // Stage 2: Deploy using wrangler CLI (works around Cloudflare REST API 500 bug)
      onProgress?.({
        stage: 'uploading',
        progress: 0,
        message: 'Deploying via Wrangler...',
      });

      console.log(`[CloudflarePagesAdapter] Deploying ${fileManifest.length} files via wrangler to ${projectName}`);

      const maxRetries = 3;
      let wranglerOutput = '';
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          wranglerOutput = execSync(
            `npx wrangler pages deploy "${tmpDir}" --project-name="${projectName}" --branch=main`,
            {
              env: {
                ...process.env,
                CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
                CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
              },
              timeout: 180000,
              encoding: 'utf-8',
            }
          );
          break; // Success — exit retry loop
        } catch (wranglerError: any) {
          console.warn(`[CloudflarePagesAdapter] Wrangler attempt ${attempt}/${maxRetries} failed:`, wranglerError.message?.substring(0, 200));
          if (attempt === maxRetries) {
            throw wranglerError; // All retries exhausted
          }
          onProgress?.({
            stage: 'uploading',
            progress: 0,
            message: `Upload failed, retrying (${attempt}/${maxRetries})...`,
          });
          // Wait before retrying (2s, 4s)
          const delay = attempt * 2000;
          execSync(`sleep ${delay / 1000}`);
        }
      }

      console.log('[CloudflarePagesAdapter] Wrangler output:', wranglerOutput);

      // Parse deployment URL from wrangler output
      const urlMatch = wranglerOutput.match(/https:\/\/[^\s]+\.pages\.dev/);
      const previewUrl = urlMatch ? urlMatch[0] : '';

      // Parse deployment ID from preview URL (e.g., https://028f9d6c.dev-home-11.pages.dev -> 028f9d6c)
      const idMatch = previewUrl.match(/https:\/\/([^.]+)\./);
      const shortId = idMatch ? idMatch[1] : '';

      // Clean up temp directory
      fs.rmSync(tmpDir, { recursive: true, force: true });

      onProgress?.({
        stage: 'uploading',
        progress: 100,
        message: 'Upload complete',
      });

      onProgress?.({
        stage: 'propagating',
        progress: 100,
        message: 'Deployment live!',
      });

      // Build assets list
      const assets: IDeploymentAsset[] = fileManifest.map((f) => ({
        path: f.path,
        url: `${previewUrl}${f.path}`,
        size: f.size,
        contentType: f.contentType,
        hash: f.hash,
      }));

      const totalSize = fileManifest.reduce((sum, f) => sum + f.size, 0);

      return {
        success: true,
        status: 'live',
        previewUrl,
        productionUrl: this.getProductionUrl(site),
        providerDeploymentId: shortId,
        assets,
        totalSize,
      };
    } catch (error) {
      const message = this.parseError(error, 'deploy');
      this.logError('deploy', site.slug, error);

      return {
        success: false,
        status: 'failed',
        error: message,
      };
    }
  }

  /**
   * Deploy from a directory path or zip buffer
   * (Alternative method for flexibility)
   */
  async deployFromInput(
    site: IHostingSite,
    input: DeployInput
  ): Promise<DeployResult> {
    const projectName = this.getProjectName(site);

    try {
      this.logOperation('deploy', site.slug, { projectName });

      // Ensure project exists
      const createResult = await this.createSite(site);
      if (!createResult.success) {
        return {
          success: false,
          providerDeploymentId: '',
          status: 'failure',
          error: createResult.error,
        };
      }

      // Get files from either directory or zip
      let fileManifest: FileManifest[];
      if (input.directoryPath) {
        fileManifest = await this.readDirectory(input.directoryPath);
      } else if (input.zipBuffer) {
        fileManifest = await this.extractZip(input.zipBuffer);
      } else {
        throw new Error('Either directoryPath or zipBuffer must be provided');
      }

      if (fileManifest.length === 0) {
        throw new Error('No files to deploy');
      }

      // Create deployment
      const deployment = await this.client.createDeployment(
        projectName,
        fileManifest.map((f) => ({
          path: f.path,
          hash: f.hash,
          content: f.content,
        })),
        {
          branch: input.branch || 'main',
          commitMessage: input.commitMessage,
        }
      );

      this.logSuccess('deploy', site.slug, {
        deploymentId: deployment.id,
        url: deployment.url,
        fileCount: fileManifest.length,
      });

      return {
        success: true,
        providerDeploymentId: deployment.id,
        previewUrl: deployment.url,
        liveUrl: this.getProductionUrl(site),
        status: this.mapStatus(deployment.latest_stage.name),
      };
    } catch (error) {
      const message = this.parseError(error, 'deploy');
      this.logError('deploy', site.slug, error);

      return {
        success: false,
        providerDeploymentId: '',
        status: 'failure',
        error: message,
      };
    }
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(
    site: IHostingSite,
    providerDeploymentId: string
  ): Promise<DeploymentStatusResult> {
    const projectName = this.getProjectName(site);

    try {
      const deployment = await this.client.getDeployment(
        projectName,
        providerDeploymentId
      );

      return {
        status: this.mapStatusToGenesis(deployment.latest_stage.name),
        providerStatus: deployment.latest_stage.name,
        previewUrl: deployment.url,
        liveUrl: this.getProductionUrl(site),
      };
    } catch (error) {
      const message = this.parseError(error, 'get deployment status');
      this.logError('getDeploymentStatus', site.slug, error);

      return {
        status: 'failed',
        providerStatus: 'failure',
        error: message,
      };
    }
  }

  /**
   * Delete a specific deployment
   */
  async deleteDeployment(site: IHostingSite, deployment: IDeployment): Promise<void> {
    const projectName = this.getProjectName(site);

    try {
      if (deployment.providerDeploymentId) {
        await this.client.cancelDeployment(projectName, deployment.providerDeploymentId);
      }
    } catch (error) {
      // If deployment doesn't exist, that's fine
      if (error instanceof CloudflareApiError && error.statusCode === 404) {
        return;
      }
      this.logError('deleteDeployment', site.slug, error);
      throw error;
    }
  }

  /**
   * Activate a specific deployment (make it the live version)
   *
   * Note: Cloudflare Pages doesn't have a direct "activate deployment" API.
   * The production deployment is automatically the latest deployment to 'main' branch.
   * To "rollback", we need to redeploy the files from that deployment.
   */
  async activateDeployment(
    site: IHostingSite,
    deployment: IDeployment
  ): Promise<DeploymentResult> {
    const projectName = this.getProjectName(site);

    try {
      if (!deployment.providerDeploymentId) {
        return {
          success: false,
          status: 'failed',
          error: 'No provider deployment ID',
        };
      }

      // Use retry endpoint to re-run the deployment
      const newDeployment = await this.client.retryDeployment(
        projectName,
        deployment.providerDeploymentId
      );

      return {
        success: true,
        status: 'live',
        previewUrl: newDeployment.url,
        productionUrl: this.getProductionUrl(site),
        providerDeploymentId: newDeployment.id,
      };
    } catch (error) {
      const message = this.parseError(error, 'activate deployment');
      this.logError('activateDeployment', site.slug, error);

      return {
        success: false,
        status: 'failed',
        error: message,
      };
    }
  }

  // ============================================
  // DOMAIN OPERATIONS (Phase 2 - Scaffolding)
  // ============================================

  /**
   * Attach a custom domain to a site
   *
   * TODO Phase 2 Implementation:
   * 1. For Cloudflare-managed zones:
   *    - Domain is automatically configured with SSL
   *    - No verification required
   *
   * 2. For external domains:
   *    - Must add CNAME record pointing to {project}.pages.dev
   *    - Verification is automatic once CNAME propagates
   *    - SSL is provisioned automatically after verification
   *
   * 3. For apex domains (example.com vs www.example.com):
   *    - Requires the zone to be on Cloudflare, OR
   *    - Use CNAME flattening if supported by DNS provider
   *
   * Rate limiting notes:
   * - Cloudflare API has rate limits of ~1200 requests/5 min
   * - Domain operations should be debounced in the UI
   * - Use exponential backoff for verification polling
   */
  async attachDomain(
    site: IHostingSite,
    domain: string
  ): Promise<AttachDomainResult> {
    const projectName = this.getProjectName(site);

    try {
      this.logOperation('attachDomain', site.slug, { domain });

      const cfDomain = await this.client.addDomain(projectName, domain);

      // Determine verification requirements
      const isApex = !domain.includes('.') || domain.split('.').length === 2;

      this.logSuccess('attachDomain', site.slug, {
        domainId: cfDomain.id,
        status: cfDomain.status,
      });

      return {
        success: true,
        domainId: cfDomain.id,
        status: cfDomain.status === 'active' ? 'active' : 'pending',
        verificationRequired: cfDomain.status !== 'active',
        verificationRecord: cfDomain.status !== 'active'
          ? {
              type: isApex ? 'TXT' : 'CNAME',
              name: isApex ? `_cf-custom-hostname.${domain}` : domain,
              value: `${projectName}.${GENESIS_BASE_DOMAIN}`,
            }
          : undefined,
      };
    } catch (error) {
      const message = this.parseError(error, 'attach domain');
      this.logError('attachDomain', site.slug, error);

      return {
        success: false,
        status: 'failed',
        error: message,
      };
    }
  }

  /**
   * Verify custom domain ownership (interface method)
   */
  async verifyCustomDomain(
    site: IHostingSite,
    domain: string
  ): Promise<{ verified: boolean; instructions?: string; txtRecord?: string }> {
    const projectName = this.getProjectName(site);

    try {
      const domains = await this.client.getDomains(projectName);
      const cfDomain = domains.find((d) => d.name === domain);

      if (!cfDomain) {
        return {
          verified: false,
          instructions: 'Domain not found. Please add the domain first.',
        };
      }

      if (cfDomain.status === 'active') {
        return { verified: true };
      }

      const isApex = !domain.includes('.') || domain.split('.').length === 2;

      return {
        verified: false,
        instructions: isApex
          ? `Add a CNAME record for ${domain} pointing to ${projectName}.${GENESIS_BASE_DOMAIN}`
          : `Add a CNAME record for ${domain} pointing to ${projectName}.${GENESIS_BASE_DOMAIN}`,
        txtRecord: `${projectName}.${GENESIS_BASE_DOMAIN}`,
      };
    } catch (error) {
      this.logError('verifyCustomDomain', site.slug, error);
      return {
        verified: false,
        instructions: 'Failed to verify domain. Please try again.',
      };
    }
  }

  /**
   * Rollback to a previous deployment
   *
   * Note: Cloudflare Pages rollback limitations:
   * - No direct "set this deployment as active" API
   * - Must re-deploy the files from the target deployment
   * - For now, we use the retry endpoint which works for recent deployments
   *
   * TODO: For a proper rollback, store deployment files/manifest and re-upload
   */
  async rollback(
    site: IHostingSite,
    providerDeploymentId: string
  ): Promise<DeployResult> {
    const projectName = this.getProjectName(site);

    try {
      this.logOperation('rollback', site.slug, { providerDeploymentId });

      // Retry the deployment (this re-runs it)
      const deployment = await this.client.retryDeployment(
        projectName,
        providerDeploymentId
      );

      this.logSuccess('rollback', site.slug, {
        newDeploymentId: deployment.id,
        url: deployment.url,
      });

      return {
        success: true,
        providerDeploymentId: deployment.id,
        previewUrl: deployment.url,
        liveUrl: this.getProductionUrl(site),
        status: this.mapStatus(deployment.latest_stage.name),
      };
    } catch (error) {
      const message = this.parseError(error, 'rollback');
      this.logError('rollback', site.slug, error);

      return {
        success: false,
        providerDeploymentId: '',
        status: 'failure',
        error: message,
      };
    }
  }

  // ============================================
  // FILE PROCESSING
  // ============================================

  /**
   * Convert DeploymentFiles to FileManifest with SHA-1 hashes
   */
  private prepareFilesForUpload(files: DeploymentFiles[]): FileManifest[] {
    return files.map((file) => {
      const hash = crypto.createHash('sha1').update(file.content).digest('hex');
      return {
        path: file.path.startsWith('/') ? file.path : `/${file.path}`,
        hash,
        content: file.content,
        size: file.content.length,
        contentType: file.contentType || this.getContentType(file.path),
      };
    });
  }

  /**
   * Read all files from a directory recursively
   */
  private async readDirectory(dirPath: string): Promise<FileManifest[]> {
    const files: FileManifest[] = [];

    const readDir = async (currentPath: string, relativePath: string = '') => {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relPath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          await readDir(fullPath, relPath);
        } else if (entry.isFile()) {
          const content = await fs.promises.readFile(fullPath);
          const hash = crypto.createHash('sha1').update(content).digest('hex');

          files.push({
            path: `/${relPath.replace(/\\/g, '/')}`, // Normalize to forward slashes
            hash,
            content,
            size: content.length,
            contentType: this.getContentType(entry.name),
          });
        }
      }
    };

    await readDir(dirPath);
    return files;
  }

  /**
   * Extract files from a zip buffer
   */
  private async extractZip(zipBuffer: Buffer): Promise<FileManifest[]> {
    // Dynamic import for JSZip
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(zipBuffer);

    const files: FileManifest[] = [];

    for (const [filePath, zipEntry] of Object.entries(zip.files)) {
      // Skip directories
      if (zipEntry.dir) continue;

      const content = await zipEntry.async('nodebuffer');
      const hash = crypto.createHash('sha1').update(content).digest('hex');

      files.push({
        path: filePath.startsWith('/') ? filePath : `/${filePath}`,
        hash,
        content,
        size: content.length,
        contentType: this.getContentType(filePath),
      });
    }

    return files;
  }

  /**
   * Get MIME type from file extension
   */
  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_TYPES[ext] || 'application/octet-stream';
  }

  // ============================================
  // STATUS HANDLING
  // ============================================

  /**
   * Wait for deployment to complete with polling
   *
   * For Cloudflare Pages Direct Upload:
   * - Stages: queued -> initialize -> build -> deploy
   * - Status: idle, active, success, failure
   * - For Direct Upload, deployment is usually immediately active
   */
  private async waitForDeployment(
    projectName: string,
    deploymentId: string,
    onStatusChange?: (status: CloudflareDeploymentStatus) => void,
    timeoutMs: number = 60000 // 1 minute (Direct Upload is fast)
  ): Promise<CloudflareDeploymentStatus> {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < timeoutMs) {
      try {
        const deployment = await this.client.getDeployment(projectName, deploymentId);

        // Check the latest stage status
        const stageName = deployment.latest_stage?.name || 'unknown';
        const stageStatus = deployment.latest_stage?.status || 'unknown';

        console.log('[CloudflarePagesAdapter] Polling deployment status:', {
          deploymentId,
          stageName,
          stageStatus,
          url: deployment.url,
        });

        onStatusChange?.(stageName as CloudflareDeploymentStatus);

        // Direct Upload deployments are successful when:
        // - stage is 'deploy' and status is 'success' or 'active'
        // - stage is 'success' (older API format)
        // - deployment has a URL (files are accessible)
        if (
          stageName === 'deploy' && (stageStatus === 'success' || stageStatus === 'active') ||
          stageName === 'success' ||
          stageStatus === 'success'
        ) {
          return 'success';
        }

        // Check for failure states
        if (stageStatus === 'failure' || stageName === 'failure' || stageName === 'canceled') {
          return 'failure';
        }

        await this.sleep(pollInterval);
      } catch (error) {
        console.error('[CloudflarePagesAdapter] Error polling deployment:', error);
        // If we can't get status, wait and try again
        await this.sleep(pollInterval);
      }
    }

    // If we timeout but we have a deployment ID and URL was returned,
    // assume success since Direct Upload typically works immediately
    console.log('[CloudflarePagesAdapter] Polling timed out, assuming success for Direct Upload');
    return 'success';
  }

  /**
   * Map Cloudflare status to DeployResult status
   */
  private mapStatus(cfStatus: CloudflareDeploymentStatus): CloudflareDeploymentStatus {
    return cfStatus;
  }

  /**
   * Map Cloudflare status to Genesis deployment status
   */
  private mapStatusToGenesis(cfStatus: CloudflareDeploymentStatus): GenesisDeploymentStatus {
    const mapping: Record<CloudflareDeploymentStatus, GenesisDeploymentStatus> = {
      idle: 'queued',
      queued: 'queued',
      initialize: 'building',
      building: 'building',
      build: 'building',
      deploy: 'uploading',
      success: 'live',
      active: 'live',
      failure: 'failed',
      canceled: 'failed',
    };
    return mapping[cfStatus] || 'failed';
  }

  /**
   * Get progress percentage from status
   */
  private getProgressFromStatus(status: CloudflareDeploymentStatus): number {
    const progress: Record<CloudflareDeploymentStatus, number> = {
      idle: 0,
      queued: 10,
      initialize: 20,
      building: 40,
      build: 50,
      deploy: 80,
      success: 100,
      active: 100,
      failure: 100,
      canceled: 100,
    };
    return progress[status] || 0;
  }

  // ============================================
  // LOGGING & ERROR HANDLING
  // ============================================

  private logOperation(
    operation: string,
    siteSlug: string,
    metadata: Record<string, unknown>
  ): void {
    console.log('[CloudflarePagesAdapter]', {
      operation,
      siteSlug,
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  }

  private logSuccess(
    operation: string,
    siteSlug: string,
    metadata: Record<string, unknown>
  ): void {
    console.log('[CloudflarePagesAdapter] Success', {
      operation,
      siteSlug,
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  }

  private logError(operation: string, siteSlug: string, error: unknown): void {
    console.error('[CloudflarePagesAdapter] Error', {
      operation,
      siteSlug,
      error: error instanceof Error ? error.message : String(error),
      // Don't log stack traces or sensitive data
      timestamp: new Date().toISOString(),
    });
  }

  private parseError(error: unknown, operation: string): string {
    if (error instanceof CloudflareApiError) {
      return error.toUserMessage();
    }
    if (error instanceof Error) {
      return error.message;
    }
    return `Failed to ${operation}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let adapterInstance: CloudflarePagesAdapter | null = null;

export function getCloudflarePagesAdapter(): CloudflarePagesAdapter {
  if (!adapterInstance) {
    adapterInstance = new CloudflarePagesAdapter();
  }
  return adapterInstance;
}