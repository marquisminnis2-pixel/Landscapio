import { Response } from 'express';
import mongoose from 'mongoose';
import CMSCollection, { ICMSCollection } from '../models/CMSCollection';
import CMSField, { ICMSField, CMSFieldType } from '../models/CMSField';
import CMSItem, { ICMSItem, CMSItemStatus } from '../models/CMSItem';
import AuditLog from '../models/AuditLog';
import { AuthRequest } from '../middleware/auth';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a URL-friendly slug from a string
 */
const generateSlug = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
};

/**
 * Generate a unique slug for collection or item
 */
const generateUniqueSlug = async (
  baseSlug: string,
  model: 'collection' | 'item',
  scopeField: string,
  scopeId: mongoose.Types.ObjectId,
  excludeId?: mongoose.Types.ObjectId
): Promise<string> => {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query: any = { [scopeField]: scopeId, slug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const existing = model === 'collection'
      ? await CMSCollection.findOne(query)
      : await CMSItem.findOne(query);
    if (!existing) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

/**
 * Validate required fields in an item
 */
const validateRequiredFields = (
  fields: ICMSField[],
  fieldData: Record<string, any>
): string[] => {
  const errors: string[] = [];

  for (const field of fields) {
    if (field.required) {
      const value = fieldData[field.slug];
      if (value === undefined || value === null || value === '') {
        errors.push(`Field "${field.name}" is required`);
      }
    }
  }

  return errors;
};

/**
 * Validate reference fields point to existing items
 */
const validateReferences = async (
  fields: ICMSField[],
  fieldData: Record<string, any>,
  projectId: mongoose.Types.ObjectId
): Promise<string[]> => {
  const errors: string[] = [];

  for (const field of fields) {
    if (field.type === 'reference' && fieldData[field.slug]) {
      const refItemId = fieldData[field.slug];
      const refItem = await CMSItem.findOne({ _id: refItemId, projectId });
      if (!refItem) {
        errors.push(`Reference in "${field.name}" points to non-existent item`);
      }
    }

    if (field.type === 'multiReference' && Array.isArray(fieldData[field.slug])) {
      for (const refItemId of fieldData[field.slug]) {
        const refItem = await CMSItem.findOne({ _id: refItemId, projectId });
        if (!refItem) {
          errors.push(`Reference in "${field.name}" points to non-existent item: ${refItemId}`);
        }
      }
    }
  }

  return errors;
};

// ============================================
// COLLECTION CONTROLLERS
// ============================================

/**
 * GET /api/orgs/:orgId/projects/:projectId/cms/collections
 * List all collections for a project
 */
export const getCollections = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const orgId = req.orgId;

    const collections = await CMSCollection.find({
      orgId,
      projectId,
    }).sort({ createdAt: -1 });

    // Get field counts for each collection
    const collectionsWithCounts = await Promise.all(
      collections.map(async (collection) => {
        const fieldCount = await CMSField.countDocuments({ collectionId: collection._id });
        const itemCount = await CMSItem.countDocuments({ collectionId: collection._id });
        return {
          ...collection.toObject(),
          fieldCount,
          itemCount,
        };
      })
    );

    res.json(collectionsWithCounts);
  } catch (error) {
    console.error('Get collections error:', error);
    res.status(500).json({ message: 'Server error fetching collections' });
  }
};

/**
 * GET /api/orgs/:orgId/projects/:projectId/cms/collections/:collectionId
 * Get a single collection with its fields
 */
export const getCollection = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, collectionId } = req.params;
    const orgId = req.orgId;

    const collection = await CMSCollection.findOne({
      _id: collectionId,
      orgId,
      projectId,
    });

    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    const fields = await CMSField.find({ collectionId: collection._id }).sort({ order: 1 });
    const itemCount = await CMSItem.countDocuments({ collectionId: collection._id });

    res.json({
      ...collection.toObject(),
      fields,
      itemCount,
    });
  } catch (error) {
    console.error('Get collection error:', error);
    res.status(500).json({ message: 'Server error fetching collection' });
  }
};

