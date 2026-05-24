/**
 * Migration script: Convert existing single-tenant data to multi-tenant structure.
 *
 * This script:
 * 1. Creates a personal organization for each existing user
 * 2. Creates owner membership for each user-org pair
 * 3. Updates all projects to use orgId instead of userId
 * 4. Updates all assets to include orgId
 * 5. Updates all published sites to include orgId
 *
 * Run with: npx ts-node src/scripts/migrateToMultiTenant.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import models
import User from '../models/User';
import Organization from '../models/Organization';
import Membership from '../models/Membership';

async function migrate() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/genesis-builder';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to migrate`);

    for (const user of users) {
      console.log(`\nMigrating user: ${user.email}`);

      // Check if user already has an org
      const existingMembership = await Membership.findOne({ userId: user._id });
      if (existingMembership) {
        console.log(`  User already has membership, skipping org creation`);
        continue;
      }

      // Create personal organization
      const baseSlug = user.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-workspace';
      let slug = baseSlug;
      let counter = 1;

      while (await Organization.findOne({ slug })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const org = new Organization({
        name: `${user.name}'s Workspace`,
        slug,
        ownerId: user._id,
        plan: 'free',
        billingPeriod: 'monthly',
        subscription: { status: 'active' },
        limits: {
          maxSites: 2,
          maxCollaborators: 1,
          storageGB: 1,
          monthlyVisitors: 1000,
        },
      });

      await org.save();
      console.log(`  Created org: ${org.name} (${org.slug})`);

      // Create owner membership
      await Membership.create({
        userId: user._id,
        orgId: org._id,
        role: 'owner',
      });
      console.log(`  Created owner membership`);

      // Update user's projects to use orgId
      // Note: We're using updateMany directly to bypass the schema middleware
      const projectResult = await db.collection('projects').updateMany(
        { userId: user._id },
        {
          $set: { orgId: org._id, createdBy: user._id },
          $unset: { userId: '' },
        }
      );
      console.log(`  Updated ${projectResult.modifiedCount} projects`);

      // Update assets for this user's projects
      const userProjects = await db.collection('projects').find({ orgId: org._id }).toArray();
      const projectIds = userProjects.map((p: any) => p._id);

      if (projectIds.length > 0) {
        const assetResult = await db.collection('assets').updateMany(
          { projectId: { $in: projectIds } },
          { $set: { orgId: org._id } }
        );
        console.log(`  Updated ${assetResult.modifiedCount} assets`);

        // Update published sites
        const publishedResult = await db.collection('publishedsites').updateMany(
          { projectId: { $in: projectIds } },
          { $set: { orgId: org._id } }
        );
        console.log(`  Updated ${publishedResult.modifiedCount} published sites`);
      }

      // Update user's globalRole (migrate from old 'role' field)
      const oldRole = (user as any).role;
      if (oldRole === 'admin') {
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { globalRole: 'superadmin' }, $unset: { role: '' } }
        );
        console.log(`  Migrated admin role to superadmin`);
      } else {
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { globalRole: 'user' }, $unset: { role: '' } }
        );
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nSummary:');
    console.log(`  - Users: ${users.length}`);
    console.log(`  - Organizations created: ${await Organization.countDocuments()}`);
    console.log(`  - Memberships created: ${await Membership.countDocuments()}`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run migration
migrate();