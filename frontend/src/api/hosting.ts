/**
 * Hosting API client for sites, deployments, domains, and entitlements.
 */
import { API_BASE } from '@/lib/api';

// ============================================
// TYPES
// ============================================

export type SiteStatus = 'draft' | 'deploying' | 'live' | 'paused' | 'error';

export type DeploymentStatus =
  | 'queued'
  | 'building'
  | 'uploading'
  | 'propagating'
  | 'live'
  | 'failed'
  | 'superseded';

export type HostingProvider = 'local' | 'cloudflare' | 's3';

export type TriggerSource = 'manual' | 'auto' | 'api' | 'rollback';

export type DomainStatus = 'pending' | 'verifying' | 'active' | 'failed' | 'expired';

export type VerificationMethod = 'dns_txt' | 'dns_cname' | 'file';

export type PlanTier = 'free';

export interface SiteSettings {
  favicon?: string;
  socialImage?: string;
  metaTitle?: string;
  metaDescription?: string;
  customHead?: string;
  custom404?: string;
  redirects?: Array<{
    from: string;
    to: string;
    permanent: boolean;
  }>;
}

export interface SiteAnalytics {
  totalVisits: number;
  lastVisitAt?: string;
}

export interface Site {
  _id: string;
  orgId: string;
  projectId: string;
  name: string;
  slug: string; // subdomain: {slug}.genesis.site
  status: SiteStatus;
  activeDeploymentId?: string;
  activeDeployment?: Deployment;
  lastDeployedAt?: string;
  errorMessage?: string;
  settings: SiteSettings;
  analytics: SiteAnalytics;
  domains?: Domain[]; // Populated when fetching single site
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentAsset {
  path: string;
  url: string;
  size: number;
  contentType: string;
  hash?: string;
}

export interface Deployment {
  _id: string;
  siteId: string;
  orgId: string;
  projectId: string;
  version: number;
  commitMessage?: string;
  status: DeploymentStatus;
  error?: string;
  provider: HostingProvider;
  providerDeploymentId?: string;
  previewUrl?: string;
  productionUrl?: string;
  assets: DeploymentAsset[];
  totalSize: number;
  createdAt: string;
  updatedAt: string;
  buildStartedAt?: string;
  buildCompletedAt?: string;
  uploadStartedAt?: string;
  uploadCompletedAt?: string;
  liveAt?: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  triggeredBy: TriggerSource;
}

export interface DeploymentList {
  deployments: Deployment[];
  total: number;
  limit: number;
  offset: number;
}

export interface Domain {
  _id: string;
  orgId: string;
  siteId: string;
  domain: string;
  isApex: boolean;
  status: DomainStatus;
  verificationMethod: VerificationMethod;
  verificationToken: string;
  verificationRecord?: string;
  verifiedAt?: string;
  lastVerificationAttempt?: string;
  verificationAttempts: number;
  sslStatus: 'pending' | 'provisioning' | 'active' | 'failed';
  sslExpiresAt?: string;
  sslProvider?: string;
  expectedCname?: string;
  detectedCname?: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanLimits {
  maxSites: number;
  deploymentsPerMonth: number;
  bandwidthGb: number;
  customDomains: number;
  teamMembers: number;
  analyticsRetentionDays: number;
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated';
}

export interface EntitlementUsage {
  sitesCreated: number;
  deploymentsThisMonth: number;
  bandwidthUsedMb: number;
  customDomainsUsed: number;
}

export interface Entitlement {
  _id: string;
  orgId: string;
  planTier: PlanTier;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  billingCycleStart?: string;
  billingCycleEnd?: string;
  usage: EntitlementUsage;
  overrides?: Partial<PlanLimits>;
  createdAt: string;
  updatedAt: string;
}

export interface EntitlementResponse {
  entitlement: Entitlement;
  limits: PlanLimits;
  usage: EntitlementUsage;
}

export interface DomainAddResponse {
  domain: Domain;
  verification: {
    method: string;
    record: string;
    instructions: string;
  };
}

// ============================================
// HELPERS
// ============================================

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
});

const getOrgId = () => localStorage.getItem('orgId');

const handleResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || 'API request failed') as Error & {
      upgradeRequired?: boolean;
    };
    if (data.upgradeRequired) {
      (error as any).upgradeRequired = true;
    }
    throw error;
  }
  return data;
};

// ============================================
// SITE API
// ============================================

/**
 * Get all sites for the organization.
 */
