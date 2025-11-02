// Comprehensive Mock Data for Sunshine Daycare
import { EntryDoc } from '@sunshine/src/types/type';

// Realistic class data
export const mockClasses = [
  { id: 'class-1', name: 'Infant Room', ageRange: '6 weeks - 12 months', capacity: 8 },
  { id: 'class-2', name: 'Toddler Room', ageRange: '1 - 2 years', capacity: 12 },
  { id: 'class-3', name: 'Preschool Room', ageRange: '3 - 4 years', capacity: 16 },
  { id: 'class-4', name: 'Pre-K Room', ageRange: '4 - 5 years', capacity: 18 },
];

// Diverse, realistic child names
export const mockChildren = [
  // Infant Room (8 children)
  { id: 'child-1', firstName: 'Emma', lastName: 'Johnson', classId: 'class-1', dob: '2024-03-15' },
  { id: 'child-2', firstName: 'Liam', lastName: 'Chen', classId: 'class-1', dob: '2024-02-20' },
  { id: 'child-3', firstName: 'Sofia', lastName: 'Martinez', classId: 'class-1', dob: '2024-01-10' },
  { id: 'child-4', firstName: 'Noah', lastName: 'Williams', classId: 'class-1', dob: '2024-04-05' },
  { id: 'child-5', firstName: 'Ava', lastName: 'Patel', classId: 'class-1', dob: '2023-12-18' },
  { id: 'child-6', firstName: 'Oliver', lastName: 'Brown', classId: 'class-1', dob: '2024-05-22' },
  { id: 'child-7', firstName: 'Mia', lastName: 'Davis', classId: 'class-1', dob: '2024-03-30' },
  { id: 'child-8', firstName: 'Lucas', lastName: 'Kim', classId: 'class-1', dob: '2024-02-14' },

  // Toddler Room (12 children)
  { id: 'child-9', firstName: 'Isabella', lastName: 'Garcia', classId: 'class-2', dob: '2023-06-12' },
  { id: 'child-10', firstName: 'Ethan', lastName: 'Rodriguez', classId: 'class-2', dob: '2023-07-25' },
  { id: 'child-11', firstName: 'Charlotte', lastName: 'Wilson', classId: 'class-2', dob: '2023-05-08' },
  { id: 'child-12', firstName: 'Aiden', lastName: 'Taylor', classId: 'class-2', dob: '2023-08-14' },
  { id: 'child-13', firstName: 'Amelia', lastName: 'Anderson', classId: 'class-2', dob: '2023-04-30' },
  { id: 'child-14', firstName: 'Mason', lastName: 'Thomas', classId: 'class-2', dob: '2023-09-18' },
  { id: 'child-15', firstName: 'Harper', lastName: 'Jackson', classId: 'class-2', dob: '2023-06-28' },
  { id: 'child-16', firstName: 'Elijah', lastName: 'White', classId: 'class-2', dob: '2023-07-10' },
  { id: 'child-17', firstName: 'Evelyn', lastName: 'Harris', classId: 'class-2', dob: '2023-05-22' },
  { id: 'child-18', firstName: 'James', lastName: 'Martin', classId: 'class-2', dob: '2023-08-05' },
  { id: 'child-19', firstName: 'Luna', lastName: 'Thompson', classId: 'class-2', dob: '2023-04-15' },
  { id: 'child-20', firstName: 'Benjamin', lastName: 'Lopez', classId: 'class-2', dob: '2023-09-02' },

  // Preschool Room (16 children)
  { id: 'child-21', firstName: 'Sophia', lastName: 'Nguyen', classId: 'class-3', dob: '2021-10-12' },
  { id: 'child-22', firstName: 'Jackson', lastName: 'Hill', classId: 'class-3', dob: '2021-11-25' },
  { id: 'child-23', firstName: 'Aria', lastName: 'Scott', classId: 'class-3', dob: '2021-09-08' },
  { id: 'child-24', firstName: 'Sebastian', lastName: 'Green', classId: 'class-3', dob: '2021-12-14' },
  { id: 'child-25', firstName: 'Scarlett', lastName: 'Adams', classId: 'class-3', dob: '2021-08-30' },
  { id: 'child-26', firstName: 'Carter', lastName: 'Baker', classId: 'class-3', dob: '2022-01-18' },
  { id: 'child-27', firstName: 'Grace', lastName: 'Hall', classId: 'class-3', dob: '2021-10-28' },
  { id: 'child-28', firstName: 'Owen', lastName: 'Allen', classId: 'class-3', dob: '2021-11-10' },
  { id: 'child-29', firstName: 'Chloe', lastName: 'Young', classId: 'class-3', dob: '2021-09-22' },
  { id: 'child-30', firstName: 'Wyatt', lastName: 'King', classId: 'class-3', dob: '2021-12-05' },
  { id: 'child-31', firstName: 'Riley', lastName: 'Wright', classId: 'class-3', dob: '2021-08-15' },
  { id: 'child-32', firstName: 'Luke', lastName: 'Lewis', classId: 'class-3', dob: '2022-01-02' },
  { id: 'child-33', firstName: 'Zoe', lastName: 'Robinson', classId: 'class-3', dob: '2021-10-18' },
  { id: 'child-34', firstName: 'Levi', lastName: 'Walker', classId: 'class-3', dob: '2021-11-30' },
  { id: 'child-35', firstName: 'Layla', lastName: 'Perez', classId: 'class-3', dob: '2021-09-12' },
  { id: 'child-36', firstName: 'Jayden', lastName: 'Turner', classId: 'class-3', dob: '2021-12-25' },

  // Pre-K Room (18 children)
  { id: 'child-37', firstName: 'Ella', lastName: 'Campbell', classId: 'class-4', dob: '2020-06-12' },
  { id: 'child-38', firstName: 'Alexander', lastName: 'Parker', classId: 'class-4', dob: '2020-07-25' },
  { id: 'child-39', firstName: 'Avery', lastName: 'Evans', classId: 'class-4', dob: '2020-05-08' },
  { id: 'child-40', firstName: 'Michael', lastName: 'Edwards', classId: 'class-4', dob: '2020-08-14' },
  { id: 'child-41', firstName: 'Emily', lastName: 'Collins', classId: 'class-4', dob: '2020-04-30' },
  { id: 'child-42', firstName: 'Daniel', lastName: 'Stewart', classId: 'class-4', dob: '2020-09-18' },
  { id: 'child-43', firstName: 'Madison', lastName: 'Sanchez', classId: 'class-4', dob: '2020-06-28' },
  { id: 'child-44', firstName: 'Jacob', lastName: 'Morris', classId: 'class-4', dob: '2020-07-10' },
  { id: 'child-45', firstName: 'Abigail', lastName: 'Rogers', classId: 'class-4', dob: '2020-05-22' },
  { id: 'child-46', firstName: 'William', lastName: 'Reed', classId: 'class-4', dob: '2020-08-05' },
  { id: 'child-47', firstName: 'Sophie', lastName: 'Cook', classId: 'class-4', dob: '2020-04-15' },
  { id: 'child-48', firstName: 'Logan', lastName: 'Bailey', classId: 'class-4', dob: '2020-09-02' },
  { id: 'child-49', firstName: 'Natalie', lastName: 'Bell', classId: 'class-4', dob: '2020-06-18' },
  { id: 'child-50', firstName: 'Ryan', lastName: 'Cooper', classId: 'class-4', dob: '2020-07-30' },
  { id: 'child-51', firstName: 'Victoria', lastName: 'Richardson', classId: 'class-4', dob: '2020-05-12' },
  { id: 'child-52', firstName: 'David', lastName: 'Cox', classId: 'class-4', dob: '2020-08-25' },
  { id: 'child-53', firstName: 'Hannah', lastName: 'Howard', classId: 'class-4', dob: '2020-04-08' },
  { id: 'child-54', firstName: 'Joseph', lastName: 'Ward', classId: 'class-4', dob: '2020-09-14' },
];

