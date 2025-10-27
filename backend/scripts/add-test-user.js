#!/usr/bin/env node
/**
 * Script to add a test parent or teacher user to Firebase
 * Usage: node scripts/add-test-user.js <email> <role> [locationId]
 * Example: node scripts/add-test-user.js test@example.com parent loc123
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function addTestUser(email, role, locationId) {
  const emailLower = email.trim().toLowerCase();

  // Validate role
  if (role !== 'parent' && role !== 'teacher') {
    console.error('❌ Role must be either "parent" or "teacher"');
    process.exit(1);
  }

  // Check if user already exists
  const existingSnap = await db.collection('users')
    .where('email', '==', emailLower)
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    console.error(`❌ User with email ${emailLower} already exists`);
    process.exit(1);
  }

  // Create user document
  const userData = {
    email: emailLower,
    emailLower: emailLower,
    role: role,
    isRegistered: false, // Must be false to allow registration
    status: 'Active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Add locationId if provided
  if (locationId) {
    userData.locationId = locationId;
  }

  // Add to Firestore
  const docRef = await db.collection('users').add(userData);

  console.log('✅ Test user created successfully!');
  console.log('');
  console.log('User Details:');
  console.log('  Document ID:', docRef.id);
  console.log('  Email:', emailLower);
  console.log('  Role:', role);
  console.log('  Location ID:', locationId || '(not set - will need onboarding)');
  console.log('  Is Registered:', false);
  console.log('');
  console.log('📱 Next steps:');
  console.log('  1. Open your mobile app');
  console.log('  2. Go to registration/sign-up');
  console.log(`  3. Register with email: ${emailLower}`);
  console.log('  4. Set a password');
  console.log('');
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node scripts/add-test-user.js <email> <role> [locationId]');
  console.log('');
  console.log('Arguments:');
  console.log('  email       Email address for the test user');
  console.log('  role        Either "parent" or "teacher"');
  console.log('  locationId  (Optional) Location ID for the user');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/add-test-user.js test@example.com parent');
  console.log('  node scripts/add-test-user.js teacher@example.com teacher loc123');
  process.exit(1);
}

const [email, role, locationId] = args;

addTestUser(email, role, locationId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
