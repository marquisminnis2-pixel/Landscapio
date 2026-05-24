import mongoose, { Document, Schema } from 'mongoose';

export interface ITemplatePurchase extends Document {
  orgId: string;
  templateId: string;
  title: string;
  description: string;
  category: string;
  style: string;
  previewImage: string;
  templateUrl: string;
  hasJavaScript: boolean;
  purchasedAt: Date;
}

const TemplatePurchaseSchema = new Schema<ITemplatePurchase>({
  orgId: { type: String, required: true, index: true },
  templateId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: '' },
  style: { type: String, default: '' },
  previewImage: { type: String, default: '' },
  templateUrl: { type: String, default: '' },
  hasJavaScript: { type: Boolean, default: false },
  purchasedAt: { type: Date, default: Date.now },
});

// Prevent duplicate purchases for the same org + template
TemplatePurchaseSchema.index({ orgId: 1, templateId: 1 }, { unique: true });

export const TemplatePurchase = mongoose.model<ITemplatePurchase>(
  'TemplatePurchase',
  TemplatePurchaseSchema
);
