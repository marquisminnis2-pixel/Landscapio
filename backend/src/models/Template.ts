import mongoose, { Document, Schema } from 'mongoose';

export interface ITemplate extends Document {
  title: string;
  description: string;
  category: string;
  style: string;
  htmlContent: string;
  previewImage?: string;
  publishedAt: Date;
}

const TemplateSchema = new Schema<ITemplate>({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'All' },
  style: { type: String, default: 'Modern' },
  htmlContent: { type: String, required: true },
  previewImage: { type: String, default: '' },
  publishedAt: { type: Date, default: Date.now },
});

export const Template = mongoose.model<ITemplate>('Template', TemplateSchema);
