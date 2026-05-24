import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import * as hostingApi from '@/api/hosting';
import type {
  Site,
  Deployment,
  Domain,
  Entitlement,
  EntitlementResponse,
  PlanLimits,
  SiteStatus,
  DeploymentStatus,
  SiteSettings,
} from '@/api/hosting';

// Re-export types for convenience
export type { Site, Deployment, Domain, Entitlement, SiteStatus, DeploymentStatus, SiteSettings };

interface HostingStore {
  // State
  projectId: string | null;
  site: Site | null;
  deployments: Deployment[];
  activeDeployment: Deployment | null;
  domains: Domain[];
  entitlement: Entitlement | null;
  planLimits: PlanLimits | null;
  isPanelOpen: boolean;
  activeTab: 'overview' | 'deployments' | 'settings' | 'domains';
  isLoading: boolean;
  isDeploying: boolean;
  deploymentProgress: {
    status: DeploymentStatus;
    message?: string;
  } | null;
  error: string | null;
  toast: { message: string; type: 'success' | 'error' | 'warning' } | null;

  // Project context
  setProjectId: (projectId: string | null) => void;

  // Panel actions
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  setActiveTab: (tab: 'overview' | 'deployments' | 'settings' | 'domains') => void;

  // Data loading
  loadSite: () => Promise<void>;
  loadDeployments: () => Promise<void>;
  loadDomains: () => Promise<void>;
  loadEntitlement: () => Promise<void>;

  // Site actions
  createSite: (name?: string, slug?: string) => Promise<Site | null>;
  updateSite: (updates: { name?: string; slug?: string; settings?: SiteSettings; status?: SiteStatus }) => Promise<void>;
  deleteSite: () => Promise<void>;

  // Deployment actions
  deploy: (commitMessage?: string) => Promise<Deployment | null>;
  rollback: (deploymentId: string) => Promise<void>;
  pollDeployment: (deploymentId: string) => Promise<void>;

  // Domain actions
  addDomain: (domain: string, isPrimary?: boolean) => Promise<Domain | null>;
  verifyDomain: (domainId: string) => Promise<void>;
  removeDomain: (domainId: string) => Promise<void>;
  setPrimaryDomain: (domainId: string) => Promise<void>;

  // URL helpers
  getProductionUrl: () => string | null;
  getPreviewUrl: (deployment: Deployment) => string | null;
  getSubdomainUrl: () => string | null;

  // Toast
  showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
  clearToast: () => void;

