import { Router } from 'express';
import {
  getSites,
  getSite,
  getSiteByProject,
  createSite,
  updateSite,
  deleteSite,
  getDeployments,
  getDeployment,
  createDeployment,
  rollbackDeployment,
  checkSubdomain,
  getEntitlement,
  addDomain,
  getDomains,
  verifyDomain,
  removeDomain,
  setPrimaryDomain,
} from '../controllers/hostingController';
import { authMiddleware } from '../middleware/auth';
import { resolveOrg } from '../middleware/resolveOrg';
import { authorize } from '../middleware/authorize';

const router = Router();

// All hosting routes require auth
router.use(authMiddleware);

// Subdomain availability check (public within auth)
router.get('/:orgId/hosting/check-subdomain/:subdomain', resolveOrg, checkSubdomain);

// Entitlement/plan info
router.get('/:orgId/hosting/entitlement', resolveOrg, authorize('site:read'), getEntitlement);

// Site routes
router.get('/:orgId/sites', resolveOrg, authorize('site:read'), getSites);
router.get('/:orgId/sites/:siteId', resolveOrg, authorize('site:read'), getSite);
router.get('/:orgId/projects/:projectId/site', resolveOrg, authorize('site:read'), getSiteByProject);
router.post('/:orgId/sites', resolveOrg, authorize('site:create'), createSite);
router.put('/:orgId/sites/:siteId', resolveOrg, authorize('site:update'), updateSite);
router.delete('/:orgId/sites/:siteId', resolveOrg, authorize('site:delete'), deleteSite);

// Deployment routes
router.get('/:orgId/sites/:siteId/deployments', resolveOrg, authorize('site:read'), getDeployments);
router.post('/:orgId/sites/:siteId/deploy', resolveOrg, authorize('site:deploy'), createDeployment);
router.get('/:orgId/deployments/:deploymentId', resolveOrg, authorize('site:read'), getDeployment);
router.post('/:orgId/deployments/:deploymentId/rollback', resolveOrg, authorize('site:rollback'), rollbackDeployment);

// Domain routes
router.get('/:orgId/sites/:siteId/domains', resolveOrg, authorize('site:read'), getDomains);
router.post('/:orgId/sites/:siteId/domains', resolveOrg, authorize('site:update'), addDomain);
router.post('/:orgId/domains/:domainId/verify', resolveOrg, authorize('site:update'), verifyDomain);
router.delete('/:orgId/domains/:domainId', resolveOrg, authorize('site:update'), removeDomain);
router.post('/:orgId/domains/:domainId/set-primary', resolveOrg, authorize('site:update'), setPrimaryDomain);

export default router;