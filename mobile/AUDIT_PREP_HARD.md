# Audit Preparation: Hard Level
## Teacher Dashboard (dashboard.tsx)

**Time to prepare:** 90 minutes
**Focus:** Deep technical understanding, performance, Firebase patterns, edge cases

---

## 1. Advanced Firebase Questions

### Q1: "Explain the onSnapshot pattern. Why not just use getDocs()?"

**Reference Code:**
```tsx
// Lines 147-171
useEffect(() => {
  const q = query(collection(db, "children"), where("status", "==", "enrolled"));
  const unsub = onSnapshot(
    q,
    (snap) => {
      const rows: Child[] = snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: d.id,
          name: x.name ?? "(no name)",
          classroomId: x.classroomId,
          status: x.status,
        };
      });
      rows.sort((a, b) => a.name.localeCompare(b.name));
      setChildren(rows);
      setLoading(false);
    },
    () => {
      setChildren([]);
      setLoading(false);
    }
  );
  return () => unsub();
}, []);
```

**Deep Answer:**

### onSnapshot (Real-time Listener)
**Pros:**
- **Automatic updates** - When data changes in Firestore, component updates instantly
- **Multi-device sync** - If another teacher adds/removes a child, all devices update
- **No polling needed** - Server pushes updates via WebSocket
- **Optimistic UI possible** - Can show pending changes immediately

**Cons:**
- **Read costs** - Every update counts as a document read
- **Memory overhead** - Maintains active connection
- **Battery impact** - Persistent connection drains battery
- **Must cleanup** - Failing to unsubscribe causes memory leaks

### getDocs() (One-time Fetch)
**Pros:**
- **Lower costs** - Only reads when called
- **Simpler logic** - No listener management
- **Better for static data** - Perfect for reference data

**Cons:**
- **Manual refresh** - Must call again to get updates
- **Stale data risk** - User sees outdated information
- **No collaboration** - Multi-user changes not reflected

### When to Use Each?

| Scenario | Best Choice |
|----------|-------------|
| Child enrollment (this component) | `onSnapshot` - enrollment changes often |
| User profile settings | `getDocs()` - settings rarely change |
| Real-time attendance tracking | `onSnapshot` - needs live updates |
| Historical reports | `getDocs()` - data doesn't change |
| Chat messages | `onSnapshot` - must be real-time |

**In this app:** Children enrollment can change throughout the day (new enrollments, status changes), so `onSnapshot` ensures teachers always see current data.

---

### Q2: "What are the performance implications of this Firebase query?"

**Reference Code:**
```tsx
const q = query(collection(db, "children"), where("status", "==", "enrolled"));
```

**Deep Answer:**

### Read Costs
- **Documents read:** All children with `status == "enrolled"`
- **Billing:** Each document counts as 1 read
- **With 50 children:** 50 reads on initial load
- **On update:** Only changed documents (delta sync)

### Index Requirements
Firestore needs a composite index for:
```
Collection: children
Fields: status (Ascending), __name__ (Ascending)
```

**Without this index:** Query fails with error

### Optimization Strategies

**1. Limit results if possible**
```tsx
const q = query(
  collection(db, "children"),
  where("status", "==", "enrolled"),
  limit(100) // Cap at 100 children
);
```

**2. Use client-side caching**
```tsx
const q = query(
  collection(db, "children"),
  where("status", "==", "enrolled")
);

const unsub = onSnapshot(
  q,
  { includeMetadataChanges: false }, // Ignore metadata-only updates
  (snap) => {
    if (snap.metadata.fromCache) {
      // Data from cache - free!
    } else {
      // Data from server - costs reads
    }
  }
);
```

**3. Add field filtering**
```tsx
// Only fetch necessary fields (not possible with Firestore SDK)
// But keep document structure minimal
```

### Network Impact
- **Initial connection:** Downloads all matching documents (~50 children × 500 bytes = 25KB)
- **Updates:** Only delta changes sent
- **Offline:** Uses local cache, syncs when online

### Memory Impact
- Stores snapshot in memory
- Listener maintains connection state
- Must unsubscribe to free memory

**This query is appropriate because:**
- Enrollment data changes frequently
- Teacher needs live updates
- Document count is manageable (<1000)
- Benefits outweigh costs for this use case

