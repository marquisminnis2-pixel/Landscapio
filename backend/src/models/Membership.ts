import mongoose, { Document, Schema } from 'mongoose';

export type OrgRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface IMembership extends Document {
  userId: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  role: OrgRole;
  invitedBy?: mongoose.Types.ObjectId;
  inviteAcceptedAt?: Date;
  createdAt: Date;
}

const membershipSchema = new Schema<IMembership>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  orgId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'editor', 'viewer'],
    required: true,
  },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  inviteAcceptedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// A user can only have one membership per org
membershipSchema.index({ userId: 1, orgId: 1 }, { unique: true });
// Fast lookup: all members of an org
membershipSchema.index({ orgId: 1 });
// Fast lookup: all orgs for a user
membershipSchema.index({ userId: 1 });

export default mongoose.model<IMembership>('Membership', membershipSchema);