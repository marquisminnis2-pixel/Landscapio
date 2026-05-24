import { Response } from 'express';
import SavedGeneration from '../models/SavedGeneration';
import { AuthRequest } from '../middleware/auth';

export const saveGeneration = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, toolType, subType, metadata } = req.body;

    if (!title || !content || !toolType) {
      return res.status(400).json({ message: 'Title, content, and toolType are required' });
    }

    const generation = await SavedGeneration.create({
      title,
      content,
      toolType,
      subType,
      metadata,
      orgId: req.orgId,
      createdBy: req.userId,
    });

    res.status(201).json(generation);
  } catch (error) {
    console.error('Save generation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getGenerations = async (req: AuthRequest, res: Response) => {
  try {
    const filter: any = { orgId: req.orgId };
    if (req.query.toolType) {
      filter.toolType = req.query.toolType;
    }
    const generations = await SavedGeneration.find(filter).sort({ updatedAt: -1 });
    res.json(generations);
  } catch (error) {
    console.error('Get generations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getGeneration = async (req: AuthRequest, res: Response) => {
  try {
    const generation = await SavedGeneration.findOne({ _id: req.params.id, orgId: req.orgId });
    if (!generation) return res.status(404).json({ message: 'Generation not found' });
    res.json(generation);
  } catch (error) {
    console.error('Get generation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateGeneration = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, metadata } = req.body;
    const generation = await SavedGeneration.findOneAndUpdate(
      { _id: req.params.id, orgId: req.orgId },
      { title, content, metadata },
      { new: true }
    );
    if (!generation) return res.status(404).json({ message: 'Generation not found' });
    res.json(generation);
  } catch (error) {
    console.error('Update generation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteGeneration = async (req: AuthRequest, res: Response) => {
  try {
    const generation = await SavedGeneration.findOneAndUpdate(
      { _id: req.params.id, orgId: req.orgId },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!generation) return res.status(404).json({ message: 'Generation not found' });
    res.json({ message: 'Generation deleted' });
  } catch (error) {
    console.error('Delete generation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};