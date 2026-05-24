import { IHostingAdapter } from './HostingAdapter';
import { LocalAdapter, getLocalAdapter } from './LocalAdapter';
import { CloudflarePagesAdapter, getCloudflarePagesAdapter, isCloudflareConfigured } from './cloudflare';

export * from './HostingAdapter';
export * from './LocalAdapter';
export * from './cloudflare';

export type HostingProviderType = 'local' | 'cloudflare' | 'vercel' | 'netlify';

/**
 * Get the hosting adapter based on configuration.
 * Currently supports:
 * - local: File system storage (default, good for dev/self-hosted)
 * - cloudflare: Cloudflare Pages (production-ready CDN hosting)
 *
 * Future adapters:
 * - vercel: Vercel
 * - netlify: Netlify
 */
export function getHostingAdapter(provider?: HostingProviderType): IHostingAdapter {
  const selectedProvider = provider || (process.env.HOSTING_PROVIDER as HostingProviderType) || 'local';

  switch (selectedProvider) {
    case 'local':
      return getLocalAdapter();

    case 'cloudflare':
      if (!isCloudflareConfigured()) {
        console.warn('Cloudflare not configured, falling back to local');
        return getLocalAdapter();
      }
      return getCloudflarePagesAdapter();

    // Future implementations:
    // case 'vercel':
    //   return getVercelAdapter();
    // case 'netlify':
    //   return getNetlifyAdapter();

    default:
      console.warn(`Unknown hosting provider "${selectedProvider}", falling back to local`);
      return getLocalAdapter();
  }
}

/**
 * Check if the current hosting adapter is properly configured
 */
export function isHostingConfigured(): boolean {
  const adapter = getHostingAdapter();
  return adapter.isConfigured();
}

/**
 * Get the best available hosting adapter
 * Prefers Cloudflare if configured, otherwise falls back to local
 */
export function getBestHostingAdapter(): IHostingAdapter {
  if (isCloudflareConfigured()) {
    return getCloudflarePagesAdapter();
  }
  return getLocalAdapter();
}