---

### Q3: "How does the cleanup function prevent memory leaks?"

**Reference Code:**
```tsx
return () => unsub();
```

**Deep Answer:**

### What's Happening?

**Without cleanup:**
```
Component mounts → Listener created → Connection open
Component unmounts → Listener STILL RUNNING → Memory leak
Navigator switches tabs → Old listeners pile up
After 10 tab switches → 10 active listeners!
```

**With cleanup:**
```
Component mounts → Listener created → Connection open
Component unmounts → useEffect cleanup runs → unsub() called
Listener removed → Connection closed → Memory freed
```

### Under the Hood

When `onSnapshot` is called:
1. Firestore client opens WebSocket connection
2. Server registers listener for your query
3. Listener stores callback in memory
4. Subscription object returned with `unsub()` method

When `unsub()` is called:
1. Client sends "unsubscribe" message to server
2. Server removes listener registration
3. Client closes WebSocket if no other listeners
4. Callback reference removed from memory
5. Garbage collector can free memory

### Real-World Impact

**Scenario:** Teacher switches between Dashboard, Calendar, and More tabs 20 times

**Without cleanup:**
- 20 active Firebase listeners
- 20 WebSocket connections
- Memory: ~20MB for connection overhead
- Battery drain from persistent connections
- Potential quota limits hit

**With cleanup:**
- 1 active listener (current tab only)
- 1 WebSocket connection
- Memory: ~1MB
- Normal battery usage

### Best Practice Pattern

```tsx
useEffect(() => {
  // Setup code
  const resource = createResource();

  // Cleanup function
  return () => {
    resource.cleanup();
  };
}, [dependencies]);
```

**Always cleanup:**
- Firebase listeners (`onSnapshot`)
- Event listeners (`addEventListener`)
- Timers (`setInterval`, `setTimeout`)
- Subscriptions (RxJS, etc.)
- WebSocket connections

---

## 2. Advanced Performance Questions

### Q4: "Deep dive into useMemo - when does it recalculate?"

**Reference Code:**
```tsx
// Lines 174-180
const classrooms = useMemo(() => {
  const unique = new Set<string>();
  children.forEach((c) => {
    if (c.classroomId) unique.add(c.classroomId);
  });
  return Array.from(unique).sort();
}, [children]);

// Lines 183-186
const filteredChildren = useMemo(() => {
  if (selectedClass === "all") return children;
  return children.filter((c) => c.classroomId === selectedClass);
}, [children, selectedClass]);
```

**Deep Answer:**

### Memoization Mechanics

**useMemo creates a cache:**
```
{
  dependencies: [children],
  cachedValue: ["Room A", "Room B", "Room C"]
}
```

**On every render, React checks:**
1. Have dependencies changed? (shallow comparison using `Object.is`)
2. If NO → Return cached value (fast)
3. If YES → Run calculation again (slower)

### Dependency Array Comparison

**children array changes when:**
```tsx
setChildren([...newChildren]) // New array reference → useMemo recalculates
```

**children array DOESN'T change when:**
```tsx
// Same render, no state update → useMemo returns cached value
```

### Performance Analysis

**Without useMemo:**
```
Every render:
  1. Extract unique classrooms from all children
  2. Create Set
  3. Convert to Array
  4. Sort array

For 50 children:
  - 50 loop iterations
  - Set operations
  - Array conversion
  - Sort algorithm (O(n log n))

Total: ~100 operations per render
```

**With useMemo:**
```
Most renders:
  - Check if children === previousChildren
  - Return cached value

Total: ~2 operations per render (99% faster)

Only recalculates when children actually changes
```

### Render Frequency

**This component re-renders when:**
1. `children` state changes (Firebase update)
2. `selectedClass` state changes (user picks class)
3. `selectedChildren` state changes (user picks children)
4. `showClassPicker` changes (modal open/close)
5. `showChildPicker` changes (modal open/close)
6. `loading` state changes (initial load)

**Without useMemo:** 6 types of renders × unique classroom calculation = wasted work
**With useMemo:** Only recalculates when `children` changes (1 of 6 scenarios)

### Memory Trade-off

