# Scheduler API Specification

## Overview
API endpoints to power the SchedulerLabsTab component for daycare activity and teacher scheduling.

## Base URL
```
/api/scheduler
```

## Authentication
All endpoints require valid JWT token in Authorization header:
```
Authorization: Bearer <jwt_token>
```

## ID Management & Frontend Flow

### Critical: ID Discovery Strategy
**Frontend MUST follow this flow to get valid IDs:**

1. **First:** Call `GET /scheduler/classes` to get all available `classId` values
2. **First:** Call `GET /scheduler/teachers` to get all available `teacherId` values  
3. **First:** Call `GET /scheduler/activities` to get all available `activityId` values
4. **Then:** Use these IDs in dropdown selections for create/update operations

### Firebase Document IDs
- All IDs are Firebase auto-generated document IDs (strings like "abc123xyz")
- Frontend never generates IDs - always receives them from GET endpoints
- Always validate ID exists before using in POST/PUT operations

### Required Frontend UX Flow
```
1. User clicks "Create Activity" 
2. Frontend shows target selection: "Single Class" or "All Classes"
3. If "Single Class" → Show dropdown populated from GET /classes
4. User selects class → Frontend uses the classId from GET /classes response
5. Submit with valid classId
```

## Time Slot System

### Predefined Time Slots ONLY
**No custom times allowed - only these 3 fixed slots:***
```typescript
const TIME_SLOTS = [
  { key: 'morning', label: 'Morning', time: '9:00 AM' },
  { key: 'mid-morning', label: 'Mid-Morning', time: '10:30 AM' },
  { key: 'afternoon', label: 'Afternoon', time: '2:00 PM' },
];
```

### Frontend Implementation
- Use dropdown with these exact 3 options
- Send only the `key` value ("morning", "mid-morning", "afternoon") to API
- Display `label` and `time` to users
- No flexibility - these are the only available time slots

## Error Response Format
```typescript
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}
```

## Success Response Format
```typescript
interface ApiSuccess<T> {
  success: true;
  data: T;
  timestamp: string;
}
```

---

## Activities Management

### 1. Create Activity
**POST** `/api/scheduler/activities`

**Request Body:**
```typescript
{
  title: string;
  description: string;
  materials: string;
  target: "class" | "all_classes";
  classId?: string; // required if target is "class", must be from GET /classes
}
```

**Response:** `ApiSuccess<Activity>`

**Errors:**
- `400` - `INVALID_INPUT` - Missing required fields or invalid data
- `404` - `CLASS_NOT_FOUND` - Invalid classId
- `401` - `UNAUTHORIZED` - Invalid token

---

### 2. Get Activities
**GET** `/api/scheduler/activities`

**Query Parameters:**
- `classId?: string` - Filter by class
- `target?: "class" | "all_classes"` - Filter by target type

**Response:** `ApiSuccess<Activity[]>`

---

### 3. Update Activity
**PUT** `/api/scheduler/activities/:activityId`

**Request Body:** Same as Create Activity

**Response:** `ApiSuccess<Activity>`

**Errors:**
- `404` - `ACTIVITY_NOT_FOUND` - Activity doesn't exist

---

### 4. Delete Activity
**DELETE** `/api/scheduler/activities/:activityId`

**Response:** `ApiSuccess<{ deleted: true }>`

---

## Schedule Management

### 5. Create Schedule Entry
**POST** `/api/scheduler/schedules`

**Request Body:**
```typescript
{
  type: "monthly" | "weekly";
  weekStart: string; // ISO date for Monday of the week
  dayOfWeek: "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
  timeSlot: "morning" | "mid-morning" | "afternoon"; // predefined slots only
  activityId: string; // must be from GET /activities
  target: {
    type: "class" | "all_classes" | "teacher" | "all_teachers";
    id?: string; // must be from GET /classes or GET /teachers
  };
  notes?: string;
  isHoliday?: boolean; // for monthly schedules
}
```

**Response:** `ApiSuccess<ScheduleEntry>`

**Errors:**
- `409` - `SCHEDULE_CONFLICT` - Time slot already occupied
- `404` - `ACTIVITY_NOT_FOUND` - Invalid activityId
- `404` - `TARGET_NOT_FOUND` - Invalid class/teacher ID

---

### 6. Get Schedule
**GET** `/api/scheduler/schedules`

**Query Parameters:**
- `type: "monthly" | "weekly"` (required)
- `date: string` - ISO date (required)
- `view: "class" | "teacher"` - View type (required)
- `targetId?: string` - Specific class or teacher ID
- `startDate?: string` - For date range (weekly view)
- `endDate?: string` - For date range (weekly view)

**Response:** `ApiSuccess<ScheduleEntry[]>`

---

### 7. Update Schedule Entry
**PUT** `/api/scheduler/schedules/:scheduleId`

**Request Body:** Same as Create Schedule Entry

**Response:** `ApiSuccess<ScheduleEntry>`

**Errors:**
- `404` - `SCHEDULE_NOT_FOUND` - Schedule entry doesn't exist
- `409` - `SCHEDULE_CONFLICT` - Time conflict with update

---

### 8. Delete Schedule Entry
**DELETE** `/api/scheduler/schedules/:scheduleId`

**Response:** `ApiSuccess<{ deleted: true }>`

