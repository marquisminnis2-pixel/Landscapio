import mongoose, { Document, Schema } from 'mongoose';

export interface IClient extends Document {
  userId: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  businessName: string;
  industry: string;
  websiteUrl?: string;
  brandVoice?: string;
  targetAudience?: string;
  notes?: string;
  airtableBaseId?: string;
  airtableBlogTrackerTable?: string;
  airtableSocialPostsTable?: string;
  app?: 'genesis' | 'landscapio';
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<IClient>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    businessName: { type: String, required: true, trim: true },
    industry: {
      type: String,
      required: true,
      enum: ['Restaurant', 'Law Firm', 'Gym', 'Real Estate', 'E-commerce', 'Tech', 'Healthcare', 'Landscaping', 'Cleaning', 'HVAC', 'Plumbing', 'Roofing', 'Other'],
    },
    websiteUrl: { type: String, trim: true },
    brandVoice: { type: String },
    targetAudience: { type: String },
    notes: { type: String },
    airtableBaseId: { type: String, trim: true },
    airtableBlogTrackerTable: { type: String, trim: true },
    airtableSocialPostsTable: { type: String, trim: true },
    app: { type: String, enum: ['genesis', 'landscapio'], default: 'landscapio' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

clientSchema.index({ userId: 1, deletedAt: 1 });
clientSchema.index({ orgId: 1, deletedAt: 1 });

// SAFETY: Prevent queries without userId or orgId scope
clientSchema.pre('find', function (this: any) {
  const filter = this.getFilter();
  if (!filter.userId && !filter.orgId && !filter._id) {
    throw new Error('SECURITY: Client query executed without user/org scope');
  }
});

clientSchema.pre('findOne', function (this: any) {
  const filter = this.getFilter();
  if (!filter.userId && !filter.orgId && !filter._id) {
    throw new Error('SECURITY: Client findOne executed without user/org scope');
  }
});

// Exclude soft-deleted by default
clientSchema.pre(/^find/, function (this: any) {
  if (this.getFilter().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
});

export default mongoose.model<IClient>('Client', clientSchema);