export async function getSites(): Promise<Site[]> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(`${API_BASE}/api/orgs/${orgId}/sites`, {
    headers: getAuthHeaders(),
  });

  return handleResponse<Site[]>(response);
}

/**
 * Get a single site by ID (includes domains).
 */
export async function getSite(siteId: string): Promise<Site> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(`${API_BASE}/api/orgs/${orgId}/sites/${siteId}`, {
    headers: getAuthHeaders(),
  });

  return handleResponse<Site>(response);
}

/**
 * Get site for a specific project (includes domains).
 */
export async function getSiteByProject(projectId: string): Promise<Site | null> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(`${API_BASE}/api/orgs/${orgId}/projects/${projectId}/site`, {
    headers: getAuthHeaders(),
  });

  if (response.status === 404) {
    return null;
  }

  return handleResponse<Site>(response);
}

/**
 * Create a new site for a project.
 */
export async function createSite(data: {
  projectId: string;
  name?: string;
  slug?: string;
}): Promise<Site> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(`${API_BASE}/api/orgs/${orgId}/sites`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse<Site>(response);
}

/**
 * Update a site.
 */
export async function updateSite(
  siteId: string,
  data: {
    name?: string;
    slug?: string;
    settings?: SiteSettings;
    status?: SiteStatus;
  }
): Promise<Site> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(`${API_BASE}/api/orgs/${orgId}/sites/${siteId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse<Site>(response);
}

/**
 * Delete a site.
 */
export async function deleteSite(siteId: string): Promise<void> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(`${API_BASE}/api/orgs/${orgId}/sites/${siteId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  await handleResponse<{ message: string }>(response);
}

/**
 * Check if a subdomain/slug is available.
 */
export async function checkSubdomain(subdomain: string): Promise<{
  available: boolean;
  subdomain: string;
  reason?: string;
}> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(
    `/api/orgs/${orgId}/hosting/check-subdomain/${encodeURIComponent(subdomain)}`,
    { headers: getAuthHeaders() }
  );

  return handleResponse(response);
}

// ============================================
// DEPLOYMENT API
// ============================================

/**
 * Get deployments for a site.
 */
export async function getDeployments(
  siteId: string,
  options?: { limit?: number; offset?: number }
): Promise<DeploymentList> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));

  const queryString = params.toString();
  const url = `${API_BASE}/api/orgs/${orgId}/sites/${siteId}/deployments${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, { headers: getAuthHeaders() });

  return handleResponse<DeploymentList>(response);
}

/**
 * Get a single deployment.
 */
export async function getDeployment(deploymentId: string): Promise<Deployment> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(`${API_BASE}/api/orgs/${orgId}/deployments/${deploymentId}`, {
    headers: getAuthHeaders(),
  });

  return handleResponse<Deployment>(response);
}

/**
 * Trigger a new deployment.
 */
export async function createDeployment(
  siteId: string,
  data?: {
    commitMessage?: string;
    triggeredBy?: TriggerSource;
  }
): Promise<Deployment> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(`${API_BASE}/api/orgs/${orgId}/sites/${siteId}/deploy`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data || {}),
  });

  return handleResponse<Deployment>(response);
}

/**
 * Rollback to a previous deployment.
 */
export async function rollbackDeployment(deploymentId: string): Promise<{
  message: string;
  site: Site;
  deployment: Deployment;
}> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(
    `/api/orgs/${orgId}/deployments/${deploymentId}/rollback`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(response);
}

// ============================================
// DOMAIN API
// ============================================

/**
 * Get all domains for a site.
 */
export async function getDomains(siteId: string): Promise<Domain[]> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(`${API_BASE}/api/orgs/${orgId}/sites/${siteId}/domains`, {
    headers: getAuthHeaders(),
  });

  return handleResponse<Domain[]>(response);
}

/**
 * Add a custom domain to a site.
 */
export async function addDomain(
  siteId: string,
  data: { domain: string; isPrimary?: boolean }
): Promise<DomainAddResponse> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(`${API_BASE}/api/orgs/${orgId}/sites/${siteId}/domains`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse<DomainAddResponse>(response);
}

/**
 * Trigger domain verification.
 */
export async function verifyDomain(domainId: string): Promise<{
  domain: Domain;
  message: string;
}> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(`${API_BASE}/api/orgs/${orgId}/domains/${domainId}/verify`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
}

/**
 * Remove a domain.
 */
export async function removeDomain(domainId: string): Promise<void> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(`${API_BASE}/api/orgs/${orgId}/domains/${domainId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  await handleResponse<{ message: string }>(response);
}

