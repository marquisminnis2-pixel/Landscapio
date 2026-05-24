import mongoose, { Document, Schema } from 'mongoose';

export interface ISavedGeneration extends Document {
  title: string;
  content: string;
  toolType: 'magic-pages' | 'magic-copywriter' | 'magic-content-writing';
  subType?: string;      // e.g. 'location-landing-page', 'magic-emails', etc.
  metadata?: Record<string, any>;  // flexible field for tool-specific data (tone, keywords, word count, etc.)
  orgId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const savedGenerationSchema = new Schema<ISavedGeneration>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    toolType: { type: String, required: true, enum: ['magic-pages', 'magic-copywriter', 'magic-content-writing'] },
    subType: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
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

savedGenerationSchema.index({ orgId: 1, toolType: 1, deletedAt: 1 });

// SAFETY: Prevent queries without orgId scope
savedGenerationSchema.pre('find', function (this: any) {
  const filter = this.getFilter();
  if (!filter.orgId && !filter._id) {
    throw new Error('SECURITY: SavedGeneration query executed without orgId scope');
  }
});

savedGenerationSchema.pre('findOne', function (this: any) {
  const filter = this.getFilter();
  if (!filter.orgId && !filter._id) {
    throw new Error('SECURITY: SavedGeneration findOne executed without orgId scope');
  }
});

// Exclude soft-deleted by default
savedGenerationSchema.pre(/^find/, function (this: any) {
  if (this.getFilter().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
});

export default mongoose.model<ISavedGeneration>('SavedGeneration', savedGenerationSchema);