// Helper function to generate realistic entries for the past week
export function generateMockEntries(): Partial<EntryDoc>[] {
  const entries: Partial<EntryDoc>[] = [];
  const today = new Date();
  const entryTypes = ['Attendance', 'Food', 'Sleep', 'Toilet', 'Activity', 'Note', 'Health'];

  // Generate entries for the past 7 days
  for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(0, 0, 0, 0);

    // Generate entries for each child
    mockChildren.forEach(child => {
      const childClass = mockClasses.find(c => c.id === child.classId);

      // Morning check-in (70% of children arrive between 7:30-9:00 AM)
      if (Math.random() > 0.3) {
        const checkInTime = new Date(date);
        checkInTime.setHours(7 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));

        entries.push({
          id: `entry-${entries.length}`,
          childId: child.id,
          childName: `${child.firstName} ${child.lastName}`,
          classId: child.classId,
          className: childClass?.name,
          type: 'Attendance',
          subtype: 'Check in',
          detail: `${child.firstName} arrived happy and ready for the day`,
          occurredAt: checkInTime,
          createdAt: checkInTime,
        });

        // Morning snack
        const snackTime = new Date(date);
        snackTime.setHours(9, 30);
        entries.push({
          id: `entry-${entries.length}`,
          childId: child.id,
          childName: `${child.firstName} ${child.lastName}`,
          classId: child.classId,
          className: childClass?.name,
          type: 'Food',
          subtype: 'Snack',
          detail: 'Apple slices and crackers',
          data: { amount: 'All' },
          occurredAt: snackTime,
          createdAt: snackTime,
        });

        // Activities (morning)
        const activityTime = new Date(date);
        activityTime.setHours(10, 15);
        const activities = ['Circle time', 'Story time', 'Arts and crafts', 'Music and movement', 'Sensory play'];
        entries.push({
          id: `entry-${entries.length}`,
          childId: child.id,
          childName: `${child.firstName} ${child.lastName}`,
          classId: child.classId,
          className: childClass?.name,
          type: 'Activity',
          detail: activities[Math.floor(Math.random() * activities.length)],
          occurredAt: activityTime,
          createdAt: activityTime,
        });

        // Lunch
        const lunchTime = new Date(date);
        lunchTime.setHours(12, 0);
        const lunchOptions = [
          'Chicken nuggets, rice, and vegetables',
          'Spaghetti with meat sauce and garlic bread',
          'Grilled cheese sandwich and tomato soup',
          'Mac and cheese with green beans',
          'Turkey sandwich with fruit salad'
        ];
        entries.push({
          id: `entry-${entries.length}`,
          childId: child.id,
          childName: `${child.firstName} ${child.lastName}`,
          classId: child.classId,
          className: childClass?.name,
          type: 'Food',
          subtype: 'Lunch',
          detail: lunchOptions[Math.floor(Math.random() * lunchOptions.length)],
          data: { amount: ['All', 'Most', 'Some'][Math.floor(Math.random() * 3)] },
          occurredAt: lunchTime,
          createdAt: lunchTime,
        });

        // Nap time (not for Pre-K)
        if (child.classId !== 'class-4') {
          const napStart = new Date(date);
          napStart.setHours(12, 45);
          entries.push({
            id: `entry-${entries.length}`,
            childId: child.id,
            childName: `${child.firstName} ${child.lastName}`,
            classId: child.classId,
            className: childClass?.name,
            type: 'Sleep',
            subtype: 'Started',
            detail: 'Fell asleep easily',
            occurredAt: napStart,
            createdAt: napStart,
          });

          const napEnd = new Date(date);
          napEnd.setHours(14, 30 + Math.floor(Math.random() * 30));
          entries.push({
            id: `entry-${entries.length}`,
            childId: child.id,
            childName: `${child.firstName} ${child.lastName}`,
            classId: child.classId,
            className: childClass?.name,
            type: 'Sleep',
            subtype: 'Woke up',
            detail: 'Woke up refreshed',
            occurredAt: napEnd,
            createdAt: napEnd,
          });
        }

        // Toilet entries (for potty training ages)
        if (['class-2', 'class-3'].includes(child.classId)) {
          const toiletTime = new Date(date);
          toiletTime.setHours(14, 0);
          entries.push({
            id: `entry-${entries.length}`,
            childId: child.id,
            childName: `${child.firstName} ${child.lastName}`,
            classId: child.classId,
            className: childClass?.name,
            type: 'Toilet',
            detail: 'Successful potty break',
            data: { toiletKind: Math.random() > 0.5 ? 'urine' : 'bm' },
            occurredAt: toiletTime,
            createdAt: toiletTime,
          });
        }

        // Afternoon snack
        const pmSnackTime = new Date(date);
        pmSnackTime.setHours(15, 0);
        entries.push({
          id: `entry-${entries.length}`,
          childId: child.id,
          childName: `${child.firstName} ${child.lastName}`,
          classId: child.classId,
          className: childClass?.name,
          type: 'Food',
          subtype: 'Snack',
          detail: 'Yogurt and graham crackers',
          data: { amount: 'Most' },
          occurredAt: pmSnackTime,
          createdAt: pmSnackTime,
        });

        // Afternoon activity
        const pmActivityTime = new Date(date);
        pmActivityTime.setHours(15, 45);
        const pmActivities = ['Outdoor play', 'Free play', 'Building blocks', 'Puzzles', 'Dance party'];
        entries.push({
          id: `entry-${entries.length}`,
          childId: child.id,
          childName: `${child.firstName} ${child.lastName}`,
          classId: child.classId,
          className: childClass?.name,
          type: 'Activity',
          detail: pmActivities[Math.floor(Math.random() * pmActivities.length)],
          occurredAt: pmActivityTime,
          createdAt: pmActivityTime,
        });

        // Occasional notes
        if (Math.random() > 0.7) {
          const noteTime = new Date(date);
          noteTime.setHours(16, 30);
          const notes = [
            'Had a great day today! Very engaged in activities.',
            'Played nicely with friends during free play.',
            'Showed interest in the science experiment.',
            'Helped clean up after snack time.',
            'Was a good friend to others today.'
          ];
          entries.push({
            id: `entry-${entries.length}`,
            childId: child.id,
            childName: `${child.firstName} ${child.lastName}`,
            classId: child.classId,
            className: childClass?.name,
            type: 'Note',
            detail: notes[Math.floor(Math.random() * notes.length)],
            occurredAt: noteTime,
            createdAt: noteTime,
          });
        }

        // Check out (between 4:30-6:00 PM)
        const checkOutTime = new Date(date);
        checkOutTime.setHours(16 + Math.floor(Math.random() * 2), 30 + Math.floor(Math.random() * 30));
        entries.push({
          id: `entry-${entries.length}`,
          childId: child.id,
          childName: `${child.firstName} ${child.lastName}`,
          classId: child.classId,
          className: childClass?.name,
          type: 'Attendance',
          subtype: 'Check out',
          detail: `${child.firstName} had a wonderful day!`,
          occurredAt: checkOutTime,
          createdAt: checkOutTime,
        });
      }
    });
  }

  return entries.sort((a, b) => (b.occurredAt?.getTime() || 0) - (a.occurredAt?.getTime() || 0));
}

