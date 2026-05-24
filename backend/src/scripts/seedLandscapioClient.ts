/**
 * Seed script: create the "Landscapio" client record wired to its Airtable base.
 *
 * Usage: npx ts-node src/scripts/seedLandscapioClient.ts
 *
 * Idempotent — if a client named "Landscapio" already exists for the user/org,
 * it just updates the Airtable fields instead of creating a duplicate.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import User from '../models/User';
import Membership from '../models/Membership';
import Client from '../models/Client';

const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL || 'dlo@dlodigital.com';

const LANDSCAPIO = {
  businessName: 'Landscapio',
  industry: 'Landscaping' as const,
  websiteUrl: 'https://landscapio.co',
  airtableBaseId: 'appUu33K4gO14zeDs',
  // Table ids pulled from the Airtable URLs the user shared.
  airtableBlogTrackerTable: 'tbld259C9i8UXVygP',
  airtableSocialPostsTable: 'tbleL8WUvAFEHOWSQ',
};

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');

  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  const user = await User.findOne({ email: OWNER_EMAIL });
  if (!user) {
    throw new Error(`No user found with email "${OWNER_EMAIL}". Set SEED_OWNER_EMAIL or register the account first.`);
  }
  console.log(`👤 Owner: ${user.name} (${user.email}) — ${user._id}`);

  const membership = await Membership.findOne({ userId: user._id }).sort({ createdAt: 1 });
  if (!membership) {
    throw new Error(`No org membership found for ${OWNER_EMAIL}. Log in to the app once to provision a default org.`);
  }
  console.log(`🏢 Org: ${membership.orgId} (role: ${membership.role})`);

  const existing = await Client.findOne({
    userId: user._id,
    orgId: membership.orgId,
    businessName: LANDSCAPIO.businessName,
  });

  if (existing) {
    existing.airtableBaseId = LANDSCAPIO.airtableBaseId;
    existing.airtableBlogTrackerTable = LANDSCAPIO.airtableBlogTrackerTable;
    existing.airtableSocialPostsTable = LANDSCAPIO.airtableSocialPostsTable;
    if (!existing.websiteUrl) existing.websiteUrl = LANDSCAPIO.websiteUrl;
    await existing.save();
    console.log(`♻️  Updated existing client — _id: ${existing._id}`);
  } else {
    const created = await Client.create({
      userId: user._id,
      orgId: membership.orgId,
      ...LANDSCAPIO,
    });
    console.log(`🌱 Created new client — _id: ${created._id}`);
  }

  await mongoose.disconnect();
  console.log('👋 Disconnected');
}

run().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
