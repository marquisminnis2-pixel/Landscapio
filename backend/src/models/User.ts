import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  avatar?: string;
  globalRole: 'user' | 'superadmin';
  deletedAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  emailVerified: boolean;
  verificationToken?: string | null;
  verificationTokenExpiry?: Date | null;
  failedLoginAttempts: number;
  lockoutUntil?: Date | null;
  subscriptionActive: boolean;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  avatar: { type: String },
  globalRole: { type: String, enum: ['user', 'superadmin'], default: 'user' },
  deletedAt: { type: Date, default: null },
  lastLoginAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  emailVerified: { type: Boolean, default: false },
  verificationToken: { type: String, default: null },
  verificationTokenExpiry: { type: Date, default: null },
  failedLoginAttempts: { type: Number, default: 0 },
  lockoutUntil: { type: Date, default: null },
  subscriptionActive: { type: Boolean, default: true },
});

// Exclude soft-deleted users from find queries
userSchema.pre(/^find/, function (this: any) {
  if (this.getFilter().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
});

export default mongoose.model<IUser>('User', userSchema);
