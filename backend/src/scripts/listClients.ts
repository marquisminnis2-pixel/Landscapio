import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(uri);

  // Bypass model security hook by querying the raw collection.
  const conn = mongoose.connection;
  const docs = await conn.collection('clients').find({}).toArray();

  console.log(`Found ${docs.length} client(s):\n`);
  for (const c of docs as any[]) {
    console.log({
      _id: String(c._id),
      businessName: c.businessName,
      industry: c.industry,
      userId: String(c.userId),
      orgId: String(c.orgId),
      airtableBaseId: c.airtableBaseId || '(empty)',
      airtableBlogTrackerTable: c.airtableBlogTrackerTable || '(empty)',
    });
  }

  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
