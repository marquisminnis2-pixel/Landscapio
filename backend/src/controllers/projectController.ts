import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import Project from '../models/Project';
import AuditLog from '../models/AuditLog';
import { CMSCollection, CMSItem } from '../models/cms.index';
import { AuthRequest } from '../middleware/auth';

/**
 * Get all projects in the current org.
 */
export const getProjects = async (req: AuthRequest, res: Response) => {
  try {
    const projects = await Project.find({ orgId: req.orgId }).sort({ updatedAt: -1 });
    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get a single project by ID, scoped to the current org.
 */
export const getProject = async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      orgId: req.orgId,
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create a new project in the current org.
 */
export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    const { name, elements, rawHtml, templateBasePath } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    if (!req.userId || !req.orgId) {
      return res.status(401).json({ message: 'User and organization context required' });
    }

    const project = new Project({
      name,
      orgId: req.orgId,
      createdBy: req.userId,
      elements: elements || [],
      rawHtml,
      templateBasePath,
    });

    await project.save();

    // Auto-seed CMS data if the template has a cms-seed.json
    if (templateBasePath) {
      try {
        const frontendPublic = path.resolve(__dirname, '../../../frontend/public');
        const seedPath = path.join(frontendPublic, templateBasePath, 'cms-seed.json');
        if (fs.existsSync(seedPath)) {
          const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
          for (const colSeed of seedData.collections || []) {
            const collection = await CMSCollection.create({
              orgId: req.orgId,
              projectId: project._id,
              name: colSeed.name,
              slug: colSeed.slug,
              description: colSeed.description || '',
              primaryField: colSeed.primaryField || 'name',
              createdBy: req.userId,
            });
            for (const itemSeed of colSeed.items || []) {
              await CMSItem.create({
                orgId: req.orgId,
                projectId: project._id,
                collectionId: collection._id,
                slug: itemSeed.slug,
                status: itemSeed.status || 'published',
                fieldData: itemSeed.fieldData || {},
                createdBy: req.userId,
                updatedBy: req.userId,
              });
            }
            console.log(`[CMS Seed] Created collection "${colSeed.name}" with ${colSeed.items?.length || 0} items for project ${project._id}`);
          }
        }
      } catch (seedErr: any) {
        console.warn('[CMS Seed] Failed to seed CMS data:', seedErr.message);
      }
    }

    await AuditLog.create({
      orgId: req.orgId,
      userId: req.userId,
      action: 'project:create',
      targetType: 'Project',
      targetId: project._id,
    });

    res.status(201).json(project);
  } catch (error: any) {
    console.error('Create project error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * Update a project, scoped to the current org.
 */
export const updateProject = async (req: AuthRequest, res: Response) => {
  try {
    const { name, elements, rawHtml, templateBasePath } = req.body;

    const updateData: any = { name, elements };
    if (rawHtml !== undefined) updateData.rawHtml = rawHtml;
    if (templateBasePath !== undefined) updateData.templateBasePath = templateBasePath;

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, orgId: req.orgId },
      updateData,
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Soft-delete a project, scoped to the current org.
 */
export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, orgId: req.orgId },
      { $set: { deletedAt: new Date() } },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await AuditLog.create({
      orgId: req.orgId,
      userId: req.userId,
      action: 'project:delete',
      targetType: 'Project',
      targetId: project._id,
    });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};