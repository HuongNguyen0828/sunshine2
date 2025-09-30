Step-by-Step Signup Data Flow

  Overview

  The system uses a whitelist approach where emails must be pre-registered in Firebase Firestore collections (admins,
  teachers, or parents) before users can sign up.

  ---
  Step-by-Step Registration Flow

  Frontend (web-admin/app/signup/page.tsx)

  1. User enters signup information:
    - Full Name
    - Email
    - Password
    - Confirm Password
  2. Form submission triggers signUp() function (web-admin/lib/auth.tsx:75)

  ---
  Step 1: Email Validation (Frontend → Backend)

  Frontend: web-admin/lib/auth.tsx:78-92
  const res = await fetch("http://localhost:5000/auth/check-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });

  Backend Route: backend/src/routes/AuthRoutes.ts:14
  router.post("/check-email", checkEmail);

  Backend Controller: backend/src/controllers/AuthController.ts:11-30
  - Receives email from request body
  - Calls findRoleByEmail(email) service

  Backend Service: backend/src/services/authService.ts:7-25
  export async function findRoleByEmail(email: string | null): Promise<UserRole | null>
  - Checks 3 Firebase Firestore collections in order:
    a. teachers collection - queries where("email", "==", email)
    b. parents collection - queries where("email", "==", email)
    c. admins collection - queries where("email", "==", email)
  - Returns role (admin, teacher, or parent) if found
  - Returns null if email not found in any collection

  Response:
  - ✅ Success (200): { role: "admin" } (or "teacher"/"parent")
  - ❌ Error (403): "Email not authorized. You need register your daycare with Sunshine"

  ---
  Step 2: Create Firebase Authentication User

  Frontend: web-admin/lib/auth.tsx:94-99
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  await updateProfile(userCredential.user, { displayName: name });

  - Creates user in Firebase Authentication system
  - Sets display name
  - User gets assigned a unique UID by Firebase

  ---
  Step 3: Verify Role & Create User Profile (Frontend → Backend)

  Frontend: web-admin/lib/auth.tsx:102-107
  const idToken = await userCredential.user.getIdToken();
  await fetch("http://localhost:5000/auth/verify-role", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, name })
  });

  Backend Route: backend/src/routes/AuthRoutes.ts:15
  router.post("/verify-role", verifyRole);

  Backend Controller: backend/src/controllers/AuthController.ts:33-50
  - Verifies Firebase ID token using Firebase Admin SDK
  - Extracts email from decoded token
  - Calls findRoleByEmail(email) again to confirm role
  - Calls createUser(uid, email, role, name)

  Backend Service: backend/src/services/authService.ts:29-41
  export async function createUser(uid: string, email: string | null, role: string, name: string)
  - Creates document in users collection in Firestore:
  {
    uid: string,
    email: string,
    role: "admin" | "teacher" | "parent",
    name: string,
    createdAt: serverTimestamp
  }
  - Document ID = Firebase Auth UID

  Response:
  - ✅ Success (200): { message: "User verified", role: "admin" }
  - ❌ Error (403): "Unauthorized email!"
  - ❌ Error (500): Server error

  ---
  Firebase Firestore Collections Used

  | Collection | Purpose                     | Fields Required                   |
  |------------|-----------------------------|-----------------------------------|
  | admins     | Whitelist of admin emails   | email: string                     |
  | teachers   | Whitelist of teacher emails | email: string                     |
  | parents    | Whitelist of parent emails  | email: string                     |
  | users      | Created after signup        | uid, email, role, name, createdAt |

  ---
  Summary: What Needs to be Done Before Signup

  Manual Pre-registration Required:
  1. Admin must add email to Firebase Firestore in one of these collections:
    - admins collection → for admin users
    - teachers collection → for teacher users
    - parents collection → for parent users
  2. Each collection document must have at minimum:
    - email: "user@example.com"
  3. Only emails in these collections can successfully sign up

  Functions Called:
  - checkEmail() - validates email exists in whitelist
  - findRoleByEmail() - queries 3 collections to determine role
  - createUserWithEmailAndPassword() - creates Firebase Auth user
  - verifyRole() - confirms role and links UID
  - createUser() - creates user profile in users collection