**useMemo cost:**
- Stores previous dependencies in memory (~8 bytes per primitive)
- Stores cached result in memory (array of strings ~100 bytes)
- Total overhead: ~108 bytes

**useMemo benefit:**
- Avoids recalculation: Saves ~50-200ms CPU time per render
- Prevents re-rendering child components that depend on this value
- Net benefit for any calculation >10ms

### When NOT to use useMemo

```tsx
// ❌ Don't memoize simple calculations
const doubled = useMemo(() => count * 2, [count]); // Overhead > benefit

// ✅ Do memoize expensive operations
const sorted = useMemo(() =>
  children.filter(c => c.age > 5).sort((a, b) => a.name.localeCompare(b.name)),
  [children]
);
```

---

### Q5: "What happens if two state updates occur simultaneously?"

**Scenario:**
```tsx
// Firebase sends update
setChildren(newChildren);

// User clicks class selector at same time
setSelectedClass("Room A");
```

**Deep Answer:**

### React Batching (React 18+)

React **automatically batches** state updates:

```tsx
function handleClick() {
  setChildren(newData);      // Queued
  setSelectedClass("Room A"); // Queued
  setLoading(false);          // Queued

  // React batches all three updates
  // Only ONE re-render occurs
}
```

### Event Loop Timing

**Firebase update (async callback):**
```
Firebase server → Network → onSnapshot callback → setChildren() → Event queue
```

**User click (sync event):**
```
Touch screen → Native event → React event → setSelectedClass() → Event queue
```

**React 18 batches both!**
```
Event loop tick:
  1. Collect all pending state updates
  2. Merge them
  3. Calculate new state
  4. Single re-render with all changes
```

### State Update Order

```tsx
// Current state
children: [...oldChildren]
selectedClass: "all"

// Updates queued
setChildren([...newChildren])
setSelectedClass("Room A")

// After batching
children: [...newChildren]  // ✅ Both applied
selectedClass: "Room A"      // ✅ Both applied
```

**React guarantees:**
- All queued updates applied
- Order preserved within same event
- No lost updates

### Potential Race Condition

```tsx
// ⚠️ This could be a problem:
const filteredChildren = useMemo(() => {
  if (selectedClass === "all") return children;
  return children.filter((c) => c.classroomId === selectedClass);
}, [children, selectedClass]);

// If children updates but selectedClass references old classroom:
children: [{ id: 1, classroomId: "Room A" }, { id: 2, classroomId: "Room B" }]
selectedClass: "Room C" // ← Classroom no longer exists!

// Result: Empty array (not a crash, but potentially confusing)
```

**Mitigation:**
```tsx
useEffect(() => {
  // Reset selectedClass if it's no longer valid
  if (selectedClass !== "all" && !classrooms.includes(selectedClass)) {
    setSelectedClass("all");
  }
}, [classrooms, selectedClass]);
```

---

### Q6: "Analyze the time complexity of your filtering logic"

**Reference Code:**
```tsx
const classrooms = useMemo(() => {
  const unique = new Set<string>();
  children.forEach((c) => {
    if (c.classroomId) unique.add(c.classroomId);
  });
  return Array.from(unique).sort();
}, [children]);

const filteredChildren = useMemo(() => {
  if (selectedClass === "all") return children;
  return children.filter((c) => c.classroomId === selectedClass);
}, [children, selectedClass]);
```

**Deep Answer:**

### Big O Analysis

**classrooms calculation:**
```
n = number of children
m = number of unique classrooms

forEach loop:           O(n)
Set.add (hash insert):  O(1) per operation
Total loop:             O(n)

Array.from(Set):        O(m)
Array.sort():           O(m log m)

Total: O(n + m log m)
```

**Typical scenario:**
- 50 children (n = 50)
- 5 classrooms (m = 5)
- O(50 + 5 log 5) ≈ O(50 + 12) = **62 operations**

**filteredChildren calculation:**
```
Best case (selectedClass === "all"):  O(1)  // Just return reference
Worst case (filter all):               O(n)  // Check each child

Average case: O(n) where n = 50
```

### Space Complexity

**classrooms:**
```
Set storage:         O(m) = 5 classrooms × 10 bytes = 50 bytes
Array output:        O(m) = 5 strings × 20 bytes = 100 bytes
Total:               O(m) = ~150 bytes
```

