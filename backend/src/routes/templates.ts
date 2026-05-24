import express from 'express';
import multer from 'multer';
import { importTemplate, listTemplates, publishTemplate, recordTemplatePurchase, getTemplatePurchases } from '../controllers/templateController';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { resolveOrg } from '../middleware/resolveOrg';

const router = express.Router();

// Use memory storage for zip uploads; allow larger files for template imports
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } }); // 200MB

// Protect import route: authenticated admins only
router.post('/import', authMiddleware, adminMiddleware, upload.single('template'), importTemplate);
router.get('/list', listTemplates);

// Publish template from builder (authenticated users only)
// Use multer for form-data parsing (no file upload, just fields)
const publishUpload = multer();
router.post('/publish', authMiddleware, publishUpload.none(), publishTemplate);

// Org-scoped purchase routes: /api/orgs/:orgId/template-purchases
router.post('/:orgId/template-purchases', authMiddleware, resolveOrg, recordTemplatePurchase);
router.get('/:orgId/template-purchases', authMiddleware, resolveOrg, getTemplatePurchases);

export default router;



