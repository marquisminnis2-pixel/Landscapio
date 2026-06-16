/**
 * Unlock a locked-out user account by resetting the login-lockout fields.
 *
 * The lockout lives on the User document as `failedLoginAttempts` (number) and
 * `lockoutUntil` (Date|null) — see models/User.ts and the login handler. This
 * resets both so the account can sign in immediately.
 *
 * Usage:
 *   npx ts-node src/scripts/unlockUser.ts                       # defaults to support@landscapio.co
 *   npx ts-node src/scripts/unlockUser.ts someone@example.com   # unlock a specific email
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function run() {
  const email = (process.argv[2] || 'support@landscapio.co').trim();
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');

  await mongoose.connect(uri);

  const before = await User.findOne({ email }).select('email failedLoginAttempts lockoutUntil').lean();
  if (!before) {
    console.log(`No user found with email "${email}".`);
    await mongoose.disconnect();
    return;
  }
  console.log(`Before: email=${before.email} failedLoginAttempts=${before.failedLoginAttempts} lockoutUntil=${before.lockoutUntil}`);

  const after = await User.findOneAndUpdate(
    { email },
    { $set: { failedLoginAttempts: 0, lockoutUntil: null } },
    { new: true },
  ).select('email failedLoginAttempts lockoutUntil').lean();

  console.log(`After:  email=${after?.email} failedLoginAttempts=${after?.failedLoginAttempts} lockoutUntil=${after?.lockoutUntil}`);
  console.log('✅ Account unlocked.');

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('unlockUser failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