// Universal daycare events for calendar
export const mockDaycareEvents = {
  // Current month events
  '2025-11-05': [
    { id: 'event-1', type: 'meeting', title: 'Staff Meeting', time: '4:00 PM', description: 'Monthly staff meeting - daycare closes at 3:30 PM' },
  ],
  '2025-11-08': [
    { id: 'event-2', type: 'activity', title: 'Picture Day', time: 'All Day', description: 'Professional photos for all classes' },
  ],
  '2025-11-11': [
    { id: 'event-3', type: 'holiday', title: 'Veterans Day', time: 'All Day', description: 'Daycare closed' },
  ],
  '2025-11-15': [
    { id: 'event-4', type: 'activity', title: 'Parent-Teacher Conferences', time: '3:00-6:00 PM', description: 'Schedule your time slot with your teacher' },
  ],
  '2025-11-20': [
    { id: 'event-5', type: 'birthday', title: 'Thanksgiving Feast', time: '11:30 AM', description: 'Parents invited to join us for lunch' },
  ],
  '2025-11-22': [
    { id: 'event-6', type: 'activity', title: 'Fall Festival', time: '10:00 AM', description: 'Outdoor activities and games' },
  ],
  '2025-11-27': [
    { id: 'event-7', type: 'holiday', title: 'Thanksgiving Break', time: 'All Day', description: 'Daycare closed' },
  ],
  '2025-11-28': [
    { id: 'event-8', type: 'holiday', title: 'Thanksgiving Break', time: 'All Day', description: 'Daycare closed' },
  ],
  '2025-11-29': [
    { id: 'event-9', type: 'holiday', title: 'Thanksgiving Break', time: 'All Day', description: 'Daycare closed' },
  ],
  // Next month preview
  '2025-12-06': [
    { id: 'event-10', type: 'activity', title: 'Holiday Concert', time: '6:00 PM', description: 'All classes perform holiday songs' },
  ],
  '2025-12-13': [
    { id: 'event-11', type: 'activity', title: 'Cookie Decorating', time: '2:00 PM', description: 'Parents welcome to join' },
  ],
  '2025-12-20': [
    { id: 'event-12', type: 'activity', title: 'Holiday Party', time: '10:00 AM', description: 'Class parties and gift exchange' },
  ],
  '2025-12-24': [
    { id: 'event-13', type: 'holiday', title: 'Winter Break Begins', time: 'All Day', description: 'Daycare closed Dec 24 - Jan 1' },
  ],
};

