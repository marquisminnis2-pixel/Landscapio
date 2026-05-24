import mongoose, { Document, Schema, Model, Query } from 'mongoose';

export type CMSItemStatus = 'draft' | 'published' | 'scheduled' | 'archived';

export interface ICMSItem extends Document {
  collectionId: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId; // Denormalized for efficient queries
  projectId: mongoose.Types.ObjectId; // Denormalized for efficient queries
  slug: string;
  status: CMSItemStatus;
  // All field values stored as a document for efficient retrieval
  fieldData: Record<string, any>;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  scheduledFor?: Date;
  deletedAt?: Date;
  // Author tracking
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
}

const CMSItemSchema = new Schema<ICMSItem>(
  {
    collectionId: {
      type: Schema.Types.ObjectId,
      ref: 'CMSCollection',
      required: true,
      index: true,
    },
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 200,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'scheduled', 'archived'],
      default: 'draft',
    },
    fieldData: {
      type: Schema.Types.Mixed,
      default: {},
    },
    publishedAt: {
      type: Date,
    },
    scheduledFor: {
      type: Date,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
CMSItemSchema.index({ orgId: 1, projectId: 1, deletedAt: 1 });
CMSItemSchema.index({ collectionId: 1, status: 1, deletedAt: 1 });
CMSItemSchema.index({ collectionId: 1, slug: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

// Text search index for fieldData
CMSItemSchema.index({ 'fieldData.name': 'text', 'fieldData.title': 'text' });

// Pre-query hook: Exclude soft-deleted items
CMSItemSchema.pre(/^find/, function (this: Query<any, ICMSItem>, next) {
  const query = this.getQuery();
  if (query.deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

// Pre-query hook: Require collectionId, orgId, or _id for security
CMSItemSchema.pre('find', function (this: Query<any, ICMSItem>, next) {
  const query = this.getQuery();
  if (!query.collectionId && !query.orgId && !query._id && !query.projectId) {
    return next(new Error('CMSItem query must include collectionId, orgId, projectId, or _id'));
  }
  next();
});

CMSItemSchema.pre('findOne', function (this: Query<any, ICMSItem>, next) {
  const query = this.getQuery();
  if (!query.collectionId && !query.orgId && !query._id && !query.projectId) {
    return next(new Error('CMSItem query must include collectionId, orgId, projectId, or _id'));
  }
  next();
});

const CMSItem: Model<ICMSItem> = mongoose.model<ICMSItem>('CMSItem', CMSItemSchema);

export default CMSItem;