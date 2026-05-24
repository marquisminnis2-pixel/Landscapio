/**
 * Cloudflare API Client
 *
 * A lightweight wrapper around Cloudflare's REST API with:
 * - Automatic authentication header injection
 * - Error parsing and human-friendly messages
 * - Request/response logging (no secrets)
 * - Retry logic for transient failures
 *
 * Required API Token Scopes (least privilege):
 * - Account > Cloudflare Pages > Edit
 * - Zone > DNS > Edit (for custom domains - Phase 2)
 *
 * Generate token at: https://dash.cloudflare.com/profile/api-tokens
 */

import {
  CloudflareApiResponse,
  CloudflareProject,
  CloudflareDeployment,
  CloudflareDomain,
} from './types';

// ============================================
// CONFIGURATION
// ============================================

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';

interface CloudflareClientConfig {
  apiToken: string;
  accountId: string;
  /** Optional request timeout in ms (default: 30000) */
  timeout?: number;
  /** Optional max retries for transient errors (default: 3) */
  maxRetries?: number;
}

// ============================================
// ERROR TYPES
// ============================================

export class CloudflareApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly errors: Array<{ code: number; message: string }>,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'CloudflareApiError';
  }

  /**
   * Returns a user-friendly error message
   */
  toUserMessage(): string {
    const errorMessages: Record<number, string> = {
      8000000: 'Authentication failed. Please check your API token.',
      8000002: 'The project name is already taken.',
      8000007: 'Project not found.',
      8000013: 'Rate limit exceeded. Please try again later.',
      8000014: 'Invalid file upload.',
      8000015: 'Deployment failed during build.',
      8000016: 'Maximum projects limit reached.',
    };

    // Check for known error codes
    for (const error of this.errors) {
      if (errorMessages[error.code]) {
        return errorMessages[error.code];
      }
    }

    // Default to first error message or generic message
    return this.errors[0]?.message || this.message;
  }
}

// ============================================
// CLIENT IMPLEMENTATION
// ============================================

export class CloudflareClient {
  private readonly apiToken: string;
  private readonly accountId: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(config: CloudflareClientConfig) {
    this.apiToken = config.apiToken;
    this.accountId = config.accountId;
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
  }

  // ============================================
  // PROJECT OPERATIONS
  // ============================================

  /**
   * Create a new Cloudflare Pages project
   *
   * POST /accounts/{account_id}/pages/projects
   *
   * Request body:
   * {
   *   "name": "my-project",
   *   "production_branch": "main"
   * }
   *
   * Response:
   * {
   *   "success": true,
   *   "result": {
   *     "id": "xxx",
   *     "name": "my-project",
   *     "subdomain": "my-project.pages.dev",
   *     ...
   *   }
   * }
   */
  async createProject(
    name: string,
    productionBranch: string = 'main'
  ): Promise<CloudflareProject> {
    const response = await this.request<CloudflareProject>(
      'POST',
      `/accounts/${this.accountId}/pages/projects`,
      {
        name,
        production_branch: productionBranch,
      }
    );
    return response.result;
  }

