# Cloudflare Pages Adapter

Production-ready hosting adapter for deploying Genesis sites to Cloudflare Pages.

## Configuration

Add these environment variables:

```bash
# Required
CLOUDFLARE_API_TOKEN=your-api-token
CLOUDFLARE_ACCOUNT_ID=your-account-id

# Optional
GENESIS_BASE_DOMAIN=pages.dev        # Default Cloudflare Pages domain
GENESIS_ENV=prod                      # Environment prefix (dev/staging/prod)
HOSTING_PROVIDER=cloudflare          # To use Cloudflare as default
```

## API Token Setup

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Create a token with these permissions:
   - **Account > Cloudflare Pages > Edit** (required)
   - **Zone > DNS > Edit** (for custom domains - Phase 2)
3. Restrict to your account ID for security

## Architecture

```
CloudflarePagesAdapter
├── cloudflareClient.ts    # Low-level API wrapper
├── types.ts               # TypeScript interfaces
├── CloudflarePagesAdapter.ts  # Main adapter implementation
├── CloudflareHostingService.ts # Service layer with DB integration
└── index.ts               # Module exports
```

## Usage

### Basic Usage (Adapter)

```typescript
import { getCloudflarePagesAdapter } from './hosting/cloudflare';

const adapter = getCloudflarePagesAdapter();

// Create a site
const result = await adapter.createSite(hostingSite);

// Deploy files
const deployResult = await adapter.deploy(site, deployment, files, (progress) => {
  console.log(`${progress.stage}: ${progress.progress}%`);
});
```

### Service Layer Usage (Recommended)

```typescript
import { getCloudflareHostingService } from './hosting/cloudflare';

const service = getCloudflareHostingService();

// Create a hosting site (creates DB record + Cloudflare project)
const site = await service.createHostingSite(orgId, projectId, 'My Site');

// Deploy a project
const deployment = await service.deployProject(site._id, projectId, {
  commitMessage: 'New features',
  triggeredBy: 'manual',
});

// Check status
const status = await service.getDeploymentStatus(deployment._id);

// Rollback
await service.rollbackDeployment(site._id, previousDeploymentId);
```

## Deployment Flow

1. **Create Site** → Creates Cloudflare Pages project
2. **Build** → Generates HTML/CSS/JS from project elements
3. **Upload** → Direct upload to Cloudflare (no git)
4. **Propagate** → Cloudflare distributes to edge network
5. **Live** → Site available at `{slug}.pages.dev`

## Status Mapping

| Cloudflare Status | Genesis Status |
|-------------------|----------------|
| idle              | queued         |
| queued            | queued         |
| building          | building       |
| success           | live           |
| failure           | failed         |
| canceled          | failed         |

## Custom Domains (Phase 2)

Currently scaffolded. To add a custom domain:

1. Domain must be added to your Cloudflare account as a zone, OR
2. Use CNAME verification for external domains

```typescript
const result = await adapter.attachDomain(site, 'example.com');
// Returns verification instructions if needed
```

## Rate Limits

Cloudflare API limits: ~1200 requests per 5 minutes

Recommendations:
- Debounce UI deployment triggers (min 5s between deploys)
- Use exponential backoff for polling (built into client)
- Cache project/deployment info where possible

## Test Strategy

### Unit Tests

```typescript
// Test request building
describe('CloudflareClient', () => {
  it('should build correct project creation request', () => {
    // Mock fetch, verify request body
  });

  it('should parse API errors correctly', () => {
    // Test error code mapping
  });

  it('should handle rate limiting with backoff', () => {
    // Mock 429 responses
  });
});

// Test status mapping
describe('CloudflarePagesAdapter', () => {
  it('should map Cloudflare status to Genesis status', () => {
    expect(adapter.mapStatusToGenesis('success')).toBe('live');
    expect(adapter.mapStatusToGenesis('failure')).toBe('failed');
  });

  it('should generate correct project names', () => {
    expect(adapter.getProjectName({ slug: 'my-site' })).toBe('dev-my-site');
  });
});

// Test file processing
describe('File Processing', () => {
  it('should hash files correctly with SHA-1', () => {
    // Test hash generation
  });

  it('should read directory recursively', () => {
    // Test with fixture directory
  });

  it('should extract zip files', () => {
    // Test with fixture zip
  });
});
```

### Integration Tests

```typescript
// Real deployment test (requires API credentials)
describe('Cloudflare Integration', () => {
  const testProjectName = `test-${Date.now()}`;

  afterAll(async () => {
    // Cleanup: delete test project
    await client.deleteProject(testProjectName);
  });

  it('should create a project', async () => {
    const project = await client.createProject(testProjectName);
    expect(project.name).toBe(testProjectName);
  });

  it('should deploy a simple site', async () => {
    const files = [
      { path: '/index.html', content: Buffer.from('<h1>Test</h1>'), hash: '...' }
    ];
    const deployment = await client.createDeployment(testProjectName, files);
    expect(deployment.url).toContain(testProjectName);
  });

  it('should complete deployment successfully', async () => {
    // Wait for deployment to finish
    const status = await waitForDeployment(testProjectName, deploymentId);
    expect(status).toBe('success');
  });
});
```

### Test Fixtures

Create a minimal test site in `__fixtures__/test-site/`:

```
test-site/
├── index.html
├── styles.css
└── script.js
```

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| 8000000 | Invalid API token | Check CLOUDFLARE_API_TOKEN |
| 8000002 | Project name taken | Use unique slug |
| 8000007 | Project not found | Create project first |
| 8000013 | Rate limited | Wait and retry |
| 8000016 | Max projects reached | Delete unused projects |

## Monitoring

The adapter logs structured JSON for all operations:

```json
{
  "operation": "deploy",
  "siteSlug": "my-site",
  "deploymentId": "xxx",
  "status": "success",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

Recommended: Send logs to your observability platform (Datadog, etc.)

## Limitations

1. **No Direct Rollback API**: Cloudflare doesn't have "set this deployment as active". Rollback creates a new deployment with previous files.

2. **Project Name Constraints**: Must be lowercase, alphanumeric with hyphens, max 63 chars.

3. **File Size Limits**: Individual files max 25MB, total deployment max 20,000 files.

4. **Build Output Only**: No serverless functions (yet). Static files only.

## Future Improvements

- [ ] Implement proper file caching for faster redeploys
- [ ] Add Cloudflare Workers for edge functions
- [ ] Implement bulk domain verification
- [ ] Add deployment preview comments
- [ ] Support for deployment aliases