/**
 * POST /api/orgs/:orgId/projects/:projectId/cms/collections
 * Create a new collection
 */
export const createCollection = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const orgId = req.orgId;
    const userId = req.userId;
    const { name, description, fields: initialFields } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ message: 'Collection name is required' });
    }

    // Generate unique slug
    const baseSlug = generateSlug(name);
    const slug = await generateUniqueSlug(
      baseSlug,
      'collection',
      'projectId',
      new mongoose.Types.ObjectId(projectId)
    );

    // Create collection
    const collection = await CMSCollection.create({
      orgId,
      projectId,
      name: name.trim(),
      slug,
      description: description?.trim(),
      createdBy: userId,
    });

    // Create default fields if not provided
    const fieldsToCreate = initialFields && initialFields.length > 0
      ? initialFields
      : [
          { name: 'Name', slug: 'name', type: 'text', required: true, order: 0 },
          { name: 'Slug', slug: 'slug', type: 'slug', required: true, order: 1, settings: { sourceField: 'name' } },
        ];

    const createdFields = await Promise.all(
      fieldsToCreate.map((field: any, index: number) =>
        CMSField.create({
          collectionId: collection._id,
          name: field.name,
          slug: field.slug || generateSlug(field.name),
          type: field.type || 'text',
          required: field.required || false,
          helpText: field.helpText,
          placeholder: field.placeholder,
          defaultValue: field.defaultValue,
          settings: field.settings || {},
          order: field.order ?? index,
        })
      )
    );

    // Audit log
    await AuditLog.create({
      orgId,
      userId,
      action: 'cms:collection:create',
      targetType: 'CMSCollection',
      targetId: collection._id,
      metadata: { name: collection.name, slug: collection.slug },
    });

    res.status(201).json({
      ...collection.toObject(),
      fields: createdFields,
    });
  } catch (error) {
    console.error('Create collection error:', error);
    res.status(500).json({ message: 'Server error creating collection' });
  }
};

/**
 * PUT /api/orgs/:orgId/projects/:projectId/cms/collections/:collectionId
 * Update a collection
 */
export const updateCollection = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, collectionId } = req.params;
    const orgId = req.orgId;
    const userId = req.userId;
    const { name, description, primaryField, enableDrafts, enableScheduling, defaultSortField, defaultSortDirection } = req.body;

    const collection = await CMSCollection.findOne({
      _id: collectionId,
      orgId,
      projectId,
    });

    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    // Update fields
    if (name) collection.name = name.trim();
    if (description !== undefined) collection.description = description?.trim();
    if (primaryField) collection.primaryField = primaryField;
    if (enableDrafts !== undefined) collection.enableDrafts = enableDrafts;
    if (enableScheduling !== undefined) collection.enableScheduling = enableScheduling;
    if (defaultSortField) collection.defaultSortField = defaultSortField;
    if (defaultSortDirection) collection.defaultSortDirection = defaultSortDirection;

    await collection.save();

    // Audit log
    await AuditLog.create({
      orgId,
      userId,
      action: 'cms:collection:update',
      targetType: 'CMSCollection',
      targetId: collection._id,
      metadata: { name: collection.name },
    });

    res.json(collection);
  } catch (error) {
    console.error('Update collection error:', error);
    res.status(500).json({ message: 'Server error updating collection' });
  }
};

/**
 * DELETE /api/orgs/:orgId/projects/:projectId/cms/collections/:collectionId
 * Delete a collection and all its fields and items
 */
export const deleteCollection = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, collectionId } = req.params;
    const orgId = req.orgId;
    const userId = req.userId;

    const collection = await CMSCollection.findOne({
      _id: collectionId,
      orgId,
      projectId,
    });

    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    // Soft delete collection
    collection.deletedAt = new Date();
    await collection.save();

    // Soft delete all fields
    await CMSField.updateMany(
      { collectionId: collection._id },
      { $set: { deletedAt: new Date() } }
    );

    // Soft delete all items
    await CMSItem.updateMany(
      { collectionId: collection._id },
      { $set: { deletedAt: new Date() } }
    );

    // Audit log
    await AuditLog.create({
      orgId,
      userId,
      action: 'cms:collection:delete',
      targetType: 'CMSCollection',
      targetId: collection._id,
      metadata: { name: collection.name },
    });

    res.json({ message: 'Collection deleted successfully' });
  } catch (error) {
    console.error('Delete collection error:', error);
    res.status(500).json({ message: 'Server error deleting collection' });
  }
};

