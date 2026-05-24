import mongoose, { Document, Schema } from 'mongoose';

export interface IBlogPost extends Document {
  title: string;
  content: string;
  topic?: string;
  tone?: string;
  wordCount?: number;
  keywords?: string[];
  orgId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const blogPostSchema = new Schema<IBlogPost>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    topic: { type: String, trim: true },
    tone: { type: String, trim: true },
    wordCount: { type: Number },
    keywords: { type: [String], default: [] },
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
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

blogPostSchema.index({ orgId: 1, deletedAt: 1 });

// SAFETY: Prevent queries without orgId scope
blogPostSchema.pre('find', function (this: any) {
  const filter = this.getFilter();
  if (!filter.orgId && !filter._id) {
    throw new Error('SECURITY: BlogPost query executed without orgId scope');
  }
});

blogPostSchema.pre('findOne', function (this: any) {
  const filter = this.getFilter();
  if (!filter.orgId && !filter._id) {
    throw new Error('SECURITY: BlogPost findOne executed without orgId scope');
  }
});

// Exclude soft-deleted by default
blogPostSchema.pre(/^find/, function (this: any) {
  if (this.getFilter().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
});

export default mongoose.model<IBlogPost>('BlogPost', blogPostSchema);
