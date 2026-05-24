import mongoose, { Document, Schema } from 'mongoose';

export type SiteStatus = 'draft' | 'live' | 'paused';

export interface ISiteSettings {
  // SEO
  defaultTitle?: string;
  defaultDescription?: string;
  favicon?: string;
  socialImage?: string;

  // Redirects
  redirects?: Array<{
    from: string;
    to: string;
    status: 301 | 302;
  }>;

  // Headers
  customHeaders?: Array<{
    path: string;
    headers: Record<string, string>;
  }>;

  // 404
  custom404?: string;
}

export interface ISite extends Document {
  orgId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  name: string;
  subdomain: string;
  customDomain?: string;
  customDomainVerified: boolean;
  status: SiteStatus;
  activeDeploymentId?: mongoose.Types.ObjectId;
  settings: ISiteSettings;
  createdAt: Date;
  updatedAt: Date;
}

const siteSchema = new Schema<ISite>(
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
    },
    subdomain: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, 'Subdomain must be alphanumeric with optional hyphens'],
    },
    customDomain: {
      type: String,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    customDomainVerified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['draft', 'live', 'paused'],
      default: 'draft',
    },
    activeDeploymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Deployment',
    },
    settings: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
siteSchema.index({ orgId: 1, projectId: 1 });
siteSchema.index({ customDomain: 1 }, { sparse: true });

// SAFETY: Prevent queries without orgId scope
siteSchema.pre('find', function (this: any) {
  const filter = this.getFilter();
  if (!filter.orgId && !filter._id && !filter.subdomain && !filter.customDomain) {
    throw new Error('SECURITY: Site query executed without proper scope');
  }
});

siteSchema.pre('findOne', function (this: any) {
  const filter = this.getFilter();
  if (!filter.orgId && !filter._id && !filter.subdomain && !filter.customDomain) {
    throw new Error('SECURITY: Site findOne executed without proper scope');
  }
});

export default mongoose.model<ISite>('Site', siteSchema);