**filteredChildren:**
```
Best case:   O(1) // Returns reference to existing array
Worst case:  O(n) // Creates new array with filtered children

If 10 children match filter:
  10 × 200 bytes per object reference = 2KB
```

### Scalability Analysis

| Children | Classrooms | classrooms calc | filteredChildren |
|----------|-----------|-----------------|------------------|
| 50       | 5         | ~62 ops         | ~50 ops          |
| 100      | 10        | ~133 ops        | ~100 ops         |
| 500      | 20        | ~586 ops        | ~500 ops         |
| 1000     | 30        | ~1147 ops       | ~1000 ops        |

**Performance remains good up to ~1000 children**

### Optimization Opportunities

**Current approach:**
```tsx
// Creates new array every time
children.filter((c) => c.classroomId === selectedClass)
```

**Optimized with Map:**
```tsx
// Build index once
const childrenByClass = useMemo(() => {
  const map = new Map<string, Child[]>();
  children.forEach(child => {
    const classId = child.classroomId || 'none';
    if (!map.has(classId)) map.set(classId, []);
    map.get(classId)!.push(child);
  });
  return map;
}, [children]);

// O(1) lookup instead of O(n) filter
const filteredChildren = selectedClass === "all"
  ? children
  : childrenByClass.get(selectedClass) || [];
```

