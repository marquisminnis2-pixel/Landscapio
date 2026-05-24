import fs from 'fs';
import path from 'path';
import {
  BaseHostingAdapter,
  DeploymentResult,
  DeploymentProgress,
  DeploymentFiles,
} from './HostingAdapter';
import { IDeployment, IDeploymentAsset } from '../models/Deployment';
import { IHostingSite } from '../models/HostingSite';

/**
 * Local file system hosting adapter.
 * Stores deployed sites in a local directory and serves them via Express.
 * Ideal for development and self-hosted scenarios.
 */
export class LocalAdapter extends BaseHostingAdapter {
  readonly provider = 'local';
  private baseDir: string;
  private baseUrl: string;

  constructor() {
    super();
    // Store sites in a dedicated directory
    this.baseDir = process.env.LOCAL_HOSTING_DIR || path.join(__dirname, '../../hosted-sites');
    this.baseUrl = process.env.LOCAL_HOSTING_URL || 'http://localhost:5000/sites';

    // Ensure base directory exists
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  isConfigured(): boolean {
    // Local adapter is always configured
    return true;
  }

  getPreviewUrl(site: IHostingSite, deployment: IDeployment): string {
    return `${this.baseUrl}/${site.slug}/v${deployment.version}`;
  }

  getProductionUrl(site: IHostingSite): string {
    return `${this.baseUrl}/${site.slug}`;
  }

  async deploy(
    site: IHostingSite,
    deployment: IDeployment,
    files: DeploymentFiles[],
    onProgress?: (progress: DeploymentProgress) => void
  ): Promise<DeploymentResult> {
    try {
      // Stage 1: Building (preparing directories)
      onProgress?.({ stage: 'building', progress: 0, message: 'Preparing deployment...' });

      const siteDir = path.join(this.baseDir, site.slug);
      const versionDir = path.join(siteDir, `v${deployment.version}`);

      // Create version directory
      if (!fs.existsSync(versionDir)) {
        fs.mkdirSync(versionDir, { recursive: true });
      }

      onProgress?.({ stage: 'building', progress: 50, message: 'Directory structure ready' });

      // Stage 2: Uploading (writing files)
      onProgress?.({ stage: 'uploading', progress: 0, message: 'Writing files...' });

      const assets: IDeploymentAsset[] = [];
      let totalSize = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = path.join(versionDir, file.path);

        // Ensure parent directory exists
        const fileDir = path.dirname(filePath);
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }

        // Write file
        fs.writeFileSync(filePath, file.content);
        totalSize += file.content.length;

        // Track asset
        assets.push({
          path: file.path,
          url: `${this.baseUrl}/${site.slug}/v${deployment.version}${file.path}`,
          size: file.content.length,
          contentType: file.contentType,
          hash: this.generateHash(file.content),
        });

        // Report progress
        const progress = Math.round(((i + 1) / files.length) * 100);
        onProgress?.({
          stage: 'uploading',
          progress,
          message: `Uploaded ${i + 1}/${files.length} files`,
        });
      }

      // Stage 3: Propagating (creating symlink for production)
      onProgress?.({ stage: 'propagating', progress: 0, message: 'Activating deployment...' });

      // Update the "current" symlink to point to this version
      const currentLink = path.join(siteDir, 'current');
      if (fs.existsSync(currentLink)) {
        fs.unlinkSync(currentLink);
      }
      fs.symlinkSync(versionDir, currentLink);

      onProgress?.({ stage: 'propagating', progress: 100, message: 'Deployment live!' });

      return {
        success: true,
        status: 'live',
        previewUrl: this.getPreviewUrl(site, deployment),
        productionUrl: this.getProductionUrl(site),
        providerDeploymentId: `local-${site.slug}-v${deployment.version}`,
        assets,
        totalSize,
      };
    } catch (error: any) {
      console.error('LocalAdapter deploy error:', error);
      return {
        success: false,
        status: 'failed',
        error: error.message || 'Deployment failed',
      };
    }
  }

  async activateDeployment(site: IHostingSite, deployment: IDeployment): Promise<DeploymentResult> {
    try {
      const siteDir = path.join(this.baseDir, site.slug);
      const versionDir = path.join(siteDir, `v${deployment.version}`);
      const currentLink = path.join(siteDir, 'current');

      // Verify version exists
      if (!fs.existsSync(versionDir)) {
        return {
          success: false,
          status: 'failed',
          error: `Version ${deployment.version} not found`,
        };
      }

      // Update symlink
      if (fs.existsSync(currentLink)) {
        fs.unlinkSync(currentLink);
      }
      fs.symlinkSync(versionDir, currentLink);

      return {
        success: true,
        status: 'live',
        productionUrl: this.getProductionUrl(site),
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        error: error.message,
      };
    }
  }

  async deleteSite(site: IHostingSite): Promise<void> {
    const siteDir = path.join(this.baseDir, site.slug);
    if (fs.existsSync(siteDir)) {
      fs.rmSync(siteDir, { recursive: true, force: true });
    }
  }

  async deleteDeployment(site: IHostingSite, deployment: IDeployment): Promise<void> {
    const versionDir = path.join(this.baseDir, site.slug, `v${deployment.version}`);
    if (fs.existsSync(versionDir)) {
      fs.rmSync(versionDir, { recursive: true, force: true });
    }
  }
}

/**
 * Singleton instance
 */
let localAdapterInstance: LocalAdapter | null = null;

export function getLocalAdapter(): LocalAdapter {
  if (!localAdapterInstance) {
    localAdapterInstance = new LocalAdapter();
  }
  return localAdapterInstance;
}