---

## Teacher Schedule Management

### 9. Create Teacher Schedule
**POST** `/api/scheduler/teachers/schedules`

**Request Body:**
```typescript
{
  teacherId: string;
  date: string; // ISO date
  timeSlot: {
    start: string; // "HH:MM"
    end: string; // "HH:MM"
  };
  assignment: {
    type: "class" | "break" | "meeting" | "planning";
    classId?: string; // if type is "class"
    description?: string;
  };
  notes?: string;
}
```

**Response:** `ApiSuccess<TeacherSchedule>`

---

### 10. Get Teacher Schedules
**GET** `/api/scheduler/teachers/schedules`

**Query Parameters:**
- `teacherId?: string` - Specific teacher (optional, if not provided returns all)
- `date: string` - ISO date (required)
- `view: "daily" | "weekly"` (required)

**Response:** `ApiSuccess<TeacherSchedule[]>`

---

## Reference Data

### 11. Get Classes
**GET** `/api/scheduler/classes`

**Response:** `ApiSuccess<ClassInfo[]>`

```typescript
interface ClassInfo {
  id: string;
  name: string;
  ageGroup: {
    min: number;
    max: number;
  };
  capacity: number;
  currentEnrollment: number;
}
```

---

### 12. Get Teachers
**GET** `/api/scheduler/teachers`

**Response:** `ApiSuccess<TeacherInfo[]>`

```typescript
interface TeacherInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  assignedClasses: string[]; // classIds
}
```

---

## Calendar Data

### 13. Get Available Time Slots
**GET** `/api/scheduler/time-slots`

**Query Parameters:**
- `weekStart: string` - ISO date for Monday
- `dayOfWeek: string` - "monday", "tuesday", etc.
- `classId?: string` - For class-specific availability

**Response:** `ApiSuccess<TimeSlotAvailability[]>`

```typescript
interface TimeSlotAvailability {
  slot: "morning" | "mid-morning" | "afternoon";
  label: string; // "Morning", "Mid-Morning", "Afternoon"
  time: string; // "9:00 AM", "10:30 AM", "2:00 PM"
  available: boolean;
  conflictReason?: string;
  existingActivity?: {
    id: string;
    title: string;
  };
}
```

---

## Bulk Operations

### 14. Bulk Create Monthly Schedule
**POST** `/api/scheduler/schedules/bulk/monthly`

**Request Body:**
```typescript
{
  month: string; // "YYYY-MM"
  template: {
    holidays: Array<{
      date: string; // ISO date
      name: string;
      description?: string;
    }>;
    activities: Array<{
      activityId: string;
      dates: string[]; // ISO dates
      timeSlot: {
        start: string;
        end: string;
      };
      target: {
        type: "class" | "all_classes";
        id?: string;
      };
    }>;
  };
}
```

**Response:** `ApiSuccess<{ created: number; errors: any[] }>`

---

## Common Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Invalid or missing authentication token |
| `FORBIDDEN` | User doesn't have permission for this action |
| `INVALID_INPUT` | Request body validation failed |
| `NOT_FOUND` | Requested resource doesn't exist |
| `SCHEDULE_CONFLICT` | Time slot already occupied |
| `CLASS_NOT_FOUND` | Invalid class ID |
| `TEACHER_NOT_FOUND` | Invalid teacher ID |
| `ACTIVITY_NOT_FOUND` | Invalid activity ID |
| `DATE_PAST` | Cannot schedule in the past |
| `INVALID_TIME_SLOT` | Start time must be before end time |
| `CAPACITY_EXCEEDED` | Class capacity would be exceeded |

---

## Type Definitions

Add these to `/shared/types/scheduler.ts`:

```typescript
// Matches existing Activity interface but adds target system
export interface Activity {
  id: string;
  title: string;
  description: string;
  materials: string;
  target: "class" | "all_classes";
  classId?: string; // Firebase document ID from classes collection
  userId?: string;
  _creationTime?: number;
}

// Matches existing Schedule interface but adds target system  
export interface Schedule {
  id: string;
  userId?: string;
  weekStart: string; // ISO date string for Monday of the week
  dayOfWeek: "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
  timeSlot: "morning" | "mid-morning" | "afternoon"; // Fixed slots only
  activityId: string; // Firebase document ID from activities collection
  activity?: Activity | null; // Populated activity reference
  target: {
    type: "class" | "all_classes" | "teacher" | "all_teachers";
    id?: string; // Firebase document ID
  };
  notes?: string;
  isHoliday?: boolean; // for monthly schedules
}

export interface TeacherSchedule {
  id: string;
  teacherId: string;
  teacher?: TeacherInfo; // populated in responses
  date: string;
  timeSlot: {
    start: string;
    end: string;
  };
  assignment: {
    type: "class" | "break" | "meeting" | "planning";
    classId?: string;
    class?: ClassInfo; // populated if type is "class"
    description?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Implementation Notes

1. **Authentication**: All endpoints require valid JWT token with appropriate role (teacher/admin)
2. **Validation**: Use joi or similar for request validation
3. **Database**: Consider indexing on date, classId, teacherId for performance
4. **Caching**: Cache class and teacher reference data
5. **Rate Limiting**: Apply rate limits to prevent abuse
6. **Logging**: Log all schedule changes for audit purposes