// Mock teacher data
export const mockTeachers = [
  { id: 'teacher-1', name: 'Sarah Johnson', role: 'Lead Teacher', classId: 'class-1', email: 'sarah.j@sunshine.com' },
  { id: 'teacher-2', name: 'Maria Garcia', role: 'Assistant Teacher', classId: 'class-1', email: 'maria.g@sunshine.com' },
  { id: 'teacher-3', name: 'Jennifer Smith', role: 'Lead Teacher', classId: 'class-2', email: 'jennifer.s@sunshine.com' },
  { id: 'teacher-4', name: 'Amanda Brown', role: 'Assistant Teacher', classId: 'class-2', email: 'amanda.b@sunshine.com' },
  { id: 'teacher-5', name: 'Rebecca Davis', role: 'Lead Teacher', classId: 'class-3', email: 'rebecca.d@sunshine.com' },
  { id: 'teacher-6', name: 'Lisa Wilson', role: 'Assistant Teacher', classId: 'class-3', email: 'lisa.w@sunshine.com' },
  { id: 'teacher-7', name: 'Patricia Miller', role: 'Lead Teacher', classId: 'class-4', email: 'patricia.m@sunshine.com' },
  { id: 'teacher-8', name: 'Nancy Anderson', role: 'Assistant Teacher', classId: 'class-4', email: 'nancy.a@sunshine.com' },
];

