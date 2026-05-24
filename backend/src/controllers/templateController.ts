import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { v4 as uuidv4 } from 'uuid';
import { ensureLocalTemplatesDir, isS3Enabled, uploadFileToS3 } from '../config/storage';
import generateThumbnail from '../utils/thumbnailGenerator';
import { TemplatePurchase } from '../models/TemplatePurchase';
import { Template } from '../models/Template';

export const importTemplate = async (req: Request, res: Response) => {
  try {
    // Expect multer memoryStorage -> file.buffer
    const file = (req as any).file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    const originalName = file.originalname;
    const id = uuidv4();
    const templatesDir = ensureLocalTemplatesDir();
    const destZipPath = path.join(templatesDir, `${id}-${originalName}`);

    // Save uploaded buffer to disk
    fs.writeFileSync(destZipPath, file.buffer);

    // Basic size validation
    const maxZipSize = 250 * 1024 * 1024; // 250MB
    if (file.size > maxZipSize) {
      return res.status(400).json({ message: 'ZIP exceeds maximum allowed size (250MB)' });
    }

    // Extract ZIP to a unique directory
    const extractDir = path.join(templatesDir, id);
    if (!fs.existsSync(extractDir)) fs.mkdirSync(extractDir, { recursive: true });
    const zip = new AdmZip(destZipPath);

    // Sanitize entries: reject suspicious filenames
    const forbiddenPatterns = [/\.env$/i, /\.php$/i, /\.exe$/i, /node_modules/i, /package-lock\.json/i];
    const entries = zip.getEntries();
    for (const entry of entries) {
      const name = entry.entryName;
      if (forbiddenPatterns.some((r) => r.test(name))) {
        return res.status(400).json({ message: `ZIP contains forbidden file: ${name}` });
      }
    }

    zip.extractAllTo(extractDir, true);

    // Build a minimal manifest
    const files = fs.readdirSync(extractDir);
    const manifest: {
      id: string;
      name: string;
      tags: string[];
      files: string[];
      uploadedAt: string;
      thumbnail?: string;
    } = {
      id,
      name: req.body?.name || originalName.replace(/\.zip$/i, ''),
      tags: (req.body?.tags || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      files,
      uploadedAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(extractDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    // Try to generate a thumbnail from index.html if present
    try {
      const indexCandidates = ['index.html', 'public/index.html', 'dist/index.html'];
      const found = indexCandidates.map((p) => path.join(extractDir, p)).find((p) => fs.existsSync(p));
      if (found) {
        const thumbPath = await generateThumbnail(id);
        manifest.thumbnail = `/uploads/templates/${id}/thumbnail.png`;
        // move thumbnail into template folder if generator saved elsewhere
        const savedThumb = path.join(extractDir, 'thumbnail.png');
        if (fs.existsSync(thumbPath) && thumbPath !== savedThumb) {
          try { fs.copyFileSync(thumbPath, savedThumb); } catch {}
        }
        fs.writeFileSync(path.join(extractDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
      }
    } catch (thumbErr) {
      console.warn('Thumbnail generation failed', thumbErr);
    }

    // Optionally upload ZIP to S3-like storage
    let s3Url: string | null = null;
    if (isS3Enabled()) {
      const key = `templates/${id}/${path.basename(destZipPath)}`;
      s3Url = await uploadFileToS3(destZipPath, key, 'application/zip');
    }

    return res.json({ message: 'Template imported', id, manifest, s3Url });
  } catch (err: any) {
    console.error('Import error', err);
    return res.status(500).json({ message: err.message || 'Import failed' });
  }
};

export const listTemplates = async (_req: Request, res: Response) => {
  try {
    const templates = await Template.find().sort({ publishedAt: -1 }).lean();
    res.json({ templates });
  } catch (err: any) {
    console.error('List templates error:', err);
    res.status(500).json({ message: 'Failed to fetch templates' });
  }
};

export const recordTemplatePurchase = async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const { templateId, title, description, category, style, previewImage, templateUrl, hasJavaScript } = req.body;

    if (!templateId || !title) {
      return res.status(400).json({ message: 'templateId and title are required' });
    }

    const purchase = await TemplatePurchase.findOneAndUpdate(
      { orgId, templateId },
      { orgId, templateId, title, description, category, style, previewImage, templateUrl, hasJavaScript, purchasedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({ success: true, purchase });
  } catch (err: any) {
    console.error('Record purchase error:', err);
    return res.status(500).json({ message: err.message || 'Failed to record purchase' });
  }
};

export const getTemplatePurchases = async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const purchases = await TemplatePurchase.find({ orgId }).sort({ purchasedAt: -1 });
    return res.json({ purchases });
  } catch (err: any) {
    console.error('Get purchases error:', err);
    return res.status(500).json({ message: err.message || 'Failed to fetch purchases' });
  }
};

export const publishTemplate = async (req: Request, res: Response) => {
  try {
    const { title, description, category, style, html, css } = req.body;

    if (!title || !description || !html) {
      return res.status(400).json({ message: 'Missing required fields: title, description, html' });
    }

    const template = await Template.create({
      title: title.trim(),
      description: description.trim(),
      category: category || 'All',
      style: style || 'Modern',
      htmlContent: html,
      publishedAt: new Date(),
    });

    return res.status(201).json({
      message: 'Template published successfully',
      template,
    });
  } catch (err: any) {
    console.error('Publish template error:', err);
    return res.status(500).json({ message: err.message || 'Failed to publish template' });
  }
};
