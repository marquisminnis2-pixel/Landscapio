/**
 * Backfill Airtable IDs onto every Landscapio-named client that is missing them.
 *
 * The original seed script only matched businessName === 'Landscapio' (exact),
 * but the active client in the UI is "LandScapio" (capital S) under a different
 * user account, so it never received the Airtable config. This script case-
 * insensitively matches /^landscapio$/i and fills in the empty fields.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const AIRTABLE_BASE_ID = 'appUu33K4gO14zeDs';
const AIRTABLE_BLOG_TRACKER_TABLE = 'tbld259C9i8UXVygP';
const AIRTABLE_SOCIAL_POSTS_TABLE = 'tbleL8WUvAFEHOWSQ';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(uri);

  const collection = mongoose.connection.collection('clients');

  // Backfill base + blog tracker for any Landscapio-named client missing them.
  const baseResult = await collection.updateMany(
    {
      businessName: { $regex: /^landscapio$/i },
      $or: [
        { airtableBaseId: { $in: [null, ''] } },
        { airtableBaseId: { $exists: false } },
      ],
    },
    {
      $set: {
        airtableBaseId: AIRTABLE_BASE_ID,
        airtableBlogTrackerTable: AIRTABLE_BLOG_TRACKER_TABLE,
      },
    }
  );
  console.log(`Base/blog backfill — matched ${baseResult.matchedCount}, modified ${baseResult.modifiedCount}`);

  // Backfill social posts table on every Landscapio-named client missing it.
  const socialResult = await collection.updateMany(
    {
      businessName: { $regex: /^landscapio$/i },
      $or: [
        { airtableSocialPostsTable: { $in: [null, ''] } },
        { airtableSocialPostsTable: { $exists: false } },
      ],
    },
    {
      $set: { airtableSocialPostsTable: AIRTABLE_SOCIAL_POSTS_TABLE },
    }
  );
  console.log(`Social posts backfill — matched ${socialResult.matchedCount}, modified ${socialResult.modifiedCount}`);

  const all = await collection
    .find({ businessName: { $regex: /landscapio/i } })
    .project({ businessName: 1, userId: 1, airtableBaseId: 1, airtableBlogTrackerTable: 1, airtableSocialPostsTable: 1 })
    .toArray();
  console.log('Current Landscapio-named clients:');
  for (const c of all as any[]) {
    console.log(`  - ${c.businessName} (user ${c.userId}) → base=${c.airtableBaseId || '(empty)'}, blog=${c.airtableBlogTrackerTable || '(empty)'}, social=${c.airtableSocialPostsTable || '(empty)'}`);
  }

  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
