/**
 * Cloudflare Pages Adapter Types
 */

// ============================================
// INPUT TYPES
// ============================================

export interface DeployInput {
  /**
   * Either provide a local directory path OR a zip buffer - not both
   */
  directoryPath?: string;
  zipBuffer?: Buffer;

  /**
   * Optional commit message for the deployment
   */
  commitMessage?: string;

  /**
   * Branch name (defaults to 'main')
   */
  branch?: string;
}

export interface CreateSiteOptions {
  /**
   * Custom production branch (defaults to 'main')
   */
  productionBranch?: string;
}

// ============================================
// RESULT TYPES
// ============================================

export interface DeployResult {
  success: boolean;
  providerDeploymentId: string;
  previewUrl?: string;
  liveUrl?: string;
  status: CloudflareDeploymentStatus;
  error?: string;
}

export interface CreateSiteResult {
  success: boolean;
  providerProjectId: string;
  liveUrl: string;
  error?: string;
}

export interface DeploymentStatusResult {
  status: GenesisDeploymentStatus;
  providerStatus: CloudflareDeploymentStatus;
  previewUrl?: string;
  liveUrl?: string;
  error?: string;
  buildLogs?: string;
}

export interface AttachDomainResult {
  success: boolean;
  domainId?: string;
  status: 'pending' | 'active' | 'failed';
  verificationRequired?: boolean;
  verificationRecord?: {
    type: 'CNAME' | 'TXT';
    name: string;
    value: string;
  };
  error?: string;
}

// ============================================
// STATUS ENUMS
// ============================================

/**
 * Cloudflare Pages deployment stages
 * Note: These are stage names from the Cloudflare API
 * - idle, queued: waiting stages
 * - initialize, build, deploy: active stages
 * - success, failure, canceled: terminal stages
 */
export type CloudflareDeploymentStatus =
  | 'idle'
  | 'queued'
  | 'initialize'
  | 'building'
  | 'build'
  | 'deploy'
  | 'success'
  | 'failure'
  | 'canceled'
  | 'active';

/**
 * Genesis internal deployment status (matches Deployment model)
 */
export type GenesisDeploymentStatus =
  | 'queued'
  | 'building'
  | 'uploading'
  | 'propagating'
  | 'live'
  | 'failed'
  | 'superseded';

// ============================================
// CLOUDFLARE API RESPONSE TYPES
// ============================================

export interface CloudflareProject {
  id: string;
  name: string;
  subdomain: string;
  domains: string[];
  created_on: string;
  production_branch: string;
  deployment_configs: {
    production: CloudflareDeploymentConfig;
    preview: CloudflareDeploymentConfig;
  };
}

export interface CloudflareDeploymentConfig {
  compatibility_date?: string;
  compatibility_flags?: string[];
  env_vars?: Record<string, { value: string }>;
}

export interface CloudflareDeployment {
  id: string;
  short_id: string;
  project_id: string;
  project_name: string;
  environment: 'production' | 'preview';
  url: string;
  created_on: string;
  modified_on: string;
  latest_stage: {
    name: CloudflareDeploymentStatus;
    status: 'idle' | 'active' | 'success' | 'failure' | 'canceled';
    started_on: string | null;
    ended_on: string | null;
  };
  deployment_trigger: {
    type: 'ad_hoc' | 'ci' | 'hooks';
    metadata: {
      branch: string;
      commit_hash?: string;
      commit_message?: string;
    };
  };
  stages: Array<{
    name: string;
    status: string;
    started_on: string | null;
    ended_on: string | null;
  }>;
  build_config?: {
    build_command?: string;
    destination_dir?: string;
    root_dir?: string;
  };
  aliases?: string[];
  is_skipped: boolean;
  production_branch?: string;
}

export interface CloudflareUploadToken {
  jwt: string;
}

export interface CloudflareFileHash {
  path: string;
  hash: string;
  size: number;
}

export interface CloudflareApiResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: Array<{ code: number; message: string }>;
  result: T;
}

export interface CloudflareDomain {
  id: string;
  name: string;
  status: 'active' | 'pending' | 'deactivated';
  zone_tag?: string;
  created_on: string;
  modified_on: string;
  verification_data?: {
    status: string;
    method: string;
  };
}

// ============================================
// INTERNAL TYPES
// ============================================

export interface FileManifest {
  path: string;
  hash: string;
  content: Buffer;
  size: number;
  contentType: string;
}

export interface UploadProgress {
  totalFiles: number;
  uploadedFiles: number;
  totalBytes: number;
  uploadedBytes: number;
}