// ============================================
// FIELD CONTROLLERS
// ============================================

/**
 * GET /api/orgs/:orgId/projects/:projectId/cms/collections/:collectionId/fields
 * List all fields for a collection
 */
export const getFields = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, collectionId } = req.params;
    const orgId = req.orgId;

    // Verify collection exists and belongs to org/project
    const collection = await CMSCollection.findOne({
      _id: collectionId,
      orgId,
      projectId,
    });

    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    const fields = await CMSField.find({ collectionId }).sort({ order: 1 });
    res.json(fields);
  } catch (error) {
    console.error('Get fields error:', error);
    res.status(500).json({ message: 'Server error fetching fields' });
  }
};

/**
 * POST /api/orgs/:orgId/projects/:projectId/cms/collections/:collectionId/fields
 * Create a new field
 */
export const createField = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, collectionId } = req.params;
    const orgId = req.orgId;
    const userId = req.userId;
    const { name, type, required, helpText, placeholder, defaultValue, settings } = req.body;

    // Verify collection exists
    const collection = await CMSCollection.findOne({
      _id: collectionId,
      orgId,
      projectId,
    });

    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: 'Field name is required' });
    }

    const validTypes: CMSFieldType[] = [
      'text', 'richText', 'number', 'boolean', 'date', 'datetime',
      'imageUrl', 'url', 'email', 'phone', 'color', 'select',
      'multiSelect', 'slug', 'reference', 'multiReference'
    ];

    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ message: `Invalid field type. Must be one of: ${validTypes.join(', ')}` });
    }

    // Generate unique slug
    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    let counter = 1;
    while (await CMSField.findOne({ collectionId, slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Get max order
    const maxOrderField = await CMSField.findOne({ collectionId }).sort({ order: -1 });
    const order = (maxOrderField?.order ?? -1) + 1;

    const field = await CMSField.create({
      collectionId,
      name: name.trim(),
      slug,
      type,
      required: required || false,
      helpText: helpText?.trim(),
      placeholder: placeholder?.trim(),
      defaultValue,
      settings: settings || {},
      order,
    });

    // Audit log
    await AuditLog.create({
      orgId,
      userId,
      action: 'cms:field:create',
      targetType: 'CMSField',
      targetId: field._id,
      metadata: { name: field.name, type: field.type, collectionId },
    });

    res.status(201).json(field);
  } catch (error) {
    console.error('Create field error:', error);
    res.status(500).json({ message: 'Server error creating field' });
  }
};

/**
 * PUT /api/orgs/:orgId/projects/:projectId/cms/fields/:fieldId
 * Update a field
 */
export const updateField = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, fieldId } = req.params;
    const orgId = req.orgId;
    const userId = req.userId;
    const { name, required, helpText, placeholder, defaultValue, settings, order } = req.body;

    const field = await CMSField.findOne({ _id: fieldId });

    if (!field) {
      return res.status(404).json({ message: 'Field not found' });
    }

    // Verify the field's collection belongs to this org/project
    const collection = await CMSCollection.findOne({
      _id: field.collectionId,
      orgId,
      projectId,
    });

    if (!collection) {
      return res.status(404).json({ message: 'Field not found in this project' });
    }

    // Update fields (type cannot be changed)
    if (name) field.name = name.trim();
    if (required !== undefined) field.required = required;
    if (helpText !== undefined) field.helpText = helpText?.trim();
    if (placeholder !== undefined) field.placeholder = placeholder?.trim();
    if (defaultValue !== undefined) field.defaultValue = defaultValue;
    if (settings !== undefined) field.settings = { ...field.settings, ...settings };
    if (order !== undefined) field.order = order;

    await field.save();

    // Audit log
    await AuditLog.create({
      orgId,
      userId,
      action: 'cms:field:update',
      targetType: 'CMSField',
      targetId: field._id,
      metadata: { name: field.name },
    });

    res.json(field);
  } catch (error) {
    console.error('Update field error:', error);
    res.status(500).json({ message: 'Server error updating field' });
  }
};

