import mongoose, { Document, Schema } from 'mongoose';

export type DeploymentStatus =
  | 'queued'      // Waiting to start
  | 'building'    // Generating static files
  | 'uploading'   // Uploading to hosting provider
  | 'propagating' // CDN propagation in progress
  | 'live'        // Successfully deployed
  | 'failed'      // Deployment failed
  | 'superseded'; // Replaced by newer deployment

export type HostingProvider = 'local' | 'cloudflare' | 's3';

export type TriggerSource = 'manual' | 'auto' | 'api' | 'rollback';

export interface IDeploymentAsset {
  path: string;       // e.g., "/index.html", "/assets/image.png"
  url: string;        // CDN URL after deployment
  size: number;
  contentType: string;
  hash?: string;      // For cache invalidation
}

export interface IDeployment extends Document {
  siteId: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;

  // Version tracking
  version: number;
  commitMessage?: string;

  // Status
  status: DeploymentStatus;
  error?: string;

  // Provider info
  provider: HostingProvider;
  providerDeploymentId?: string;

  // URLs
  previewUrl?: string;
  productionUrl?: string;

  // Assets deployed
  assets: IDeploymentAsset[];
  totalSize: number;

  // Timing
  createdAt: Date;
  updatedAt: Date;
  buildStartedAt?: Date;
  buildCompletedAt?: Date;
  uploadStartedAt?: Date;
  uploadCompletedAt?: Date;
  liveAt?: Date;

  // Metadata
  createdBy: mongoose.Types.ObjectId;
  triggeredBy: TriggerSource;

  // Error tracking
  errorCode?: string;
  failedAt?: Date;
}

const deploymentAssetSchema = new Schema<IDeploymentAsset>(
  {
    path: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number, required: true },
    contentType: { type: String, required: true },
    hash: { type: String },
  },
  { _id: false }
);

const deploymentSchema = new Schema<IDeployment>(
  {
    siteId: {
      type: Schema.Types.ObjectId,
      ref: 'HostingSite',
      required: true,
      index: true,
    },
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
    version: {
      type: Number,
      // Note: version is auto-set by pre-save hook, so not required here
    },
    commitMessage: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['queued', 'building', 'uploading', 'propagating', 'live', 'failed', 'superseded'],
      default: 'queued',
      index: true,
    },
    error: {
      type: String,
    },
    provider: {
      type: String,
      enum: ['local', 'cloudflare', 's3'],
      default: 'local',
    },
    providerDeploymentId: {
      type: String,
    },
    previewUrl: {
      type: String,
    },
    productionUrl: {
      type: String,
    },
    assets: {
      type: [deploymentAssetSchema],
      default: [],
    },
    totalSize: {
      type: Number,
      default: 0,
    },
    buildStartedAt: { type: Date },
    buildCompletedAt: { type: Date },
    uploadStartedAt: { type: Date },
    uploadCompletedAt: { type: Date },
    liveAt: { type: Date },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    triggeredBy: {
      type: String,
      enum: ['manual', 'auto', 'api', 'rollback'],
      default: 'manual',
    },
    errorCode: String,
    failedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Compound indexes
deploymentSchema.index({ siteId: 1, version: -1 });
deploymentSchema.index({ orgId: 1, status: 1 });
deploymentSchema.index({ siteId: 1, status: 1, createdAt: -1 });

// SAFETY: Prevent queries without orgId scope
deploymentSchema.pre('find', function (this: any) {
  const filter = this.getFilter();
  if (!filter.orgId && !filter._id && !filter.siteId) {
    throw new Error('SECURITY: Deployment query executed without proper scope');
  }
});

deploymentSchema.pre('findOne', function (this: any) {
  const filter = this.getFilter();
  if (!filter.orgId && !filter._id && !filter.siteId) {
    throw new Error('SECURITY: Deployment findOne executed without proper scope');
  }
});

// Auto-increment version for site
deploymentSchema.pre('save', async function (next) {
  if (this.isNew && !this.version) {
    const lastDeployment = await mongoose.model('Deployment').findOne(
      { siteId: this.siteId },
      { version: 1 },
      { sort: { version: -1 } }
    );
    this.version = lastDeployment ? lastDeployment.version + 1 : 1;
  }
  next();
});

export default mongoose.model<IDeployment>('Deployment', deploymentSchema);