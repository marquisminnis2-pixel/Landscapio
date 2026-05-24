import mongoose, { Document, Schema } from 'mongoose';

export type PlanTier = 'free';

export interface IPlanLimits {
  maxSites: number;
  maxDeploymentsPerDay: number;
  maxStorageMB: number;
  maxBandwidthGB: number;
  maxCustomDomains: number;
  maxTeamMembers: number;
  retentionDays: number;
  features: {
    customDomains: boolean;
    ssl: boolean;
    analytics: boolean;
    passwordProtection: boolean;
    customHeaders: boolean;
    redirects: boolean;
    formSubmissions: boolean;
  };
}

export interface IEntitlement extends Document {
  orgId: mongoose.Types.ObjectId;
  plan: PlanTier;
  limits: IPlanLimits;
  usage: {
    sitesCount: number;
    deploymentsToday: number;
    deploymentsLastReset: Date;
    storageUsedMB: number;
    bandwidthUsedGB: number;
    bandwidthLastReset: Date;
    customDomainsCount: number;
  };
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'trialing' | 'none';
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  isCustom: boolean;
  customLimits?: Partial<IPlanLimits>;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  getEffectiveLimits(): IPlanLimits;
  canCreateSite(): boolean;
  canDeploy(): boolean;
  canAddCustomDomain(): boolean;
}

export const PLAN_LIMITS: Record<PlanTier, IPlanLimits> = {
  free: {
    maxSites: 1,
    maxDeploymentsPerDay: 5,
    maxStorageMB: 100,
    maxBandwidthGB: 1,
    maxCustomDomains: 0,
    maxTeamMembers: 1,
    retentionDays: 7,
    features: {
      customDomains: false,
      ssl: true,
      analytics: false,
      passwordProtection: false,
      customHeaders: false,
      redirects: false,
      formSubmissions: false,
    },
  },
};

const planLimitsSchema = new Schema<IPlanLimits>(
  {
    maxSites: { type: Number, required: true },
    maxDeploymentsPerDay: { type: Number, required: true },
    maxStorageMB: { type: Number, required: true },
    maxBandwidthGB: { type: Number, required: true },
    maxCustomDomains: { type: Number, required: true },
    maxTeamMembers: { type: Number, required: true },
    retentionDays: { type: Number, required: true },
    features: {
      customDomains: { type: Boolean, default: false },
      ssl: { type: Boolean, default: true },
      analytics: { type: Boolean, default: false },
      passwordProtection: { type: Boolean, default: false },
      customHeaders: { type: Boolean, default: false },
      redirects: { type: Boolean, default: false },
      formSubmissions: { type: Boolean, default: false },
    },
  },
  { _id: false }
);

const entitlementSchema = new Schema<IEntitlement>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['free'],
      default: 'free',
      index: true,
    },
    limits: {
      type: planLimitsSchema,
      required: true,
      default: () => PLAN_LIMITS.free,
    },
    usage: {
      sitesCount: { type: Number, default: 0 },
      deploymentsToday: { type: Number, default: 0 },
      deploymentsLastReset: { type: Date, default: Date.now },
      storageUsedMB: { type: Number, default: 0 },
      bandwidthUsedGB: { type: Number, default: 0 },
      bandwidthLastReset: { type: Date, default: Date.now },
      customDomainsCount: { type: Number, default: 0 },
    },
    stripeCustomerId: { type: String, sparse: true },
    stripeSubscriptionId: { type: String, sparse: true },
    stripePriceId: String,
    subscriptionStatus: {
      type: String,
      enum: ['active', 'past_due', 'canceled', 'trialing', 'none'],
      default: 'none',
    },
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: { type: Boolean, default: false },
    isCustom: { type: Boolean, default: false },
    customLimits: planLimitsSchema,
    notes: String,
  },
  { timestamps: true }
);

// Indexes
entitlementSchema.index({ stripeCustomerId: 1 }, { sparse: true });
entitlementSchema.index({ stripeSubscriptionId: 1 }, { sparse: true });
entitlementSchema.index({ subscriptionStatus: 1, currentPeriodEnd: 1 });

// Methods
entitlementSchema.methods.getEffectiveLimits = function (): IPlanLimits {
  if (this.isCustom && this.customLimits) {
    return { ...this.limits, ...this.customLimits };
  }
  return this.limits;
};

entitlementSchema.methods.canCreateSite = function (): boolean {
  const limits = this.getEffectiveLimits();
  return limits.maxSites === -1 || this.usage.sitesCount < limits.maxSites;
};

entitlementSchema.methods.canDeploy = function (): boolean {
  const limits = this.getEffectiveLimits();
  const now = new Date();
  const lastReset = new Date(this.usage.deploymentsLastReset);
  if (now.toDateString() !== lastReset.toDateString()) {
    this.usage.deploymentsToday = 0;
    this.usage.deploymentsLastReset = now;
  }
  return limits.maxDeploymentsPerDay === -1 || this.usage.deploymentsToday < limits.maxDeploymentsPerDay;
};

entitlementSchema.methods.canAddCustomDomain = function (): boolean {
  const limits = this.getEffectiveLimits();
  return limits.features.customDomains &&
    (limits.maxCustomDomains === -1 || this.usage.customDomainsCount < limits.maxCustomDomains);
};

// Update limits when plan changes
entitlementSchema.pre('save', function (next) {
  if (this.isModified('plan') && !this.isCustom) {
    this.limits = PLAN_LIMITS[this.plan];
  }
  next();
});

export default mongoose.model<IEntitlement>('Entitlement', entitlementSchema);