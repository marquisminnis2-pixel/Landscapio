// Load environment variables FIRST (before any imports that use env vars)
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { connectDatabase } from './config/database';

// Routes
import authRoutes from './routes/auth';
import orgRoutes from './routes/orgs';
import memberRoutes from './routes/members';
import projectRoutes from './routes/projects';
import assetRoutes from './routes/assets';
import publishRoutes from './routes/publish';
import templatesRoutes from './routes/templates';
import aiRoutes from './routes/ai';
import stripeRoutes from './routes/stripe';
import cmsRoutes from './routes/cms';
import hostingRoutes from './routes/hosting';
import blogPostRoutes from './routes/blogPosts';
import savedGenerationRoutes from './routes/savedGenerations';
import clientRoutes from './routes/clients';
import airtableRoutes from './routes/airtable';
import { serveHostedSites } from './middleware/serveHostedSites';

const app = express();
const PORT = process.env.PORT || 5000;

// CORS middleware
// Known production origins are always allowed so CORS doesn't depend on the
// FRONTEND_URL env var being set correctly in every environment. Any localhost
// port is allowed via the regex below, and FRONTEND_URL can add more origins.
const defaultAllowedOrigins = ['https://agent.landscapio.co'];

const allowedOrigins = Array.from(
  new Set([
    ...defaultAllowedOrigins,
    ...(process.env.FRONTEND_URL || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  ])
);

const localhostRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (localhostRegex.test(origin)) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`[CORS] blocked origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
}));

// Stripe webhook needs raw body - must be before express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// JSON body parser for all other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve hosted sites (for local hosting adapter)
app.use(serveHostedSites());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orgs', orgRoutes);
app.use('/api/orgs', memberRoutes);  // /api/orgs/:orgId/members
app.use('/api/orgs', projectRoutes); // /api/orgs/:orgId/projects
app.use('/api/orgs', assetRoutes);   // /api/orgs/:orgId/assets
app.use('/api/orgs', publishRoutes); // /api/orgs/:orgId/publish/:projectId
app.use('/api/orgs', cmsRoutes);     // /api/orgs/:orgId/projects/:projectId/cms/...
app.use('/api/orgs', hostingRoutes); // /api/orgs/:orgId/sites, /api/orgs/:orgId/deployments
app.use('/api/stripe', stripeRoutes); // /api/stripe/...
app.use('/api/templates', templatesRoutes);
app.use('/api/orgs', templatesRoutes); // /api/orgs/:orgId/template-purchases
app.use('/api/orgs', blogPostRoutes); // /api/orgs/:orgId/blog-posts
app.use('/api/orgs', savedGenerationRoutes); // /api/orgs/:orgId/generations
app.use('/api/orgs', clientRoutes); // /api/orgs/:orgId/clients
app.use('/api/ai', aiRoutes);
app.use('/api/airtable', airtableRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 API: http://localhost:${PORT}/api`);
      console.log(`🌐 Frontend: ${process.env.FRONTEND_URL}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;