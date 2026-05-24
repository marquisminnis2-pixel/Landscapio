import mongoose, { Document, Schema } from 'mongoose';

export interface IPublishedSite extends Document {
  orgId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  subdomain: string;
  html: string;
  css: string;
  publishedAt: Date;
}

const publishedSiteSchema = new Schema<IPublishedSite>({
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
    unique: true,
  },
  subdomain: {
    type: String,
    required: true,
    unique: true,
  },
  html: {
    type: String,
    required: true,
  },
  css: {
    type: String,
    required: true,
  },
  publishedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IPublishedSite>('PublishedSite', publishedSiteSchema);