**Trade-offs:**
- **Current:** Simple code, O(n) filter
- **Optimized:** Complex code, O(1) lookup, but O(n) to build index
- **Worth it?** Only if filter operation happens frequently (it doesn't in this component)

**Verdict:** Current implementation is fine for expected scale (<500 children)

---

## 3. Advanced State Management Questions

### Q7: "Why use an array of IDs instead of an array of Child objects for selectedChildren?"

**Reference Code:**
```tsx
const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
```

**Deep Answer:**

### Approach Comparison

**Option 1: Array of IDs (current)**
```tsx
const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
// Example: ["child_123", "child_456", "child_789"]
```

**Option 2: Array of Child objects (alternative)**
```tsx
const [selectedChildren, setSelectedChildren] = useState<Child[]>([]);
// Example: [{ id: "child_123", name: "Emma", ... }, { id: "child_456", ... }]
```

### Benefits of Array of IDs

**1. Memory Efficiency**
```
IDs: ["child_123", "child_456"]
Size: 2 × 20 bytes = 40 bytes

Objects: [{ id: "child_123", name: "Emma Johnson", classroomId: "Room A", status: "enrolled" }, ...]
Size: 2 × 200 bytes = 400 bytes

Savings: 90% less memory
```

**2. Single Source of Truth**
```tsx
// ✅ Children data lives in ONE place
const [children, setChildren] = useState<Child[]>([]);
const [selectedChildren, setSelectedChildren] = useState<string[]>([]);

// To get selected child objects:
const selectedChildObjects = selectedChildren
  .map(id => children.find(c => c.id === id))
  .filter(Boolean);
```

**Why this matters:**
- When Firebase updates child data, only `children` state needs updating
- `selectedChildren` IDs remain valid
- No need to sync two copies of the same data

**3. No Stale Data**
```tsx
// ❌ Problem with storing objects:
setSelectedChildren([{ id: "1", name: "Emma", age: 3 }]);

// Later, Emma's age updates in Firebase:
setChildren([{ id: "1", name: "Emma", age: 4 }]); // ← Updated in children

// But selectedChildren still has old data!
// selectedChildren[0].age === 3 (stale!)
```

```tsx
// ✅ With IDs:
setSelectedChildren(["1"]);

// When Emma updates:
const child = children.find(c => c.id === "1");
// Always gets latest data
```

**4. Easier Comparison**
```tsx
// Check if child is selected
selectedChildren.includes(child.id) // Simple string comparison

// vs.
selectedChildren.some(sc => sc.id === child.id) // Object comparison
```

**5. Simpler Toggle Logic**
```tsx
// Toggle selection with IDs
if (selectedChildren.includes(childId)) {
  setSelectedChildren(selectedChildren.filter(id => id !== childId));
} else {
  setSelectedChildren([...selectedChildren, childId]);
}

// vs. Toggle with objects (more complex)
if (selectedChildren.some(sc => sc.id === child.id)) {
  setSelectedChildren(selectedChildren.filter(sc => sc.id !== child.id));
} else {
  setSelectedChildren([...selectedChildren, child]);
}
```

### When to Store Objects Instead

**Use Case:** If you need to preserve selection even after children data changes

```tsx
// Example: Form draft that persists across data refreshes
const [draftEntry, setDraftEntry] = useState({
  children: [{ id: "1", name: "Emma", age: 3 }], // Snapshot at time of selection
  type: "meal",
  time: "12:00 PM"
});

// Even if child's data updates, draft preserves original values
```

**In this component:** IDs are the correct choice because we always want current child data.

---

### Q8: "What would happen if you removed useMemo from filteredChildren?"

**Reference Code:**
```tsx
const filteredChildren = useMemo(() => {
  if (selectedClass === "all") return children;
  return children.filter((c) => c.classroomId === selectedClass);
}, [children, selectedClass]);
```

**Deep Answer:**

### Without useMemo

```tsx
// Every render creates a NEW array
const filteredChildren = selectedClass === "all"
  ? children
  : children.filter((c) => c.classroomId === selectedClass);
```

### Impact Analysis

**1. Referential Equality Breaks**

```tsx
// Render 1
const filteredChildren = children.filter(...); // Array #1

// Render 2 (unrelated state change, like showClassPicker = true)
const filteredChildren = children.filter(...); // Array #2 (different reference!)

// Even though content is identical:
Array #1 === Array #2  // false ❌
```

**Why this matters:**

```tsx
// Child component receives filteredChildren
<ChildrenList data={filteredChildren} />

// React's reconciliation:
function ChildrenList({ data }) {
  useEffect(() => {
    console.log("Data changed");
    // Re-run expensive operation
  }, [data]); // ← Triggers every render because new array reference!
}
```

**2. Wasted Re-renders**

```tsx
// Parent component
function TeacherDashboard() {
  const [showClassPicker, setShowClassPicker] = useState(false);

  // Without useMemo: Creates new array on every render
  const filteredChildren = children.filter((c) => c.classroomId === selectedClass);

  // This component re-renders when modal opens
  setShowClassPicker(true); // Causes re-render

  // filteredChildren gets new reference
  // All child components that use filteredChildren re-render unnecessarily
}
```

**3. Performance Impact**

**Modal interaction timeline:**

```
User taps "Select Class" button
  → setShowClassPicker(true)
  → Component re-renders
  → WITHOUT useMemo: Runs filter() on 50 children (~50 operations)
  → WITH useMemo: Returns cached array (2 operations)

User taps "Cancel" to close modal
  → setShowClassPicker(false)
  → Component re-renders again
  → WITHOUT useMemo: Runs filter() again (~50 operations)
  → WITH useMemo: Returns cached array (2 operations)
```

**Total for one modal open/close:**
- Without useMemo: ~100 operations
- With useMemo: ~4 operations
- **Savings: 96% fewer operations**

**4. Render Count Analysis**

**State variables that trigger re-renders:**
1. `children` (Firebase updates)
2. `selectedClass` (user picks class)
3. `selectedChildren` (user picks children)
4. `showClassPicker` (modal open/close)
5. `showChildPicker` (modal open/close)
6. `loading` (initial load)

**Typical user session (5 minutes):**
- 2 Firebase updates = 2 renders
- 3 class changes = 3 renders
- 5 child selections = 5 renders
- 10 modal toggles = 10 renders
- **Total: 20 renders**

**Without useMemo:**
- 20 renders × 50 filter operations = **1,000 operations**
- Only 5 of these renders actually need new filtered data

**With useMemo:**
- 5 renders × 50 filter operations = **250 operations**
- 15 renders × 2 cache lookups = **30 operations**
- **Total: 280 operations (72% savings)**

### Real-World Impact

**Low-end device (older phone):**
- Filter operation: ~2ms
- Without useMemo: 20 renders × 2ms = 40ms
- With useMemo: 5 renders × 2ms = 10ms
- **UI feels more responsive**

**High-end device:**
- Filter operation: ~0.5ms
- Difference negligible

### Visual Manifestation

**Without useMemo:**
```
User taps modal button
  ↓
Brief lag before modal appears (computing filter during render)
  ↓
Modal opens
```

**With useMemo:**
```
User taps modal button
  ↓
Modal opens immediately (cached value used)
```

**Conclusion:** useMemo is essential here because `filteredChildren` is used in multiple places and the component re-renders frequently from unrelated state changes.

---

## 4. Advanced Architecture Questions

### Q9: "How would you handle race conditions in Firebase updates?"

**Scenario:**
```
1. Teacher selects child "Emma"
2. Another teacher deletes Emma from system
3. Firebase sends update removing Emma
4. Current teacher tries to create entry for Emma
```

**Deep Answer:**

### Current Vulnerability

```tsx
const handleEntryTypePress = async (type: EntryType) => {
  if (selectedChildren.length === 0) {
    Alert.alert("Select Children", "Please select at least one child first");
    return;
  }

  // ⚠️ No validation that selected children still exist!
  console.log("Creating entry:", type.id, selectedChildren);
};
```

**What could go wrong:**
```
selectedChildren = ["child_123", "child_456"]

// child_123 gets deleted by admin
// But selectedChildren still references it!

// Entry creation fails with "child not found" error
```

### Solution 1: Validate Before Creating

```tsx
const handleEntryTypePress = async (type: EntryType) => {
  // Validate all selected children still exist
  const validChildren = selectedChildren
    .map(id => children.find(c => c.id === id))
    .filter(Boolean);

  if (validChildren.length === 0) {
    Alert.alert("Error", "Selected children are no longer enrolled");
    setSelectedChildren([]); // Clear invalid selections
    return;
  }

  if (validChildren.length < selectedChildren.length) {
    const missing = selectedChildren.length - validChildren.length;
    Alert.alert(
      "Warning",
      `${missing} selected child(ren) were removed. Continue with remaining?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => {
            setSelectedChildren(validChildren.map(c => c.id));
            createEntry(type, validChildren);
          }
        }
      ]
    );
    return;
  }

  // All valid, proceed
  createEntry(type, validChildren);
};
```

### Solution 2: Auto-Clean Invalid Selections

```tsx
useEffect(() => {
  // Remove any selected children that no longer exist
  const validIds = selectedChildren.filter(id =>
    children.some(c => c.id === id)
  );

  if (validIds.length !== selectedChildren.length) {
    setSelectedChildren(validIds);

    // Optional: Notify user
    if (validIds.length === 0) {
      Alert.alert("Notice", "Selected children were removed from the system");
    }
  }
}, [children, selectedChildren]);
```

### Solution 3: Optimistic UI with Rollback

```tsx
const createEntry = async (type: EntryType, childrenIds: string[]) => {
  // Optimistic update: Show success immediately
  const tempId = `temp_${Date.now()}`;
  const optimisticEntry = {
    id: tempId,
    type: type.id,
    children: childrenIds,
    createdAt: new Date(),
  };

  // Show in UI
  setEntries(prev => [...prev, optimisticEntry]);

  try {
    // Attempt to create in Firebase
    const docRef = await addDoc(collection(db, "entries"), {
      type: type.id,
      children: childrenIds,
      createdAt: serverTimestamp(),
      teacherId: auth.currentUser?.uid,
    });

    // Replace temp ID with real ID
    setEntries(prev =>
      prev.map(e => e.id === tempId ? { ...e, id: docRef.id } : e)
    );

    Alert.alert("Success", `${type.label} entry created`);
  } catch (error) {
    // Rollback on failure
    setEntries(prev => prev.filter(e => e.id !== tempId));

    if (error.code === "not-found") {
      Alert.alert("Error", "One or more children no longer exist");
      // Refresh children list
      // (onSnapshot should handle this automatically)
    } else {
      Alert.alert("Error", "Failed to create entry. Please try again.");
    }
  }
};
```

### Solution 4: Transaction-based Creation

```tsx
import { runTransaction, doc } from "firebase/firestore";

