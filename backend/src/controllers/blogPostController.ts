import { Response } from 'express';
import BlogPost from '../models/BlogPost';
import { AuthRequest } from '../middleware/auth';
import { logBlogToAirtable } from '../services/airtableService';

export const saveBlogPost = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, topic, tone, wordCount, keywords, clientId } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const blogPost = await BlogPost.create({
      title,
      content,
      topic,
      tone,
      wordCount,
      keywords,
      orgId: req.orgId,
      createdBy: req.userId,
    });

    // Auto-log a new row in the client's Blog Tracker (non-blocking — don't delay the response)
    if (clientId) {
      const primaryKeyword = topic || (Array.isArray(keywords) ? keywords[0] : '') || '';
      const [secondaryKeyword1, secondaryKeyword2] = Array.isArray(keywords) ? keywords.slice(1, 3) : [];
      logBlogToAirtable({
        clientId,
        blogTitle: title,
        blogContent: content,
        primaryKeyword,
        secondaryKeyword1,
        secondaryKeyword2,
        status: 'Created',
      }).catch((err) => console.error('Airtable auto-log failed:', err.message));
    }

    res.status(201).json(blogPost);
  } catch (error) {
    console.error('Save blog post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getBlogPosts = async (req: AuthRequest, res: Response) => {
  try {
    const posts = await BlogPost.find({ orgId: req.orgId }).sort({ updatedAt: -1 });
    res.json(posts);
  } catch (error) {
    console.error('Get blog posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getBlogPost = async (req: AuthRequest, res: Response) => {
  try {
    const post = await BlogPost.findOne({ _id: req.params.id, orgId: req.orgId });
    if (!post) return res.status(404).json({ message: 'Blog post not found' });
    res.json(post);
  } catch (error) {
    console.error('Get blog post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateBlogPost = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, topic, tone, wordCount, keywords } = req.body;
    const post = await BlogPost.findOneAndUpdate(
      { _id: req.params.id, orgId: req.orgId },
      { title, content, topic, tone, wordCount, keywords },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: 'Blog post not found' });
    res.json(post);
  } catch (error) {
    console.error('Update blog post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteBlogPost = async (req: AuthRequest, res: Response) => {
  try {
    const post = await BlogPost.findOneAndUpdate(
      { _id: req.params.id, orgId: req.orgId },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: 'Blog post not found' });
    res.json({ message: 'Blog post deleted' });
  } catch (error) {
    console.error('Delete blog post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
