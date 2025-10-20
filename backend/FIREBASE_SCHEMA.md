# Firebase Firestore Schema

**Last Updated:** 2025-01-20
**Reverse-engineered from:** backend/src codebase

---

## Collections

### 1. `users` (Root Collection)

User accounts for all roles (admin, teacher, parent)

```typescript
users/{userId}
  - email: string
  - firstName: string
  - lastName: string
  - role: "admin" | "teacher" | "parent"
  - status: "New" | "Active" | "Inactive" | "Withdraw" | "Waitlist"
  - phone?: string
  - classIds?: string[]  // Array of class IDs this user is assigned to
  - locationIds?: string[]  // Admin scope: ["*"] = all, or specific location IDs
  - daycareId?: string  // For admin scope
  - address1?: string
  - address2?: string
  - city?: string
  - province?: string
  - country?: string
  - postalcode?: string
  - startDate?: string  // For teachers
  - endDate?: string  // For teachers
  - childIds?: string[]  // For parents
  - street?: string  // For parents
  - emergencyContact?: string  // For parents
  - createdAt?: string
  - updatedAt?: string
  - preferredLanguage?: string
```

**Usage:**
- Teachers: `role: "teacher"`, assigned to classes via `classIds`
- Parents: `role: "parent"`, linked to children via `childIds`
- Admins: `role: "admin"`, scope controlled via `locationIds` and `daycareId`

---

### 2. `classes` (Root Collection)

Class definitions (e.g., Toddlers, Preschool, Kindergarten)

```typescript
classes/{classId}
  - name: string  // e.g., "Toddlers", "Preschool"
  - locationId?: string  // Optional location reference
  - capacity: number  // Maximum enrollment
  - volume: number  // Current enrollment
  - ageStart: number  // Minimum age (in years)
  - ageEnd: number  // Maximum age (in years)
  - classroom?: string  // Room number/name
  - teacherIds?: string[]  // Array of teacher user IDs assigned to this class
  - createdAt: Timestamp
  - updatedAt: Timestamp
```

**Relations:**
- `teacherIds[]` → references `users/{userId}` where role = "teacher"
- `locationId` → references `daycareProvider/{daycareId}/locations/{locationId}`

---

### 3. `daycareProvider/{daycareId}/locations` (Subcollection)

Locations under a daycare provider

```typescript
daycareProvider/{daycareId}/locations/{locationId}
  - name?: string
  - phone?: string
  - email?: string
  - street?: string
  - city?: string
  - province?: string
  - zip?: string
  - country?: string
```

**Usage:**
- Nested under daycare provider documents
- Referenced by `classes.locationId`
- Used for admin access control scoping

---

### 4. `schedules` (Root Collection)

Weekly activity schedules for classes

```typescript
schedules/{scheduleId}
  - weekStart: string  // ISO date for Monday, e.g., "2025-01-13"
  - dayOfWeek: "monday" | "tuesday" | "wednesday" | "thursday" | "friday"
  - timeSlot: "morning" | "mid-morning" | "afternoon"
  - activityTitle: string
  - activityDescription: string
  - activityMaterials: string
  - classId: string  // "all" or reference to classes/{classId}
  - userId: string  // Admin who created it
  - createdAt: Timestamp
  - updatedAt: Timestamp
```

**Access Control:** Admin can only create schedules for classes in their locationId/daycareId scope.

---

## Collections NOT YET IMPLEMENTED

---

### ❌ `children` (Not Found in Code)

Child enrollment records - appears to be missing

**Proposed Schema:**
```typescript
children/{childId}
  - firstName: string
  - lastName: string
  - birthDate: string
  - parentId: string[]  // References users where role="parent"
  - classId: string  // References classes/{classId}
  - allergies?: string
  - specialNeeds?: string
  - subsidyStatus?: string
  - enrollmentDate: string
  - enrollmentStatus: "New" | "Active" | "Withdraw" | "Waitlist"
  - endDate?: string
```

**Status:** Defined in shared/types/type.ts but NO backend implementation found

---

## Access Patterns

### Admin Scope Logic
```
if (user.locationIds includes "*"):
  → Use user.daycareId to get all locations under that daycare
  → Can access all classes in those locations

if (user.locationIds has specific IDs):
  → Can only access classes with those locationIds

if (no locationIds):
  → Full access (super admin)
```

### Teacher-Class Assignment
```
1. Teacher created in users collection with status="New"
2. Admin assigns teacher to class via POST /api/classes/{id}/assign-teachers
3. Teacher status → "Active"
4. Teacher's classIds array updated
5. Class's teacherIds array updated
```

---

## Missing Collections for Full Feature Set

Based on shared/types/type.ts, these are defined but NOT implemented:

1. ❌ `children` - Child enrollment data
2. ❌ `schedules` (for class schedules)
3. ❌ `schedules` (for activity schedules)
4. ❌ `entries` - Daily activity logs
5. ❌ `dailyReports` - End-of-day reports
6. ❌ `photos` - Photo attachments
7. ❌ `monthlyReports` - Monthly attendance reports

**Note:** Two different "Schedule" types exist:
- Class operating hours (when Toddlers class runs)
- Activity schedules (Story Time on Monday 9am)

Currently NEITHER is implemented in Firebase.

---

## How to Use This Document

**Before adding new features:**
1. Check if collection exists in this doc
2. If missing, design schema here FIRST
3. Update shared/types if needed
4. Implement backend service
5. Update this doc with actual implementation

**When modifying existing collections:**
1. Update code
2. Update this doc
3. Update shared/types if schema changed
