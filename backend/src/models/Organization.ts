import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  slug: string;
  ownerId: mongoose.Types.ObjectId;
  plan: 'free';
  billingPeriod: 'monthly' | 'yearly';
  subscription: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    status: 'active' | 'cancelled' | 'past_due' | 'trialing';
    currentPeriodEnd?: Date;
  };
  limits: {
    maxSites: number;
    maxCollaborators: number;
    storageGB: number;
    monthlyVisitors: number;
  };
  deletedAt?: Date;
  createdAt: Date;
}

const organizationSchema = new Schema<IOrganization>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  plan: {
    type: String,
    enum: ['free'],
    default: 'free',
  },
  billingPeriod: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly',
  },
  subscription: {
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    status: {
      type: String,
      enum: ['active', 'cancelled', 'past_due', 'trialing'],
      default: 'active',
    },
    currentPeriodEnd: Date,
  },
  limits: {
    maxSites: { type: Number, default: 2 },
    maxCollaborators: { type: Number, default: 1 },
    storageGB: { type: Number, default: 1 },
    monthlyVisitors: { type: Number, default: 1000 },
  },
  deletedAt: { type: Date, default: null },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Exclude soft-deleted orgs from all find queries
organizationSchema.pre(/^find/, function (this: any) {
  if (this.getFilter().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
});

// Index for owner lookups (slug already has unique: true which creates an index)
organizationSchema.index({ ownerId: 1 });

export default mongoose.model<IOrganization>('Organization', organizationSchema);