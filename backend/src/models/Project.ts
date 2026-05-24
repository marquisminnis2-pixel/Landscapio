import mongoose, { Document, Schema } from 'mongoose';

interface Element {
  id: string;
  type: string;
  name: string;
  children: Element[];
  styles: {
    desktop: Record<string, any>;
    tablet: Record<string, any>;
    mobile: Record<string, any>;
  };
  content?: string;
  attributes?: Record<string, string>;
  locked?: boolean;
  hidden?: boolean;
}

export interface IProject extends Document {
  name: string;
  orgId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  elements: Element[];
  rawHtml?: string; // For template mode - stores the full HTML
  templateBasePath?: string; // For template mode - stores the base path for assets
  templateEntryFile?: string; // For template mode - the entry HTML file (e.g. 'auto-detail.html')
  createdAt: Date;
  updatedAt: Date;
  isPublished: boolean;
  publishedUrl?: string;
  deletedAt?: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    elements: {
      type: Schema.Types.Mixed,
      default: [],
    },
    rawHtml: {
      type: String,
    },
    templateBasePath: {
      type: String,
    },
    templateEntryFile: {
      type: String,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedUrl: {
      type: String,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for org-scoped queries
projectSchema.index({ orgId: 1, deletedAt: 1 });

// SAFETY: Prevent queries without orgId scope
projectSchema.pre('find', function (this: any) {
  const filter = this.getFilter();
  if (!filter.orgId && !filter._id) {
    throw new Error('SECURITY: Project query executed without orgId scope');
  }
});

projectSchema.pre('findOne', function (this: any) {
  const filter = this.getFilter();
  if (!filter.orgId && !filter._id) {
    throw new Error('SECURITY: Project findOne executed without orgId scope');
  }
});

// Exclude soft-deleted projects by default
projectSchema.pre(/^find/, function (this: any) {
  if (this.getFilter().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
});

export default mongoose.model<IProject>('Project', projectSchema);