/**
 * DELETE /api/orgs/:orgId/projects/:projectId/cms/fields/:fieldId
 * Delete a field
 */
export const deleteField = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, fieldId } = req.params;
    const orgId = req.orgId;
    const userId = req.userId;

    const field = await CMSField.findOne({ _id: fieldId });

    if (!field) {
      return res.status(404).json({ message: 'Field not found' });
    }

    // Verify the field's collection belongs to this org/project
    const collection = await CMSCollection.findOne({
      _id: field.collectionId,
      orgId,
      projectId,
    });

    if (!collection) {
      return res.status(404).json({ message: 'Field not found in this project' });
    }

    // Soft delete
    field.deletedAt = new Date();
    await field.save();

    // Reorder remaining fields
    const remainingFields = await CMSField.find({ collectionId: field.collectionId }).sort({ order: 1 });
    for (let i = 0; i < remainingFields.length; i++) {
      remainingFields[i].order = i;
      await remainingFields[i].save();
    }

    // Audit log
    await AuditLog.create({
      orgId,
      userId,
      action: 'cms:field:delete',
      targetType: 'CMSField',
      targetId: field._id,
      metadata: { name: field.name, collectionId: field.collectionId },
    });

    res.json({ message: 'Field deleted successfully' });
  } catch (error) {
    console.error('Delete field error:', error);
    res.status(500).json({ message: 'Server error deleting field' });
  }
};

/**
 * PUT /api/orgs/:orgId/projects/:projectId/cms/collections/:collectionId/fields/reorder
 * Reorder fields
 */
export const reorderFields = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, collectionId } = req.params;
    const orgId = req.orgId;
    const { fieldIds } = req.body;

    // Verify collection exists
    const collection = await CMSCollection.findOne({
      _id: collectionId,
      orgId,
      projectId,
    });

    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    if (!Array.isArray(fieldIds)) {
      return res.status(400).json({ message: 'fieldIds must be an array' });
    }

    // Update order for each field
    for (let i = 0; i < fieldIds.length; i++) {
      await CMSField.updateOne(
        { _id: fieldIds[i], collectionId },
        { $set: { order: i } }
      );
    }

    const fields = await CMSField.find({ collectionId }).sort({ order: 1 });
    res.json(fields);
  } catch (error) {
    console.error('Reorder fields error:', error);
    res.status(500).json({ message: 'Server error reordering fields' });
  }
};

// ============================================
// ITEM CONTROLLERS
// ============================================

/**
 * GET /api/orgs/:orgId/projects/:projectId/cms/collections/:collectionId/items
 * List all items for a collection with pagination and filtering
 */
export const getItems = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, collectionId } = req.params;
    const orgId = req.orgId;
    const { status, search, page = '1', limit = '50', sort = 'updatedAt', order = 'desc' } = req.query;

    // Verify collection exists
    const collection = await CMSCollection.findOne({
      _id: collectionId,
      orgId,
      projectId,
    });

    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    // Build query
    const query: any = { collectionId };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      // Search in primary field
      const primaryField = collection.primaryField || 'name';
      query[`fieldData.${primaryField}`] = { $regex: search, $options: 'i' };
    }

    // Pagination
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100);
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sortDirection = order === 'asc' ? 1 : -1;
    const sortObj: any = {};
    if (sort === 'updatedAt' || sort === 'createdAt' || sort === 'publishedAt') {
      sortObj[sort as string] = sortDirection;
    } else {
      sortObj[`fieldData.${sort}`] = sortDirection;
    }

    const [items, total] = await Promise.all([
      CMSItem.find(query).sort(sortObj).skip(skip).limit(limitNum),
      CMSItem.countDocuments(query),
    ]);

    res.json({
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ message: 'Server error fetching items' });
  }
};

