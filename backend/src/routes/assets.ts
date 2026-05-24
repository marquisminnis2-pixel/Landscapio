import { Router } from 'express';
import { uploadAsset, getAssets, deleteAsset } from '../controllers/assetController';
import { authMiddleware } from '../middleware/auth';
import { resolveOrg } from '../middleware/resolveOrg';
import { authorize } from '../middleware/authorize';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authMiddleware);

// Org-scoped asset routes
router.post('/:orgId/assets/upload', resolveOrg, authorize('asset:upload'), upload.single('file'), uploadAsset);
router.get('/:orgId/assets/:projectId', resolveOrg, authorize('asset:read'), getAssets);
router.delete('/:orgId/assets/:id', resolveOrg, authorize('asset:delete'), deleteAsset);

export default router;