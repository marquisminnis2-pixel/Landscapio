import mongoose, { Document, Schema } from 'mongoose';

export type DomainStatus = 'pending' | 'verifying' | 'active' | 'failed' | 'expired';
export type VerificationMethod = 'dns_txt' | 'dns_cname' | 'file';

export interface IDomain extends Document {
  orgId: mongoose.Types.ObjectId;
  siteId: mongoose.Types.ObjectId;
  domain: string;
  isApex: boolean;
  status: DomainStatus;
  verificationMethod: VerificationMethod;
  verificationToken: string;
  verificationRecord?: string;
  verifiedAt?: Date;
  lastVerificationAttempt?: Date;
  verificationAttempts: number;
  sslStatus: 'pending' | 'provisioning' | 'active' | 'failed';
  sslExpiresAt?: Date;
  sslProvider?: string;
  expectedCname?: string;
  detectedCname?: string;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const domainSchema = new Schema<IDomain>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    siteId: {
      type: Schema.Types.ObjectId,
      ref: 'HostingSite',
      required: true,
      index: true,
    },
    domain: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 253,
      match: [/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/, 'Invalid domain format'],
    },
    isApex: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'verifying', 'active', 'failed', 'expired'],
      default: 'pending',
      index: true,
    },
    verificationMethod: {
      type: String,
      enum: ['dns_txt', 'dns_cname', 'file'],
      default: 'dns_cname',
    },
    verificationToken: {
      type: String,
      required: true,
    },
    verificationRecord: String,
    verifiedAt: Date,
    lastVerificationAttempt: Date,
    verificationAttempts: { type: Number, default: 0 },
    sslStatus: {
      type: String,
      enum: ['pending', 'provisioning', 'active', 'failed'],
      default: 'pending',
    },
    sslExpiresAt: Date,
    sslProvider: String,
    expectedCname: String,
    detectedCname: String,
    isPrimary: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes
domainSchema.index({ domain: 1 }, { unique: true });
domainSchema.index({ siteId: 1, isPrimary: 1 });
domainSchema.index({ status: 1, lastVerificationAttempt: 1 });
domainSchema.index({ sslStatus: 1, sslExpiresAt: 1 });

// Ensure only one primary domain per site
domainSchema.pre('save', async function (next) {
  if (this.isPrimary && this.isModified('isPrimary')) {
    await mongoose.model('Domain').updateMany(
      { siteId: this.siteId, _id: { $ne: this._id } },
      { isPrimary: false }
    );
  }
  next();
});

// Security
domainSchema.pre(/^find/, function (this: any) {
  const filter = this.getFilter();
  if (!filter.orgId && !filter._id && !filter.siteId && !filter.domain) {
    throw new Error('SECURITY: Domain query requires scope');
  }
});

export default mongoose.model<IDomain>('Domain', domainSchema);