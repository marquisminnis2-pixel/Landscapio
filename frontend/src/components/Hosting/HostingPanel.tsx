import { useState } from 'react';
import { useHostingStore } from '@/store/useHostingStore';
import type { Domain, Deployment } from '@/store/useHostingStore';
import { formatDistanceToNow } from 'date-fns';

const HostingPanel = () => {
  const {
    isPanelOpen,
    closePanel,
    activeTab,
    setActiveTab,
    site,
    deployments,
    activeDeployment,
    domains,
    entitlement,
    planLimits,
    isLoading,
    isDeploying,
    deploymentProgress,
    toast,
    clearToast,
    createSite,
    deploy,
    rollback,
    getProductionUrl,
  } = useHostingStore();

  if (!isPanelOpen) return null;

  const productionUrl = getProductionUrl();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={closePanel}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[420px] bg-panel-bg border-l border-border-color shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-color bg-canvas-bg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-text-primary">Hosting</h2>
          </div>
          <button
            onClick={closePanel}
            className="p-1.5 rounded hover:bg-border-color transition-colors"
            title="Close panel"
          >
            <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Plan Badge */}
        {entitlement && (
          <div className="px-4 py-2 bg-canvas-bg/50 border-b border-border-color flex items-center justify-between">
            <span className="text-xs text-text-secondary">
              Plan: <span className="text-text-primary font-medium capitalize">{entitlement.planTier}</span>
            </span>
            {planLimits && (
              <span className="text-xs text-text-secondary">
                {entitlement.usage.deploymentsThisMonth}/{planLimits.deploymentsPerMonth} deploys
              </span>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border-color">
          {(['overview', 'deployments', 'settings', 'domains'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              disabled={!site && tab !== 'overview'}
              className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors relative capitalize disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === tab
                  ? 'text-accent-blue'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-blue" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && !site ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent-blue border-t-transparent" />
            </div>
          ) : !site ? (
            <SetupView onCreate={() => createSite()} />
          ) : activeTab === 'overview' ? (
            <OverviewTab
              site={site}
              activeDeployment={activeDeployment}
              productionUrl={productionUrl}
              pagesDevUrl={activeDeployment?.previewUrl || null}
              isDeploying={isDeploying}
              deploymentProgress={deploymentProgress}
              onDeploy={() => deploy()}
            />
          ) : activeTab === 'deployments' ? (
            <DeploymentsTab
              deployments={deployments}
              activeDeploymentId={activeDeployment?._id}
              onRollback={rollback}
            />
          ) : activeTab === 'settings' ? (
            <SettingsTab site={site} />
          ) : activeTab === 'domains' ? (
            <DomainsTab site={site} domains={domains} />
          ) : null}
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`absolute bottom-4 left-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center justify-between ${
              toast.type === 'success'
                ? 'bg-green-500/90 text-white'
                : toast.type === 'warning'
                ? 'bg-yellow-500/90 text-white'
                : 'bg-red-500/90 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : toast.type === 'warning' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
            <button onClick={clearToast} className="p-1 hover:bg-white/20 rounded">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </>
  );
};

// Setup View - shown when no site exists
const SetupView = ({ onCreate }: { onCreate: () => void }) => (
  <div className="p-6 text-center">
    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-blue/10 flex items-center justify-center">
      <svg className="w-8 h-8 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-text-primary mb-2">Set up hosting</h3>
    <p className="text-sm text-text-secondary mb-6">
      Create a site to publish your project to the web. You'll get a unique URL where anyone can view your site.
    </p>
    <button
      onClick={onCreate}
      className="px-4 py-2 bg-accent-blue text-white rounded-lg font-medium hover:bg-accent-blue/90 transition-colors"
    >
      Create Site
    </button>
  </div>
);

// Overview Tab
const OverviewTab = ({
  site,
  activeDeployment,
  productionUrl,
  pagesDevUrl,
  isDeploying,
  deploymentProgress,
  onDeploy,
}: {
  site: any;
  activeDeployment: Deployment | null;
  productionUrl: string | null;
  pagesDevUrl: string | null;
  isDeploying: boolean;
  deploymentProgress: any;
  onDeploy: () => void;
}) => (
  <div className="p-4 space-y-4">
    {/* Status Card */}
    <div className="bg-canvas-bg rounded-lg p-4 border border-border-color">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-text-secondary">Status</span>
        <SiteStatusBadge status={site.status} />
      </div>

      {(productionUrl || pagesDevUrl) && (
        <div className="mb-3 space-y-2">
          {pagesDevUrl && (
            <div>
              <span className="text-xs text-text-secondary block mb-1">Pages.dev URL</span>
              <a
                href={pagesDevUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent-blue hover:underline flex items-center gap-1"
              >
                {pagesDevUrl}
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
          {productionUrl && (
            <div>
              <span className="text-xs text-text-secondary block mb-1">Production URL</span>
              <a
                href={productionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent-blue hover:underline flex items-center gap-1"
              >
                {productionUrl}
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </div>
      )}

      {site.lastDeployedAt && (
        <div className="text-xs text-text-secondary">
          Last deployed {formatDistanceToNow(new Date(site.lastDeployedAt))} ago
          {activeDeployment && (
            <>
              <span className="mx-1">·</span>
              v{activeDeployment.version}
            </>
          )}
        </div>
      )}

      {site.errorMessage && (
        <div className="mt-2 text-xs text-red-400">
          Error: {site.errorMessage}
        </div>
      )}
    </div>

    {/* Deployment Progress */}
    {isDeploying && deploymentProgress && (
      <div className="bg-accent-blue/10 rounded-lg p-4 border border-accent-blue/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-accent-blue border-t-transparent" />
          <span className="text-sm font-medium text-accent-blue">
            {deploymentProgress.message}
          </span>
        </div>
        <div className="h-1.5 bg-accent-blue/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-blue transition-all duration-500"
            style={{
              width: `${getProgressPercent(deploymentProgress.status)}%`,
            }}
          />
        </div>
      </div>
    )}

    {/* Deploy Button */}
    <button
      onClick={onDeploy}
      disabled={isDeploying}
      className="w-full px-4 py-3 bg-accent-blue text-white rounded-lg font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {isDeploying ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          Deploying...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Publish Changes
        </>
      )}
    </button>

    {/* Quick Stats */}
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-canvas-bg rounded-lg p-3 border border-border-color">
        <span className="text-xs text-text-secondary block mb-1">Total Deployments</span>
        <span className="text-lg font-semibold text-text-primary">
          {useHostingStore.getState().deployments.length}
        </span>
      </div>
      <div className="bg-canvas-bg rounded-lg p-3 border border-border-color">
        <span className="text-xs text-text-secondary block mb-1">Current Version</span>
        <span className="text-lg font-semibold text-text-primary">
          v{activeDeployment?.version || 0}
        </span>
      </div>
    </div>
  </div>
);

// Deployments Tab
const DeploymentsTab = ({
  deployments,
  activeDeploymentId,
  onRollback,
}: {
  deployments: Deployment[];
  activeDeploymentId?: string;
  onRollback: (id: string) => void;
}) => (
  <div className="p-4">
    {deployments.length === 0 ? (
      <div className="text-center py-8 text-text-secondary text-sm">
        No deployments yet
      </div>
    ) : (
      <div className="space-y-2">
        {deployments.map((deployment) => (
          <div
            key={deployment._id}
            className={`bg-canvas-bg rounded-lg p-3 border transition-colors ${
              deployment._id === activeDeploymentId
                ? 'border-accent-blue'
                : 'border-border-color'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-text-primary">v{deployment.version}</span>
                <DeploymentStatusBadge status={deployment.status} />
                {deployment._id === activeDeploymentId && (
                  <span className="px-1.5 py-0.5 bg-accent-blue/20 text-accent-blue text-xs rounded">
                    Active
                  </span>
                )}
              </div>
              {(deployment.status === 'live' || deployment.status === 'superseded') &&
               deployment._id !== activeDeploymentId && (
                <button
                  onClick={() => onRollback(deployment._id)}
                  className="text-xs text-text-secondary hover:text-accent-blue transition-colors"
                >
                  Rollback
                </button>
              )}
            </div>
            <div className="text-xs text-text-secondary">
              {formatDistanceToNow(new Date(deployment.createdAt))} ago
              {deployment.commitMessage && (
                <span className="ml-2 text-text-primary">· {deployment.commitMessage}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// Settings Tab
const SettingsTab = ({ site }: { site: any }) => {
  const { updateSite, deleteSite, deploy } = useHostingStore();
  const [siteName, setSiteName] = useState(site.name);
  const [subdomain, setSubdomain] = useState(site.slug);
  const [saving, setSaving] = useState(false);

  const slugChanged = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '') !== site.slug;
  const nameChanged = siteName !== site.name;
  const hasChanges = slugChanged || nameChanged;
  const normalizedSlug = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
  const slugValid = normalizedSlug.length >= 3 && normalizedSlug.length <= 63;

  const handleSave = async () => {
    if (!hasChanges || (slugChanged && !slugValid)) return;

    if (slugChanged && site.status !== 'draft') {
      const confirmed = confirm(
        `Changing your subdomain will permanently remove "${site.slug}.pages.dev". The new URL "${normalizedSlug}.pages.dev" will be available after you redeploy.\n\nContinue?`
      );
      if (!confirmed) return;
    }

    setSaving(true);
    const updates: Record<string, string> = {};
    if (nameChanged) updates.name = siteName;
    if (slugChanged) updates.slug = normalizedSlug;
    await updateSite(updates);
    setSaving(false);

    // If slug changed on a live site, prompt redeploy
    if (slugChanged && site.status !== 'draft') {
      const shouldRedeploy = confirm('Subdomain updated. Deploy now to make the new URL live?');
      if (shouldRedeploy) {
        deploy();
      }
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="text-sm text-text-secondary block mb-1">Site Name</label>
        <input
          type="text"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          className="w-full px-3 py-2 bg-canvas-bg border border-border-color rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-blue"
        />
      </div>

      <div>
        <label className="text-sm text-text-secondary block mb-1">Subdomain</label>
        <div className="flex items-center">
          <input
            type="text"
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value)}
            className={`flex-1 px-3 py-2 bg-canvas-bg border rounded-l-lg text-text-primary text-sm focus:outline-none ${
              slugChanged && !slugValid ? 'border-red-400 focus:border-red-400' : 'border-border-color focus:border-accent-blue'
            }`}
          />
          <span className="px-3 py-2 bg-border-color text-text-secondary text-sm rounded-r-lg border border-l-0 border-border-color">
            .pages.dev
          </span>
        </div>
        {slugChanged && !slugValid && (
          <p className="text-xs text-red-400 mt-1">Must be 3-63 characters (letters, numbers, hyphens)</p>
        )}
        {slugChanged && slugValid && (
          <p className="text-xs text-amber-400 mt-1">
            URL will change to <span className="font-medium">{normalizedSlug}.pages.dev</span>
          </p>
        )}
        {!slugChanged && (
          <p className="text-xs text-text-secondary mt-1">This is your site's public URL</p>
        )}
      </div>

      {hasChanges && (
        <button
          onClick={handleSave}
          disabled={saving || (slugChanged && !slugValid)}
          className="w-full px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      )}

      <div className="pt-4 border-t border-border-color">
        <h4 className="text-sm font-medium text-text-primary mb-3">Danger Zone</h4>
        <button
          onClick={() => {
            if (confirm('Are you sure you want to delete this site? This action cannot be undone.')) {
              deleteSite();
            }
          }}
          className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors"
        >
          Delete Site
        </button>
      </div>
    </div>
  );
};

// Domains Tab - Updated for new Domain model
const DomainsTab = ({ site, domains }: { site: any; domains: Domain[] }) => {
  const { addDomain, verifyDomain, removeDomain, setPrimaryDomain, entitlement, planLimits } = useHostingStore();
  const [newDomain, setNewDomain] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;
    setIsAdding(true);
    const result = await addDomain(newDomain.trim());
    if (result) {
      setNewDomain('');
    }
    setIsAdding(false);
  };

  const canAddMoreDomains = !planLimits || !entitlement ||
    entitlement.usage.customDomainsUsed < planLimits.customDomains;

  return (
    <div className="p-4 space-y-4">
      {/* Default Subdomain */}
      <div className="bg-canvas-bg rounded-lg p-3 border border-border-color">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-text-secondary block mb-0.5">Default Subdomain</span>
            <span className="text-sm text-text-primary">{site.slug}.pages.dev</span>
          </div>
          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">Active</span>
        </div>
      </div>

      {/* Custom Domains */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-text-primary">Custom Domains</h4>
          {planLimits && entitlement && (
            <span className="text-xs text-text-secondary">
              {entitlement.usage.customDomainsUsed}/{planLimits.customDomains} used
            </span>
          )}
        </div>

        {domains.length === 0 ? (
          <p className="text-sm text-text-secondary mb-3">
            No custom domains configured
          </p>
        ) : (
          <div className="space-y-2 mb-3">
            {domains.map((domain) => (
              <div
                key={domain._id}
                className="bg-canvas-bg rounded-lg p-3 border border-border-color"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-primary">{domain.domain}</span>
                    {domain.isPrimary && (
                      <span className="px-1.5 py-0.5 bg-accent-blue/20 text-accent-blue text-xs rounded">
                        Primary
                      </span>
                    )}
                  </div>
                  <DomainStatusBadge status={domain.status} />
                </div>

                {/* Verification instructions for pending domains */}
                {(domain.status === 'pending' || domain.status === 'verifying') && (
                  <div className="mt-2 p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                    <p className="text-xs text-yellow-400 mb-1">DNS Configuration Required</p>
                    <p className="text-xs text-text-secondary">
                      Add a CNAME record pointing to:{' '}
                      <code className="bg-black/20 px-1 rounded">{domain.expectedCname}</code>
                    </p>
                  </div>
                )}

                {/* SSL Status */}
                {domain.status === 'active' && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-text-secondary">
                    <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    SSL: {domain.sslStatus === 'active' ? 'Active' : 'Provisioning'}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-2 flex items-center gap-2">
                  {(domain.status === 'pending' || domain.status === 'verifying' || domain.status === 'failed') && (
                    <button
                      onClick={() => verifyDomain(domain._id)}
                      className="text-xs text-accent-blue hover:underline"
                    >
                      Verify DNS
                    </button>
                  )}
                  {domain.status === 'active' && !domain.isPrimary && (
                    <button
                      onClick={() => setPrimaryDomain(domain._id)}
                      className="text-xs text-accent-blue hover:underline"
                    >
                      Set as Primary
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${domain.domain}?`)) {
                        removeDomain(domain._id);
                      }
                    }}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Domain Form */}
        {canAddMoreDomains ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
              className="flex-1 px-3 py-2 bg-canvas-bg border border-border-color rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-blue"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddDomain();
              }}
            />
            <button
              onClick={handleAddDomain}
              disabled={isAdding || !newDomain.trim()}
              className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
            >
              {isAdding ? 'Adding...' : 'Add'}
            </button>
          </div>
        ) : (
          <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <p className="text-sm text-yellow-400">
              Custom domain limit reached. Upgrade your plan to add more domains.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Site Status Badge
const SiteStatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    draft: 'bg-gray-500/20 text-gray-400',
    deploying: 'bg-blue-500/20 text-blue-400',
    live: 'bg-green-500/20 text-green-400',
    paused: 'bg-yellow-500/20 text-yellow-400',
    error: 'bg-red-500/20 text-red-400',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.draft}`}>
      {status}
    </span>
  );
};

// Deployment Status Badge
const DeploymentStatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    queued: 'bg-gray-500/20 text-gray-400',
    building: 'bg-blue-500/20 text-blue-400',
    uploading: 'bg-blue-500/20 text-blue-400',
    propagating: 'bg-blue-500/20 text-blue-400',
    live: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
    superseded: 'bg-gray-500/20 text-gray-400',
  };

  return (
    <span className={`px-1.5 py-0.5 rounded text-xs ${colors[status] || colors.queued}`}>
      {status}
    </span>
  );
};

// Domain Status Badge
const DomainStatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    verifying: 'bg-blue-500/20 text-blue-400',
    active: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
    expired: 'bg-red-500/20 text-red-400',
  };

  return (
    <span className={`px-1.5 py-0.5 rounded text-xs ${colors[status] || colors.pending}`}>
      {status}
    </span>
  );
};

// Helper to get progress percent
function getProgressPercent(status: string): number {
  switch (status) {
    case 'queued':
      return 10;
    case 'building':
      return 35;
    case 'uploading':
      return 65;
    case 'propagating':
      return 90;
    case 'live':
      return 100;
    default:
      return 0;
  }
}

export default HostingPanel;