const createEntry = async (type: EntryType, childrenIds: string[]) => {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Verify all children exist
      const childDocs = await Promise.all(
        childrenIds.map(id => transaction.get(doc(db, "children", id)))
      );

      const missingChildren = childDocs.filter(doc => !doc.exists());
      if (missingChildren.length > 0) {
        throw new Error("Some children no longer exist");
      }

      // 2. Verify all children are enrolled
      const notEnrolled = childDocs.filter(doc => doc.data()?.status !== "enrolled");
      if (notEnrolled.length > 0) {
        throw new Error("Some children are no longer enrolled");
      }

      // 3. Create entry (atomic operation)
      const entryRef = doc(collection(db, "entries"));
      transaction.set(entryRef, {
        type: type.id,
        children: childrenIds,
        createdAt: serverTimestamp(),
        teacherId: auth.currentUser?.uid,
      });
    });

    Alert.alert("Success", `${type.label} entry created`);
  } catch (error) {
    Alert.alert("Error", error.message);
    // Refresh selections
    setSelectedChildren([]);
  }
};
```

**Best Practice:** Combine Solutions 2 (auto-clean) + Solution 1 (validate before create) for best UX.

---

### Q10: "Design a retry mechanism for failed Firebase operations"

**Deep Answer:**

### Exponential Backoff Implementation

```tsx
class FirebaseRetry {
  private maxRetries = 3;
  private baseDelay = 1000; // 1 second

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        // Calculate delay: 1s, 2s, 4s
        const delay = this.baseDelay * Math.pow(2, attempt);

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 1000;
        const totalDelay = delay + jitter;

