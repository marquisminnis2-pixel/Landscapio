import { IDeployment, DeploymentStatus, IDeploymentAsset } from '../models/Deployment';
import { IHostingSite } from '../models/HostingSite';

/**
 * Result of a deployment operation
 */
export interface DeploymentResult {
  success: boolean;
  status: DeploymentStatus;
  error?: string;
  previewUrl?: string;
  productionUrl?: string;
  providerDeploymentId?: string;
  assets?: IDeploymentAsset[];
  totalSize?: number;
}

/**
 * Progress callback for deployment operations
 */
export interface DeploymentProgress {
  stage: 'building' | 'uploading' | 'propagating';
  progress: number; // 0-100
  message?: string;
}

/**
 * Files to deploy
 */
export interface DeploymentFiles {
  path: string;      // e.g., "/index.html"
  content: Buffer;   // File content
  contentType: string;
}

/**
 * Abstract hosting adapter interface.
 * Implement this for each hosting provider (local, Cloudflare, Vercel, etc.)
 */
export interface IHostingAdapter {
  /**
   * Provider identifier
   */
  readonly provider: string;

  /**
   * Deploy files to the hosting provider
   */
  deploy(
    site: IHostingSite,
    deployment: IDeployment,
    files: DeploymentFiles[],
    onProgress?: (progress: DeploymentProgress) => void
  ): Promise<DeploymentResult>;

  /**
   * Get the preview URL for a deployment
   */
  getPreviewUrl(site: IHostingSite, deployment: IDeployment): string;

  /**
   * Get the production URL for a site
   */
  getProductionUrl(site: IHostingSite): string;

  /**
   * Delete all files for a site (when site is deleted)
   */
  deleteSite(site: IHostingSite): Promise<void>;

  /**
   * Delete files for a specific deployment
   */
  deleteDeployment(site: IHostingSite, deployment: IDeployment): Promise<void>;

  /**
   * Check if the adapter is properly configured
   */
  isConfigured(): boolean;

  /**
   * Activate a deployment (make it the live version)
   */
  activateDeployment(site: IHostingSite, deployment: IDeployment): Promise<DeploymentResult>;

  /**
   * Verify custom domain ownership (for DNS verification)
   */
  verifyCustomDomain?(site: IHostingSite, domain: string): Promise<{
    verified: boolean;
    instructions?: string;
    txtRecord?: string;
  }>;

  /**
   * Attach a custom domain to the site on the hosting provider
   */
  attachDomain?(site: IHostingSite, domain: string): Promise<{
    success: boolean;
    domainId?: string;
    status?: string;
    error?: string;
  }>;
}

/**
 * Base class with common functionality
 */
export abstract class BaseHostingAdapter implements IHostingAdapter {
  abstract readonly provider: string;

  abstract deploy(
    site: IHostingSite,
    deployment: IDeployment,
    files: DeploymentFiles[],
    onProgress?: (progress: DeploymentProgress) => void
  ): Promise<DeploymentResult>;

  abstract getPreviewUrl(site: IHostingSite, deployment: IDeployment): string;
  abstract getProductionUrl(site: IHostingSite): string;
  abstract deleteSite(site: IHostingSite): Promise<void>;
  abstract deleteDeployment(site: IHostingSite, deployment: IDeployment): Promise<void>;
  abstract isConfigured(): boolean;
  abstract activateDeployment(site: IHostingSite, deployment: IDeployment): Promise<DeploymentResult>;

  /**
   * Calculate total size of files
   */
  protected calculateTotalSize(files: DeploymentFiles[]): number {
    return files.reduce((total, file) => total + file.content.length, 0);
  }

  /**
   * Generate content hash for cache invalidation
   */
  protected generateHash(content: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
  }
}