/**
 * GET /api/orgs/:orgId/projects/:projectId/cms/items/:itemId
 * Get a single item
 */
export const getItem = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, itemId } = req.params;
    const orgId = req.orgId;

    const item = await CMSItem.findOne({
      _id: itemId,
      orgId,
      projectId,
    });

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Get collection and fields for context
    const collection = await CMSCollection.findOne({ _id: item.collectionId });
    const fields = await CMSField.find({ collectionId: item.collectionId }).sort({ order: 1 });

    res.json({
      ...item.toObject(),
      collection,
      fields,
    });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ message: 'Server error fetching item' });
  }
};

/**
 * POST /api/orgs/:orgId/projects/:projectId/cms/collections/:collectionId/items
 * Create a new item
 */
export const createItem = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, collectionId } = req.params;
    const orgId = req.orgId;
    const userId = req.userId;
    const { fieldData, status } = req.body;

    // Verify collection exists
    const collection = await CMSCollection.findOne({
      _id: collectionId,
      orgId,
      projectId,
    });

    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    // Get fields
    const fields = await CMSField.find({ collectionId }).sort({ order: 1 });

    // Initialize field data with defaults
    const initialData: Record<string, any> = {};
    for (const field of fields) {
      if (field.defaultValue !== undefined) {
        initialData[field.slug] = field.defaultValue;
      } else if (field.type === 'boolean') {
        initialData[field.slug] = false;
      } else if (field.type === 'number') {
        initialData[field.slug] = 0;
      } else {
        initialData[field.slug] = '';
      }
    }

    const mergedFieldData = { ...initialData, ...fieldData };

    // Auto-generate slug if slug field exists and is empty
    const slugField = fields.find(f => f.type === 'slug');
    if (slugField && !mergedFieldData[slugField.slug]) {
      const sourceField = slugField.settings?.sourceField || 'name';
      const sourceValue = mergedFieldData[sourceField] || 'untitled';
      const baseSlug = generateSlug(sourceValue);
      mergedFieldData[slugField.slug] = await generateUniqueSlug(
        baseSlug,
        'item',
        'collectionId',
        new mongoose.Types.ObjectId(collectionId)
      );
    }

    // Generate item slug from name or slug field
    const itemSlug = mergedFieldData.slug || generateSlug(mergedFieldData.name || 'untitled');
    const uniqueItemSlug = await generateUniqueSlug(
      itemSlug,
      'item',
      'collectionId',
      new mongoose.Types.ObjectId(collectionId)
    );

    const item = await CMSItem.create({
      collectionId,
      orgId,
      projectId,
      slug: uniqueItemSlug,
      status: status || 'draft',
      fieldData: mergedFieldData,
      createdBy: userId,
      updatedBy: userId,
    });

    // Audit log
    await AuditLog.create({
      orgId,
      userId,
      action: 'cms:item:create',
      targetType: 'CMSItem',
      targetId: item._id,
      metadata: { collectionId, slug: item.slug },
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ message: 'Server error creating item' });
  }
};

/**
 * PUT /api/orgs/:orgId/projects/:projectId/cms/items/:itemId
 * Update an item
 */
export const updateItem = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, itemId } = req.params;
    const orgId = req.orgId;
    const userId = req.userId;
    const { fieldData, status } = req.body;

    const item = await CMSItem.findOne({
      _id: itemId,
      orgId,
      projectId,
    });

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Get fields for validation
    const fields = await CMSField.find({ collectionId: item.collectionId }).sort({ order: 1 });

    // Merge field data
    if (fieldData) {
      item.fieldData = { ...item.fieldData, ...fieldData };
    }

    // Update status if provided
    if (status) {
      item.status = status;
      if (status === 'published') {
        item.publishedAt = new Date();
      }
    }

    item.updatedBy = new mongoose.Types.ObjectId(userId);
    await item.save();

    // Audit log
    await AuditLog.create({
      orgId,
      userId,
      action: 'cms:item:update',
      targetType: 'CMSItem',
      targetId: item._id,
      metadata: { collectionId: item.collectionId },
    });

    res.json(item);
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ message: 'Server error updating item' });
  }
};

