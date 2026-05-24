import { Router } from 'express';
import {
  // Collections
  getCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
  // Fields
  getFields,
  createField,
  updateField,
  deleteField,
  reorderFields,
  // Items
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  publishItem,
  unpublishItem,
  archiveItem,
} from '../controllers/cmsController';
import { authMiddleware } from '../middleware/auth';
import { resolveOrg } from '../middleware/resolveOrg';
import { authorize } from '../middleware/authorize';

const router = Router();

// All CMS routes require authentication
router.use(authMiddleware);

// ============================================
// COLLECTION ROUTES
// ============================================

// List collections for a project
router.get(
  '/:orgId/projects/:projectId/cms/collections',
  resolveOrg,
  authorize('cms:read'),
  getCollections
);

// Get single collection with fields
router.get(
  '/:orgId/projects/:projectId/cms/collections/:collectionId',
  resolveOrg,
  authorize('cms:read'),
  getCollection
);

// Create collection
router.post(
  '/:orgId/projects/:projectId/cms/collections',
  resolveOrg,
  authorize('cms:create'),
  createCollection
);

// Update collection
router.put(
  '/:orgId/projects/:projectId/cms/collections/:collectionId',
  resolveOrg,
  authorize('cms:update'),
  updateCollection
);

// Delete collection
router.delete(
  '/:orgId/projects/:projectId/cms/collections/:collectionId',
  resolveOrg,
  authorize('cms:delete'),
  deleteCollection
);

// ============================================
// FIELD ROUTES
// ============================================

// List fields for a collection
router.get(
  '/:orgId/projects/:projectId/cms/collections/:collectionId/fields',
  resolveOrg,
  authorize('cms:read'),
  getFields
);

// Create field
router.post(
  '/:orgId/projects/:projectId/cms/collections/:collectionId/fields',
  resolveOrg,
  authorize('cms:update'),
  createField
);

// Reorder fields
router.put(
  '/:orgId/projects/:projectId/cms/collections/:collectionId/fields/reorder',
  resolveOrg,
  authorize('cms:update'),
  reorderFields
);

// Update field
router.put(
  '/:orgId/projects/:projectId/cms/fields/:fieldId',
  resolveOrg,
  authorize('cms:update'),
  updateField
);

// Delete field
router.delete(
  '/:orgId/projects/:projectId/cms/fields/:fieldId',
  resolveOrg,
  authorize('cms:update'),
  deleteField
);

// ============================================
// ITEM ROUTES
// ============================================

// List items for a collection
router.get(
  '/:orgId/projects/:projectId/cms/collections/:collectionId/items',
  resolveOrg,
  authorize('cms:read'),
  getItems
);

// Get single item
router.get(
  '/:orgId/projects/:projectId/cms/items/:itemId',
  resolveOrg,
  authorize('cms:read'),
  getItem
);

// Create item
router.post(
  '/:orgId/projects/:projectId/cms/collections/:collectionId/items',
  resolveOrg,
  authorize('cms:create'),
  createItem
);

// Update item
router.put(
  '/:orgId/projects/:projectId/cms/items/:itemId',
  resolveOrg,
  authorize('cms:update'),
  updateItem
);

// Delete item
router.delete(
  '/:orgId/projects/:projectId/cms/items/:itemId',
  resolveOrg,
  authorize('cms:delete'),
  deleteItem
);

// Publish item
router.post(
  '/:orgId/projects/:projectId/cms/items/:itemId/publish',
  resolveOrg,
  authorize('cms:publish'),
  publishItem
);

// Unpublish item
router.post(
  '/:orgId/projects/:projectId/cms/items/:itemId/unpublish',
  resolveOrg,
  authorize('cms:publish'),
  unpublishItem
);

// Archive item
router.post(
  '/:orgId/projects/:projectId/cms/items/:itemId/archive',
  resolveOrg,
  authorize('cms:update'),
  archiveItem
);

export default router;