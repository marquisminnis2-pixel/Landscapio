import mongoose, { Document, Schema, Model, Query } from 'mongoose';

export interface ICMSCollection extends Document {
  orgId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  // Settings
  primaryField: string; // slug of the field used as display name
  enableDrafts: boolean;
  enableScheduling: boolean;
  defaultSortField: string;
  defaultSortDirection: 'asc' | 'desc';
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
}

const CMSCollectionSchema = new Schema<ICMSCollection>(
  {
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
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    primaryField: {
      type: String,
      default: 'name',
    },
    enableDrafts: {
      type: Boolean,
      default: true,
    },
    enableScheduling: {
      type: Boolean,
      default: false,
    },
    defaultSortField: {
      type: String,
      default: 'updatedAt',
    },
    defaultSortDirection: {
      type: String,
      enum: ['asc', 'desc'],
      default: 'desc',
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
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
CMSCollectionSchema.index({ orgId: 1, projectId: 1, deletedAt: 1 });
CMSCollectionSchema.index({ projectId: 1, slug: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

// Pre-query hook: Exclude soft-deleted collections
CMSCollectionSchema.pre(/^find/, function (this: Query<any, ICMSCollection>, next) {
  const query = this.getQuery();
  if (query.deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

// Pre-query hook: Require orgId or _id for security
CMSCollectionSchema.pre('find', function (this: Query<any, ICMSCollection>, next) {
  const query = this.getQuery();
  if (!query.orgId && !query._id && !query.projectId) {
    return next(new Error('CMSCollection query must include orgId, projectId, or _id'));
  }
  next();
});

CMSCollectionSchema.pre('findOne', function (this: Query<any, ICMSCollection>, next) {
  const query = this.getQuery();
  if (!query.orgId && !query._id && !query.projectId) {
    return next(new Error('CMSCollection query must include orgId, projectId, or _id'));
  }
  next();
});

const CMSCollection: Model<ICMSCollection> = mongoose.model<ICMSCollection>('CMSCollection', CMSCollectionSchema);

export default CMSCollection;