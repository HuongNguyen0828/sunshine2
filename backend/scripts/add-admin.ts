/**
 * Script to add an admin user to Firestore users collection
 * Usage: npx ts-node scripts/add-admin.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

import { db } from '../src/lib/firebase';

async function addAdminUser() {
  // CONFIGURE YOUR ADMIN INFO HERE
  const adminEmail = 'admin@paraflux.ca'; // ← CHANGE THIS
  const firstName = 'Amir'; // ← CHANGE THIS
  const lastName = 'Zhou'; // ← CHANGE THIS

  const emailLower = adminEmail.trim().toLowerCase();

  try {
    // Check if user already exists
    const existingUser = await db
      .collection('users')
      .where('email', '==', emailLower)
      .limit(1)
      .get();

    if (!existingUser.empty) {
      console.log('❌ User already exists with this email');
      const existingData = existingUser.docs[0].data();
      console.log('Existing user:', existingData);

      // Ask if they want to update to admin
      console.log('\n📝 Updating existing user to admin role...');
      await existingUser.docs[0].ref.update({
        role: 'admin',
        locationIds: ['*'],
        status: 'Active',
      });
      console.log('✅ Updated existing user to admin!');
      return;
    }

    // Get the first daycare provider (or you can specify one)
    const daycareSnapshot = await db.collection('daycareProvider').limit(1).get();

    if (daycareSnapshot.empty) {
      console.log('⚠️  No daycare provider found. Creating user without daycareId.');
      console.log('   You may need to add daycareId manually later.');
    }

    const daycareId = daycareSnapshot.empty ? undefined : daycareSnapshot.docs[0].id;

    // Create new admin user
    const adminData = {
      email: emailLower,
      firstName,
      lastName,
      role: 'admin',
      status: 'Active',
      locationIds: ['*'], // Wildcard = access all locations
      daycareId: daycareId,
      isRegistered: false, // Will be set to true after first login
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection('users').add(adminData);

    console.log('✅ Admin user created successfully!');
    console.log('Document ID:', docRef.id);
    console.log('Email:', emailLower);
    console.log('Role:', 'admin');
    console.log('DaycareId:', daycareId || 'None (add manually if needed)');
    console.log('\n📧 Now sign up with this email in the web app to complete registration.');

  } catch (error) {
    console.error('❌ Error adding admin user:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

addAdminUser();