/**
 * Set a domain as the primary domain for its site.
 */
export async function setPrimaryDomain(domainId: string): Promise<Domain> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(`${API_BASE}/api/orgs/${orgId}/domains/${domainId}/set-primary`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  return handleResponse<Domain>(response);
}

// ============================================
// ENTITLEMENT API
// ============================================

/**
 * Get the organization's entitlement/plan info.
 */
export async function getEntitlement(): Promise<EntitlementResponse> {
  const orgId = getOrgId();
  if (!orgId) throw new Error('No organization selected');

  const response = await fetch(`${API_BASE}/api/orgs/${orgId}/hosting/entitlement`, {
    headers: getAuthHeaders(),
  });

  return handleResponse<EntitlementResponse>(response);
}

// ============================================
// POLLING HELPERS
// ============================================

/**
 * Poll a deployment until it reaches a terminal state.
 */
export async function pollDeployment(
  deploymentId: string,
  onUpdate: (deployment: Deployment) => void,
  options?: {
    interval?: number;
    timeout?: number;
  }
): Promise<Deployment> {
  const interval = options?.interval || 2000;
  const timeout = options?.timeout || 300000; // 5 minutes default
  const startTime = Date.now();

  const terminalStates: DeploymentStatus[] = ['live', 'failed', 'superseded'];

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        if (Date.now() - startTime > timeout) {
          reject(new Error('Deployment polling timed out'));
          return;
        }

        const deployment = await getDeployment(deploymentId);
        onUpdate(deployment);

        if (terminalStates.includes(deployment.status)) {
          resolve(deployment);
        } else {
          setTimeout(poll, interval);
        }
      } catch (error) {
        reject(error);
      }
    };

    poll();
  });
}

// ============================================
// URL HELPERS
// ============================================

/**
 * Resolve the pages.dev production URL from a deployment.
 * Handles legacy deployments that stored genesis-hosting.com as productionUrl
 * by deriving the pages.dev URL from the preview URL.
 */
function resolvePagesDevUrl(deployment: { productionUrl?: string; previewUrl?: string }): string | null {
  if (deployment.productionUrl?.includes('.pages.dev')) {
    return deployment.productionUrl;
  }
  // Derive pages.dev URL from preview URL:
  // https://{shortId}.{projectName}.pages.dev → https://{projectName}.pages.dev
  if (deployment.previewUrl?.includes('.pages.dev')) {
    const match = deployment.previewUrl.match(/https:\/\/[^.]+\.(.+\.pages\.dev)/);
    if (match) {
      return `https://${match[1]}`;
    }
  }
  return deployment.productionUrl || null;
}

/**
 * Get the production URL for a site.
 */
export function getProductionUrl(site: Site): string {
  // Check for verified custom domain (primary first)
  const primaryDomain = site.domains?.find(d => d.isPrimary && d.status === 'active');
  if (primaryDomain) {
    return `https://${primaryDomain.domain}`;
  }

  // Check for any verified custom domain
  const activeDomain = site.domains?.find(d => d.status === 'active');
  if (activeDomain) {
    return `https://${activeDomain.domain}`;
  }

  // Check if the active deployment has a production URL (Cloudflare, etc.)
  const activeDeployment = site.activeDeployment || (site as any).activeDeploymentId;
  if (activeDeployment) {
    const url = resolvePagesDevUrl(activeDeployment);
    if (url) return url;
  }

  // Fallback to local hosting URL
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5050';
  return `${baseUrl}/sites/${site.slug}`;
}

/**
 * Get the preview URL for a deployment.
 */
export function getPreviewUrl(site: Site, deployment: Deployment): string {
  // Use deployment's preview URL if available (Cloudflare, etc.)
  if (deployment.previewUrl) {
    return deployment.previewUrl;
  }

  // Fallback to local hosting URL
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5050';
  return `${baseUrl}/sites/${site.slug}/v${deployment.version}`;
}

/**
 * Get the pages.dev subdomain URL.
 */
export function getSubdomainUrl(site: Site): string {
  const activeDeployment = site.activeDeployment || (site as any).activeDeploymentId;
  if (activeDeployment) {
    const url = resolvePagesDevUrl(activeDeployment);
    if (url) return url;
  }

  // Fallback to local hosting URL
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5050';
  return `${baseUrl}/sites/${site.slug}`;
}