  // Error handling
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useHostingStore = create<HostingStore>()(
  immer((set, get) => ({
    // Initial state
    projectId: null,
    site: null,
    deployments: [],
    activeDeployment: null,
    domains: [],
    entitlement: null,
    planLimits: null,
    isPanelOpen: false,
    activeTab: 'overview',
    isLoading: false,
    isDeploying: false,
    deploymentProgress: null,
    error: null,
    toast: null,

    // Project context
    setProjectId: (projectId) => {
      set((state) => {
        state.projectId = projectId;
        // Reset hosting state when project changes
        state.site = null;
        state.deployments = [];
        state.activeDeployment = null;
        state.domains = [];
        state.deploymentProgress = null;
      });
      // Load site and entitlement for the new project (skip if unsaved "new" project)
      if (projectId && projectId !== 'new') {
        get().loadSite();
        get().loadEntitlement();
      }
    },

    // Panel actions
    openPanel: () => set((state) => { state.isPanelOpen = true; }),
    closePanel: () => set((state) => { state.isPanelOpen = false; }),
    togglePanel: () => set((state) => { state.isPanelOpen = !state.isPanelOpen; }),
    setActiveTab: (tab) => set((state) => { state.activeTab = tab; }),

    // Data loading
    loadSite: async () => {
      const { projectId } = get();
      if (!projectId || projectId === 'new') return;

      set((state) => { state.isLoading = true; });

      try {
        const site = await hostingApi.getSiteByProject(projectId);
        set((state) => {
          state.site = site;
          // Handle both 'activeDeployment' and 'activeDeploymentId' (Mongoose populated field)
          const populatedDeployment = (site as any)?.activeDeployment || (site as any)?.activeDeploymentId;
          if (populatedDeployment && typeof populatedDeployment === 'object') {
            state.activeDeployment = populatedDeployment as Deployment;
            // Also set it on site for URL helper functions
            if (state.site) {
              state.site.activeDeployment = populatedDeployment as Deployment;
            }
          }
          // Site response includes domains
          if (site?.domains) {
            state.domains = site.domains;
          }
          state.isLoading = false;
        });

        // If site exists, load deployments
        if (site) {
          get().loadDeployments();
        }
      } catch (error: any) {
        console.error('Failed to load site:', error);
        set((state) => {
          state.error = error.message;
          state.isLoading = false;
        });
      }
    },

    loadDeployments: async () => {
      const { site } = get();
      if (!site) return;

      try {
        const result = await hostingApi.getDeployments(site._id, { limit: 20 });
        set((state) => {
          state.deployments = result.deployments;
        });
      } catch (error: any) {
        console.error('Failed to load deployments:', error);
        set((state) => {
          state.error = error.message;
        });
      }
    },

    loadDomains: async () => {
      const { site } = get();
      if (!site) return;

      try {
        const domains = await hostingApi.getDomains(site._id);
        set((state) => {
          state.domains = domains;
        });
      } catch (error: any) {
        console.error('Failed to load domains:', error);
        set((state) => {
          state.error = error.message;
        });
      }
    },

    loadEntitlement: async () => {
      try {
        const result: EntitlementResponse = await hostingApi.getEntitlement();
        set((state) => {
          state.entitlement = result.entitlement;
          state.planLimits = result.limits;
        });
      } catch (error: any) {
        console.error('Failed to load entitlement:', error);
        // Don't set error - entitlement failure shouldn't block UI
      }
    },

    // Site actions
    createSite: async (name, slug) => {
      const { projectId, entitlement, planLimits } = get();
      if (!projectId) {
        get().showToast('No project selected', 'error');
        return null;
      }

      // Check if project is unsaved (projectId is "new")
      if (projectId === 'new') {
        get().showToast('Please save your project first before publishing', 'warning');
        return null;
      }

      // Check entitlement limits client-side
      if (entitlement && planLimits) {
        if (entitlement.usage.sitesCreated >= planLimits.maxSites) {
          get().showToast(`Site limit reached. Upgrade your plan to create more sites.`, 'warning');
          return null;
        }
      }

      set((state) => { state.isLoading = true; });

      try {
        const site = await hostingApi.createSite({
          projectId,
          name,
          slug,
        });

        set((state) => {
          state.site = site;
          state.isLoading = false;
          // Update entitlement usage
          if (state.entitlement) {
            state.entitlement.usage.sitesCreated += 1;
          }
        });

        get().showToast('Site created! Starting deployment...', 'success');

        // Auto-deploy after creating site
        get().deploy();

        return site;
      } catch (error: any) {
        console.error('Failed to create site:', error);
        set((state) => { state.isLoading = false; });

        if (error.upgradeRequired) {
          get().showToast(error.message || 'Upgrade required', 'warning');
        } else {
          get().showToast(error.message || 'Failed to create site', 'error');
        }
        return null;
      }
    },

    updateSite: async (updates) => {
      const { site } = get();
      if (!site) {
        get().showToast('No site exists', 'error');
        return;
      }

      try {
        const updated = await hostingApi.updateSite(site._id, updates);
        set((state) => {
          state.site = updated;
        });
        get().showToast('Site updated', 'success');
      } catch (error: any) {
        console.error('Failed to update site:', error);
        get().showToast(error.message || 'Failed to update site', 'error');
      }
    },

    deleteSite: async () => {
      const { site } = get();
      if (!site) return;

      try {
        await hostingApi.deleteSite(site._id);
        set((state) => {
          state.site = null;
          state.deployments = [];
          state.activeDeployment = null;
          state.domains = [];
          // Update entitlement usage
          if (state.entitlement && state.entitlement.usage.sitesCreated > 0) {
            state.entitlement.usage.sitesCreated -= 1;
          }
        });
        get().showToast('Site deleted', 'success');
      } catch (error: any) {
        console.error('Failed to delete site:', error);
        get().showToast(error.message || 'Failed to delete site', 'error');
      }
    },

    // Deployment actions
    deploy: async (commitMessage) => {
      const { site, entitlement, planLimits } = get();
      if (!site) {
        get().showToast('No site exists. Create a site first.', 'error');
        return null;
      }

      // Check entitlement limits client-side
      if (entitlement && planLimits) {
        if (entitlement.usage.deploymentsThisMonth >= planLimits.deploymentsPerMonth) {
          get().showToast(`Monthly deployment limit reached. Upgrade your plan for more deployments.`, 'warning');
          return null;
        }
      }

      set((state) => {
        state.isDeploying = true;
        state.deploymentProgress = { status: 'queued', message: 'Starting deployment...' };
      });

      try {
        const deployment = await hostingApi.createDeployment(site._id, {
          commitMessage,
          triggeredBy: 'manual',
        });

        set((state) => {
          state.deployments.unshift(deployment);
          // Update entitlement usage
          if (state.entitlement) {
            state.entitlement.usage.deploymentsThisMonth += 1;
          }
        });

        // Start polling for deployment status
        get().pollDeployment(deployment._id);

        return deployment;
      } catch (error: any) {
        console.error('Failed to create deployment:', error);
        set((state) => {
          state.isDeploying = false;
          state.deploymentProgress = null;
        });

        if (error.upgradeRequired) {
          get().showToast(error.message || 'Upgrade required', 'warning');
        } else {
          get().showToast(error.message || 'Failed to deploy', 'error');
        }
        return null;
      }
    },

    pollDeployment: async (deploymentId) => {
      try {
        await hostingApi.pollDeployment(
          deploymentId,
          (deployment) => {
            set((state) => {
              // Update deployment progress
              state.deploymentProgress = {
                status: deployment.status,
                message: getStatusMessage(deployment.status),
              };

              // Update deployment in list
              const index = state.deployments.findIndex((d) => d._id === deploymentId);
              if (index !== -1) {
                state.deployments[index] = deployment;
              }

              // If live, update active deployment
              if (deployment.status === 'live') {
                state.activeDeployment = deployment;
                if (state.site) {
                  state.site.activeDeploymentId = deployment._id;
                  state.site.activeDeployment = deployment; // For URL helper functions
                  state.site.status = 'live';
                  state.site.lastDeployedAt = deployment.liveAt;
                }
              }
            });
          },
          { interval: 2000, timeout: 300000 }
        );

        set((state) => {
          state.isDeploying = false;
        });

        const finalDeployment = get().deployments.find((d) => d._id === deploymentId);
        if (finalDeployment?.status === 'live') {
          get().showToast('Deployment successful!', 'success');
        } else if (finalDeployment?.status === 'failed') {
          get().showToast(`Deployment failed: ${finalDeployment.error || 'Unknown error'}`, 'error');
        }
      } catch (error: any) {
        console.error('Deployment polling error:', error);
        set((state) => {
          state.isDeploying = false;
          state.deploymentProgress = null;
        });
        get().showToast('Failed to track deployment status', 'error');
      }
    },

    rollback: async (deploymentId) => {
      const { site } = get();
      if (!site) return;

      set((state) => { state.isLoading = true; });

      try {
        const result = await hostingApi.rollbackDeployment(deploymentId);

        set((state) => {
          state.site = result.site;
          state.activeDeployment = result.deployment;
          state.isLoading = false;
        });

        // Refresh deployments to get updated statuses
        get().loadDeployments();

        get().showToast(`Rolled back to v${result.deployment.version}`, 'success');
      } catch (error: any) {
        console.error('Failed to rollback:', error);
        set((state) => { state.isLoading = false; });
        get().showToast(error.message || 'Failed to rollback', 'error');
      }
    },

    // Domain actions
    addDomain: async (domain, isPrimary = false) => {
      const { site, entitlement, planLimits } = get();
      if (!site) {
        get().showToast('No site exists', 'error');
        return null;
      }

      // Check entitlement limits client-side
      if (entitlement && planLimits) {
        if (entitlement.usage.customDomainsUsed >= planLimits.customDomains) {
          get().showToast(`Custom domain limit reached. Upgrade your plan to add more domains.`, 'warning');
          return null;
        }
      }

      set((state) => { state.isLoading = true; });

      try {
        const result = await hostingApi.addDomain(site._id, { domain, isPrimary });

        set((state) => {
          state.domains.push(result.domain);
          state.isLoading = false;
          // Update entitlement usage
          if (state.entitlement) {
            state.entitlement.usage.customDomainsUsed += 1;
          }
        });

        get().showToast(`Domain added. ${result.verification.instructions}`, 'success');
        return result.domain;
      } catch (error: any) {
        console.error('Failed to add domain:', error);
        set((state) => { state.isLoading = false; });

        if (error.upgradeRequired) {
          get().showToast(error.message || 'Upgrade required', 'warning');
        } else {
          get().showToast(error.message || 'Failed to add domain', 'error');
        }
        return null;
      }
    },

    verifyDomain: async (domainId) => {
      try {
        const result = await hostingApi.verifyDomain(domainId);

        set((state) => {
          const index = state.domains.findIndex((d) => d._id === domainId);
          if (index !== -1) {
            state.domains[index] = result.domain;
          }
        });

        get().showToast(result.message, 'success');
      } catch (error: any) {
        console.error('Failed to verify domain:', error);
        get().showToast(error.message || 'Failed to verify domain', 'error');
      }
    },

    removeDomain: async (domainId) => {
      try {
        await hostingApi.removeDomain(domainId);

        set((state) => {
          state.domains = state.domains.filter((d) => d._id !== domainId);
          // Update entitlement usage
          if (state.entitlement && state.entitlement.usage.customDomainsUsed > 0) {
            state.entitlement.usage.customDomainsUsed -= 1;
          }
        });

        get().showToast('Domain removed', 'success');
      } catch (error: any) {
        console.error('Failed to remove domain:', error);
        get().showToast(error.message || 'Failed to remove domain', 'error');
      }
    },

    setPrimaryDomain: async (domainId) => {
      try {
        const domain = await hostingApi.setPrimaryDomain(domainId);

        set((state) => {
          // Update all domains - unset other primaries
          state.domains = state.domains.map((d) => ({
            ...d,
            isPrimary: d._id === domainId,
          }));
        });

        get().showToast(`${domain.domain} is now the primary domain`, 'success');
      } catch (error: any) {
        console.error('Failed to set primary domain:', error);
        get().showToast(error.message || 'Failed to set primary domain', 'error');
      }
    },

    // URL helpers
    getProductionUrl: () => {
      const { site } = get();
      if (!site) return null;
      return hostingApi.getProductionUrl(site);
    },

    getPreviewUrl: (deployment) => {
      const { site } = get();
      if (!site) return null;
      return hostingApi.getPreviewUrl(site, deployment);
    },

    getSubdomainUrl: () => {
      const { site } = get();
      if (!site) return null;
      return hostingApi.getSubdomainUrl(site);
    },

    // Toast
    showToast: (message, type) => {
      set((state) => { state.toast = { message, type }; });
      setTimeout(() => get().clearToast(), 4000);
    },
    clearToast: () => set((state) => { state.toast = null; }),

    // Error handling
    setError: (error) => set((state) => { state.error = error; }),
    setLoading: (loading) => set((state) => { state.isLoading = loading; }),
  }))
);

// Helper function for status messages
function getStatusMessage(status: DeploymentStatus): string {
  switch (status) {
    case 'queued':
      return 'Deployment queued...';
    case 'building':
      return 'Building site...';
    case 'uploading':
      return 'Uploading files...';
    case 'propagating':
      return 'Propagating to CDN...';
    case 'live':
      return 'Deployment complete!';
    case 'failed':
      return 'Deployment failed';
    case 'superseded':
      return 'Superseded by newer deployment';
    default:
      return 'Processing...';
  }
}