import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function setAdmin() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  const db = mongoose.connection.db;
  if (!db) throw new Error('No db connection');

  // Set marquisminnis1@gmail.com as superadmin
  const result = await db.collection('users').updateOne(
    { email: 'marquisminnis1@gmail.com' },
    { $set: { globalRole: 'superadmin' } }
  );
  console.log('Updated marquisminnis1@gmail.com to superadmin:', result.modifiedCount);

  // Ensure all others are regular users
  const others = await db.collection('users').updateMany(
    { email: { $ne: 'marquisminnis1@gmail.com' } },
    { $set: { globalRole: 'user' } }
  );
  console.log('Set other users to regular user role:', others.modifiedCount);

  // Show all users
  const users = await db.collection('users').find({}, { projection: { email: 1, globalRole: 1 } }).toArray();
  console.log('\nAll users:');
  users.forEach(u => console.log('  ' + u.email + ' -> ' + u.globalRole));

  await mongoose.disconnect();
}

setAdmin();