  /**
   * Get a Cloudflare Pages project by name
   *
   * GET /accounts/{account_id}/pages/projects/{project_name}
   */
  async getProject(projectName: string): Promise<CloudflareProject | null> {
    try {
      const response = await this.request<CloudflareProject>(
        'GET',
        `/accounts/${this.accountId}/pages/projects/${projectName}`
      );
      return response.result;
    } catch (error) {
      if (error instanceof CloudflareApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete a Cloudflare Pages project
   *
   * DELETE /accounts/{account_id}/pages/projects/{project_name}
   */
  async deleteProject(projectName: string): Promise<void> {
    await this.request<null>(
      'DELETE',
      `/accounts/${this.accountId}/pages/projects/${projectName}`
    );
  }

  // ============================================
  // DEPLOYMENT OPERATIONS (Direct Upload)
  // ============================================

  /**
   * Create a new deployment using Direct Upload
   *
   * POST /accounts/{account_id}/pages/projects/{project_name}/deployments
   *
   * This uses multipart/form-data with the manifest
   *
   * Request (multipart):
   * - manifest: JSON file with { "/{path}": "{hash}", ... }
   * - files: individual files with their hash as the key
   *
   * Response:
   * {
   *   "success": true,
   *   "result": {
   *     "id": "xxx",
   *     "url": "https://xxx.project.pages.dev",
   *     ...
   *   }
   * }
   */
  async createDeployment(
    projectName: string,
    files: Array<{ path: string; hash: string; content: Buffer }>,
    options?: {
      branch?: string;
      commitMessage?: string;
    }
  ): Promise<CloudflareDeployment> {
    const FormData = (await import('form-data')).default;
    const https = await import('https');
    const formData = new FormData();

    // Build manifest: { "/{path}": "{hash}" }
    const manifest: Record<string, string> = {};
    for (const file of files) {
      // Ensure path starts with /
      const normalizedPath = file.path.startsWith('/') ? file.path : `/${file.path}`;
      manifest[normalizedPath] = file.hash;
    }

    console.log('[CloudflareClient] Deployment manifest:', JSON.stringify(manifest, null, 2));
    console.log('[CloudflareClient] Files to upload:', files.map(f => ({ path: f.path, hash: f.hash, size: f.content.length })));

    // Add manifest as JSON - Cloudflare expects it as a plain string field
    formData.append('manifest', JSON.stringify(manifest));

    // Add each file with hash as the form field key
    for (const file of files) {
      const filename = file.path.split('/').pop() || 'file';
      formData.append(file.hash, file.content, {
        filename,
        contentType: 'application/octet-stream',
      });
    }

    // Add optional metadata
    if (options?.branch) {
      formData.append('branch', options.branch);
    }
    if (options?.commitMessage) {
      formData.append('commit_message', options.commitMessage);
    }

    const urlPath = `/client/v4/accounts/${this.accountId}/pages/projects/${projectName}/deployments`;

    console.log('[CloudflareClient] Request path:', urlPath);

    // Use https module with form-data's submit-like approach for reliable multipart upload
    const data = await new Promise<CloudflareApiResponse<CloudflareDeployment>>((resolve, reject) => {
      const req = https.request(
        {
          method: 'POST',
          host: 'api.cloudflare.com',
          path: urlPath,
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            ...formData.getHeaders(),
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf-8');
            try {
              const json = JSON.parse(body);
              resolve(json);
            } catch (err) {
              reject(new Error(`Failed to parse response: ${body}`));
            }
          });
          res.on('error', reject);
        }
      );

      req.on('error', reject);

      // Pipe form data to the request
      formData.pipe(req);
    });

    if (!data.success) {
      console.error('[CloudflareClient] Deployment failed:', JSON.stringify(data, null, 2));
      this.logError('createDeployment', projectName, data.errors);
      throw new CloudflareApiError(
        `Failed to create deployment for ${projectName}`,
        data.errors[0]?.code || 0,
        data.errors,
        400
      );
    }

    this.logSuccess('createDeployment', projectName, {
      deploymentId: data.result.id,
      url: data.result.url,
    });

    return data.result;
  }

  /**
   * Get deployment status
   *
   * GET /accounts/{account_id}/pages/projects/{project_name}/deployments/{deployment_id}
   */
  async getDeployment(
    projectName: string,
    deploymentId: string
  ): Promise<CloudflareDeployment> {
    const response = await this.request<CloudflareDeployment>(
      'GET',
      `/accounts/${this.accountId}/pages/projects/${projectName}/deployments/${deploymentId}`
    );
    return response.result;
  }

  /**
   * List deployments for a project
   *
   * GET /accounts/{account_id}/pages/projects/{project_name}/deployments
   */
  async listDeployments(
    projectName: string,
    options?: { page?: number; perPage?: number }
  ): Promise<CloudflareDeployment[]> {
    const params = new URLSearchParams();
    if (options?.page) params.set('page', String(options.page));
    if (options?.perPage) params.set('per_page', String(options.perPage));

    const query = params.toString();
    const path = `/accounts/${this.accountId}/pages/projects/${projectName}/deployments${query ? `?${query}` : ''}`;

    const response = await this.request<CloudflareDeployment[]>('GET', path);
    return response.result;
  }

  /**
   * Retry/rollback to a specific deployment
   *
   * POST /accounts/{account_id}/pages/projects/{project_name}/deployments/{deployment_id}/retry
   *
   * Note: Cloudflare doesn't have a direct "rollback" API.
   * The recommended approach is to:
   * 1. Get the files from the previous deployment
   * 2. Create a new deployment with those files
   *
   * For now, we'll use the retry endpoint which re-runs the deployment
   */
  async retryDeployment(
    projectName: string,
    deploymentId: string
  ): Promise<CloudflareDeployment> {
    const response = await this.request<CloudflareDeployment>(
      'POST',
      `/accounts/${this.accountId}/pages/projects/${projectName}/deployments/${deploymentId}/retry`
    );
    return response.result;
  }

  /**
   * Cancel a deployment
   *
   * DELETE /accounts/{account_id}/pages/projects/{project_name}/deployments/{deployment_id}
   */
  async cancelDeployment(
    projectName: string,
    deploymentId: string
  ): Promise<void> {
    await this.request<null>(
      'DELETE',
      `/accounts/${this.accountId}/pages/projects/${projectName}/deployments/${deploymentId}`
    );
  }

  // ============================================
  // DOMAIN OPERATIONS (Phase 2 - Scaffolding)
  // ============================================

  /**
   * Add a custom domain to a project
   *
   * POST /accounts/{account_id}/pages/projects/{project_name}/domains
   *
   * Request body:
   * {
   *   "name": "example.com"
   * }
   *
   * Note: The domain must be:
   * 1. Added to your Cloudflare account as a zone, OR
   * 2. Use CNAME verification for external domains
   *
   * TODO Phase 2:
   * - Implement DNS verification flow for external domains
   * - Handle zone creation for domains managed by Cloudflare
   * - SSL certificate provisioning is automatic for CF-managed domains
   */
  async addDomain(
    projectName: string,
    domainName: string
  ): Promise<CloudflareDomain> {
    const response = await this.request<CloudflareDomain>(
      'POST',
      `/accounts/${this.accountId}/pages/projects/${projectName}/domains`,
      { name: domainName }
    );
    return response.result;
  }

  /**
   * Get domains for a project
   *
   * GET /accounts/{account_id}/pages/projects/{project_name}/domains
   */
  async getDomains(projectName: string): Promise<CloudflareDomain[]> {
    const response = await this.request<CloudflareDomain[]>(
      'GET',
      `/accounts/${this.accountId}/pages/projects/${projectName}/domains`
    );
    return response.result;
  }

  /**
   * Delete a custom domain
   *
   * DELETE /accounts/{account_id}/pages/projects/{project_name}/domains/{domain_name}
   */
  async deleteDomain(projectName: string, domainName: string): Promise<void> {
    await this.request<null>(
      'DELETE',
      `/accounts/${this.accountId}/pages/projects/${projectName}/domains/${domainName}`
    );
  }

  // ============================================
  // INTERNAL METHODS
  // ============================================

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    path: string,
    body?: unknown,
    retryCount: number = 0
  ): Promise<CloudflareApiResponse<T>> {
    const url = `${CLOUDFLARE_API_BASE}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = (await response.json()) as CloudflareApiResponse<T>;

      if (!data.success) {
        // Check for retryable errors
        const isRetryable = response.status === 429 || response.status >= 500;
        if (isRetryable && retryCount < this.maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
          await this.sleep(delay);
          return this.request<T>(method, path, body, retryCount + 1);
        }

        this.logError(method, path, data.errors);
        throw new CloudflareApiError(
          `Cloudflare API error: ${data.errors[0]?.message || 'Unknown error'}`,
          data.errors[0]?.code || 0,
          data.errors,
          response.status
        );
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof CloudflareApiError) {
        throw error;
      }

      // Handle timeout/network errors
      if (error instanceof Error && error.name === 'AbortError') {
        throw new CloudflareApiError(
          'Request timed out',
          0,
          [{ code: 0, message: 'Request timed out' }],
          0
        );
      }

      throw error;
    }
  }

  private logError(
    operation: string,
    identifier: string,
    errors: Array<{ code: number; message: string }>
  ): void {
    console.error('[CloudflareClient] API Error', {
      operation,
      identifier,
      errors: errors.map((e) => ({ code: e.code, message: e.message })),
      timestamp: new Date().toISOString(),
    });
  }

  private logSuccess(
    operation: string,
    identifier: string,
    metadata: Record<string, unknown>
  ): void {
    console.log('[CloudflareClient] Success', {
      operation,
      identifier,
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

let clientInstance: CloudflareClient | null = null;

/**
 * Get or create a Cloudflare client instance
 *
 * Uses environment variables:
 * - CLOUDFLARE_API_TOKEN (required)
 * - CLOUDFLARE_ACCOUNT_ID (required)
 */
export function getCloudflareClient(): CloudflareClient {
  if (!clientInstance) {
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    if (!apiToken || !accountId) {
      throw new Error(
        'Cloudflare credentials not configured. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID environment variables.'
      );
    }

    clientInstance = new CloudflareClient({
      apiToken,
      accountId,
    });
  }

  return clientInstance;
}

/**
 * Check if Cloudflare adapter is configured
 */
export function isCloudflareConfigured(): boolean {
  return !!(
    process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID
  );
}