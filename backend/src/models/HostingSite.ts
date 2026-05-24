import mongoose, { Document, Schema } from 'mongoose';

export type SiteStatus = 'draft' | 'deploying' | 'live' | 'paused' | 'error';

export interface IHostingSite extends Document {
  orgId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  name: string;
  slug: string; // subdomain: {slug}.genesis.site
  status: SiteStatus;
  activeDeploymentId?: mongoose.Types.ObjectId;
  lastDeployedAt?: Date;
  errorMessage?: string;
  settings: {
    favicon?: string;
    socialImage?: string;
    metaTitle?: string;
    metaDescription?: string;
    customHead?: string;
    custom404?: string;
    redirects?: Array<{ from: string; to: string; permanent: boolean }>;
  };
  analytics: {
    totalVisits: number;
    lastVisitAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const hostingSiteSchema = new Schema<IHostingSite>(
  {
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
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 63,
      match: [/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'Invalid subdomain format'],
    },
    status: {
      type: String,
      enum: ['draft', 'deploying', 'live', 'paused', 'error'],
      default: 'draft',
      index: true,
    },
    activeDeploymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Deployment',
    },
    lastDeployedAt: Date,
    errorMessage: String,
    settings: {
      favicon: String,
      socialImage: String,
      metaTitle: String,
      metaDescription: String,
      customHead: String,
      custom404: String,
      redirects: [{
        from: { type: String, required: true },
        to: { type: String, required: true },
        permanent: { type: Boolean, default: false },
      }],
    },
    analytics: {
      totalVisits: { type: Number, default: 0 },
      lastVisitAt: Date,
    },
  },
  { timestamps: true }
);

// Compound indexes
hostingSiteSchema.index({ orgId: 1, projectId: 1 }, { unique: true });
hostingSiteSchema.index({ orgId: 1, status: 1 });
hostingSiteSchema.index({ slug: 1 }, { unique: true });

// Security: prevent unscoped queries
hostingSiteSchema.pre(/^find/, function (this: any) {
  const filter = this.getFilter();
  if (!filter.orgId && !filter._id && !filter.slug) {
    throw new Error('SECURITY: HostingSite query requires orgId, _id, or slug scope');
  }
});

export default mongoose.model<IHostingSite>('HostingSite', hostingSiteSchema);