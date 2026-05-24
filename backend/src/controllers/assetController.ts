import { Response } from 'express';
import Asset from '../models/Asset';
import { AuthRequest } from '../middleware/auth';
import { persistUploadedFile } from '../middleware/upload';

/**
 * Upload an asset, scoped to the current org.
 */
export const uploadAsset = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { projectId } = req.body;

    if (!req.orgId) {
      return res.status(400).json({ message: 'Organization context required' });
    }

    // Persist the uploaded file (to S3 or local disk)
    const url = await persistUploadedFile(req.file);

    // Determine file type
    let type: 'image' | 'video' | 'font' | 'file' = 'image';
    if (req.file.mimetype.startsWith('video')) {
      type = 'video';
    } else if (req.file.originalname.match(/\.(woff|woff2|ttf)$/)) {
      type = 'font';
    } else if (!req.file.mimetype.startsWith('image')) {
      type = 'file';
    }

    const asset = new Asset({
      orgId: req.orgId,
      projectId,
      filename: req.file.originalname,
      url,
      type,
      size: req.file.size,
    });

    await asset.save();
    res.status(201).json(asset);
  } catch (error) {
    console.error('Upload asset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get assets for a project, scoped to the current org.
 */
export const getAssets = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const assets = await Asset.find({ orgId: req.orgId, projectId }).sort({ uploadedAt: -1 });
    res.json(assets);
  } catch (error) {
    console.error('Get assets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete an asset, scoped to the current org.
 */
export const deleteAsset = async (req: AuthRequest, res: Response) => {
  try {
    const asset = await Asset.findOneAndDelete({
      _id: req.params.id,
      orgId: req.orgId,
    });

    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    // TODO: Delete physical file from uploads directory or S3

    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Delete asset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};