// Settings data for More page dropdowns
export const mockSettings = {
  profile: {
    notifications: {
      pushEnabled: true,
      emailEnabled: true,
      smsEnabled: false,
      quietHours: { start: '20:00', end: '07:00' },
    },
    privacy: {
      photoSharing: true,
      activityVisible: true,
      contactInfoVisible: false,
    },
    preferences: {
      language: 'English',
      timeFormat: '12-hour',
      dateFormat: 'MM/DD/YYYY',
    },
  },
  help: {
    faqs: [
      { q: 'What are the daycare hours?', a: 'We are open Monday-Friday, 7:00 AM to 6:00 PM.' },
      { q: 'How do I update my child\'s information?', a: 'Contact the office or use the app settings.' },
      { q: 'What is the late pickup policy?', a: '$1 per minute after 6:00 PM.' },
      { q: 'How do I report an absence?', a: 'Call the office or message through the app by 9:00 AM.' },
    ],
    contactSupport: {
      phone: '(555) 123-4567',
      email: 'support@sunshinedaycare.com',
      hours: 'Mon-Fri 8:00 AM - 5:00 PM',
    },
  },
  payment: {
    methods: [
      { type: 'Credit Card', last4: '4242', brand: 'Visa', isDefault: true },
      { type: 'Bank Account', last4: '6789', bank: 'Chase', isDefault: false },
    ],
    history: [
      { date: '2025-11-01', amount: 1200, description: 'November Tuition', status: 'Paid' },
      { date: '2025-10-01', amount: 1200, description: 'October Tuition', status: 'Paid' },
      { date: '2025-09-01', amount: 1200, description: 'September Tuition', status: 'Paid' },
    ],
    upcomingInvoices: [
      { dueDate: '2025-12-01', amount: 1200, description: 'December Tuition' },
    ],
  },
};