        console.log(
          `${operationName} failed (attempt ${attempt + 1}/${this.maxRetries}). ` +
          `Retrying in ${totalDelay}ms...`
        );

        await this.sleep(totalDelay);
      }
    }

    // All retries exhausted
    throw new Error(
      `${operationName} failed after ${this.maxRetries} attempts: ${lastError.message}`
    );
  }

  private isNonRetryableError(error: any): boolean {
    const nonRetryableCodes = [
      "permission-denied",  // User lacks permissions
      "not-found",          // Document doesn't exist
      "invalid-argument",   // Bad request
      "already-exists",     // Duplicate entry
    ];

    return nonRetryableCodes.includes(error.code);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const retry = new FirebaseRetry();

const createEntry = async (type: EntryType, childrenIds: string[]) => {
  try {
    const result = await retry.executeWithRetry(
      () => addDoc(collection(db, "entries"), {
        type: type.id,
        children: childrenIds,
        createdAt: serverTimestamp(),
      }),
      "Create entry"
    );

    Alert.alert("Success", "Entry created");
  } catch (error) {
    Alert.alert("Error", "Failed to create entry after multiple attempts");
  }
};
```

### Network Status Integration

```tsx
import NetInfo from "@react-native-community/netinfo";

useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    if (!state.isConnected) {
      Alert.alert(
        "Offline",
        "You're offline. Changes will sync when connection is restored."
      );
    }
  });

  return () => unsubscribe();
}, []);
```

---

## 5. Quick Reference: Advanced Concepts

### Firebase Patterns
```
onSnapshot vs getDocs
├── Real-time updates needed? → onSnapshot
├── Static/historical data? → getDocs
├── Frequent changes? → onSnapshot
└── Cost-sensitive? → getDocs with manual refresh

Cleanup patterns
├── Always return unsub function
├── Call in useEffect cleanup
└── Prevents memory leaks

Query optimization
├── Add composite indexes
├── Use limit() when possible
├── Filter client-side if cheap
└── Cache with includeMetadataChanges
```

### Performance Patterns
```
useMemo
├── Use for expensive calculations (>10ms)
├── Use when value used in dependencies
├── Don't use for simple math
└── Trade memory for CPU time

State shape
├── IDs over objects (single source of truth)
├── Normalized data structures
├── Avoid duplicating data
└── Keep state minimal
```

---

## Practice Scenarios

1. **Firebase goes down for 30 seconds** - What happens to your UI?
2. **1000 children enrolled** - Does your filter still perform well?
3. **Teacher on 3G connection** - How does real-time sync behave?
4. **Two teachers select same child simultaneously** - Any conflicts?
5. **Memory leak from unclosed listener** - How would you debug?

---

**Review this for 90 minutes, then move to HARDCORE level tomorrow!**
