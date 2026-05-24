import { Request, Response } from 'express';
import Project from '../models/Project';
import PublishedSite from '../models/PublishedSite';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middleware/auth';
import { generateHTML, generateCSS } from '../utils/generateHTML';

/**
 * Publish a site, scoped to the current org.
 */
export const publishSite = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { subdomain } = req.body;

    if (!req.orgId) {
      return res.status(400).json({ message: 'Organization context required' });
    }

    // Find project scoped to org
    const project = await Project.findOne({ _id: projectId, orgId: req.orgId });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Generate HTML and CSS
    const html = generateHTML(project.elements);
    const css = generateCSS(project.elements);

    // Check if subdomain is available
    const existingSite = await PublishedSite.findOne({ subdomain });
    if (existingSite && existingSite.projectId.toString() !== projectId) {
      return res.status(400).json({ message: 'Subdomain already taken' });
    }

    // Update or create published site
    const publishedSite = await PublishedSite.findOneAndUpdate(
      { projectId },
      {
        orgId: req.orgId,
        projectId,
        subdomain,
        html,
        css,
        publishedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Update project
    project.isPublished = true;
    project.publishedUrl = `${subdomain}.genesis-builder.com`;
    await project.save();

    await AuditLog.create({
      orgId: req.orgId,
      userId: req.userId,
      action: 'project:publish',
      targetType: 'PublishedSite',
      targetId: publishedSite._id,
      metadata: { subdomain, projectId },
    });

    res.json({
      message: 'Site published successfully',
      url: project.publishedUrl,
      publishedSite,
    });
  } catch (error) {
    console.error('Publish error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get a published site by subdomain (public endpoint — no auth).
 */
export const getPublishedSite = async (req: Request, res: Response) => {
  try {
    const { subdomain } = req.params;

    const site = await PublishedSite.findOne({ subdomain });
    if (!site) {
      return res.status(404).send('<h1>Site not found</h1>');
    }

    // Serve the published HTML
    res.send(site.html);
  } catch (error) {
    console.error('Get published site error:', error);
    res.status(500).send('<h1>Server error</h1>');
  }
};