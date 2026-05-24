import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { resolveOrg } from '../middleware/resolveOrg';
import { authorize } from '../middleware/authorize';
import {
  createClient,
  getClients,
  getClient,
  updateClient,
  deleteClient,
  getConversations,
  saveConversation,
  clearConversations,
  clientGeniChat,
} from '../controllers/clientController';

const router = Router();

router.use(authMiddleware);

// Client CRUD
router.post('/:orgId/clients', resolveOrg, authorize('project:create'), createClient);
router.get('/:orgId/clients', resolveOrg, authorize('project:read'), getClients);
router.get('/:orgId/clients/:clientId', resolveOrg, authorize('project:read'), getClient);
router.put('/:orgId/clients/:clientId', resolveOrg, authorize('project:update'), updateClient);
router.delete('/:orgId/clients/:clientId', resolveOrg, authorize('project:delete'), deleteClient);

// Per-client conversations
router.get('/:orgId/clients/:clientId/conversations', resolveOrg, authorize('project:read'), getConversations);
router.post('/:orgId/clients/:clientId/conversations', resolveOrg, authorize('project:create'), saveConversation);
router.delete('/:orgId/clients/:clientId/conversations', resolveOrg, authorize('project:delete'), clearConversations);

// Per-client Geni AI chat (streaming)
router.post('/:orgId/clients/:clientId/geni/chat', resolveOrg, authorize('project:read'), clientGeniChat);

export default router;