/**
 * DELETE /api/orgs/:orgId/projects/:projectId/cms/items/:itemId
 * Delete an item
 */
export const deleteItem = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, itemId } = req.params;
    const orgId = req.orgId;
    const userId = req.userId;

    const item = await CMSItem.findOne({
      _id: itemId,
      orgId,
      projectId,
    });

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Soft delete
    item.deletedAt = new Date();
    await item.save();

    // Audit log
    await AuditLog.create({
      orgId,
      userId,
      action: 'cms:item:delete',
      targetType: 'CMSItem',
      targetId: item._id,
      metadata: { collectionId: item.collectionId, slug: item.slug },
    });

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ message: 'Server error deleting item' });
  }
};

/**
 * POST /api/orgs/:orgId/projects/:projectId/cms/items/:itemId/publish
 * Publish an item
 */
export const publishItem = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, itemId } = req.params;
    const orgId = req.orgId;
    const userId = req.userId;

    const item = await CMSItem.findOne({
      _id: itemId,
      orgId,
      projectId,
    });

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Get fields for validation
    const fields = await CMSField.find({ collectionId: item.collectionId });

    // Validate required fields
    const errors = validateRequiredFields(fields, item.fieldData);
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    // Validate references
    const refErrors = await validateReferences(fields, item.fieldData, new mongoose.Types.ObjectId(projectId));
    if (refErrors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors: refErrors });
    }

    // Publish
    item.status = 'published';
    item.publishedAt = new Date();
    item.updatedBy = new mongoose.Types.ObjectId(userId);
    await item.save();

    // Audit log
    await AuditLog.create({
      orgId,
      userId,
      action: 'cms:item:publish',
      targetType: 'CMSItem',
      targetId: item._id,
      metadata: { collectionId: item.collectionId },
    });

    res.json(item);
  } catch (error) {
    console.error('Publish item error:', error);
    res.status(500).json({ message: 'Server error publishing item' });
  }
};

/**
 * POST /api/orgs/:orgId/projects/:projectId/cms/items/:itemId/unpublish
 * Unpublish an item
 */
export const unpublishItem = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, itemId } = req.params;
    const orgId = req.orgId;
    const userId = req.userId;

    const item = await CMSItem.findOne({
      _id: itemId,
      orgId,
      projectId,
    });

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Unpublish
    item.status = 'draft';
    item.publishedAt = undefined;
    item.updatedBy = new mongoose.Types.ObjectId(userId);
    await item.save();

    // Audit log
    await AuditLog.create({
      orgId,
      userId,
      action: 'cms:item:unpublish',
      targetType: 'CMSItem',
      targetId: item._id,
      metadata: { collectionId: item.collectionId },
    });

    res.json(item);
  } catch (error) {
    console.error('Unpublish item error:', error);
    res.status(500).json({ message: 'Server error unpublishing item' });
  }
};

/**
 * POST /api/orgs/:orgId/projects/:projectId/cms/items/:itemId/archive
 * Archive an item
 */
export const archiveItem = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, itemId } = req.params;
    const orgId = req.orgId;
    const userId = req.userId;

    const item = await CMSItem.findOne({
      _id: itemId,
      orgId,
      projectId,
    });

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Archive
    item.status = 'archived';
    item.updatedBy = new mongoose.Types.ObjectId(userId);
    await item.save();

    // Audit log
    await AuditLog.create({
      orgId,
      userId,
      action: 'cms:item:archive',
      targetType: 'CMSItem',
      targetId: item._id,
      metadata: { collectionId: item.collectionId },
    });

    res.json(item);
  } catch (error) {
    console.error('Archive item error:', error);
    res.status(500).json({ message: 'Server error archiving item' });
  }
};