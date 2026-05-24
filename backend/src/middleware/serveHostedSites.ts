import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';

/**
 * Middleware to serve hosted sites from the local file system.
 * Routes: /sites/:subdomain/* -> hosted-sites/:subdomain/current/*
 */
export const serveHostedSites = () => {
  const baseDir = process.env.LOCAL_HOSTING_DIR || path.join(__dirname, '../../hosted-sites');

  return (req: Request, res: Response, next: NextFunction) => {
    // Extract subdomain and file path from URL
    // URL format: /sites/:subdomain/path or /sites/:subdomain/v:version/path
    const match = req.path.match(/^\/sites\/([a-z0-9-]+)(\/v(\d+))?(\/.*)?$/);

    if (!match) {
      return next();
    }

    const [, subdomain, , version, filePath] = match;
    const requestedPath = filePath || '/index.html';

    // Determine which directory to serve from
    let serveDir: string;
    if (version) {
      // Specific version requested
      serveDir = path.join(baseDir, subdomain, `v${version}`);
    } else {
      // Serve from "current" symlink (production)
      serveDir = path.join(baseDir, subdomain, 'current');
    }

    // Resolve the full file path
    let fullPath = path.join(serveDir, requestedPath);

    // Security: Prevent directory traversal
    if (!fullPath.startsWith(baseDir)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      // Try index.html for directory requests
      if (!path.extname(fullPath)) {
        fullPath = path.join(fullPath, 'index.html');
      }

      if (!fs.existsSync(fullPath)) {
        // Serve 404 page if it exists, otherwise return JSON error
        const custom404 = path.join(serveDir, '404.html');
        if (fs.existsSync(custom404)) {
          return res.status(404).sendFile(custom404);
        }
        return res.status(404).json({ message: 'Page not found' });
      }
    }

    // Determine content type
    const ext = path.extname(fullPath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.ico': 'image/x-icon',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Set caching headers
    if (version) {
      // Versioned URLs can be cached indefinitely
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      // Production URLs should revalidate
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    }

    res.setHeader('Content-Type', contentType);
    res.sendFile(fullPath);
  };
};