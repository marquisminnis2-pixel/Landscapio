import mongoose, { Document, Schema } from 'mongoose';

export interface IAsset extends Document {
  orgId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  filename: string;
  url: string;
  type: 'image' | 'video' | 'font';
  size: number;
  uploadedAt: Date;
}

const assetSchema = new Schema<IAsset>({
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
  },
  filename: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['image', 'video', 'font'],
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for org-scoped queries
assetSchema.index({ orgId: 1, projectId: 1 });

export default mongoose.model<IAsset>('Asset', assetSchema);