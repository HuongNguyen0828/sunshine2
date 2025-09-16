# Set up the app

## Backend: Node.js / Express / Nest.js backend

mkdir backend && cd backend
npm init -y
npm install express cors body-parser dotenv
npm install --save-dev typescript ts-node @types/node @types/express nodemon
npx tsc --init

## Mobile: Inclduing for parent and teacher: React Native / Expo app (optional)

cd mobile
npx create expo app@latest

## web-admin: React / Next.js admin dashboard

npx create-next-app@latest web-admin --typescript

# App structure:

daycare-app/
│
├─ backend/ # Node.js / Express / Nest.js API
│ ├─ src/
│ │ ├─ controllers/ # Handle HTTP requests
│ │ ├─ models/ # Database schemas (ORM or raw SQL
│ │ ├─ routes/ # Define routes & map to controllers
│ │ ├─ services/ # Business logic
│ │ └─ server.ts # App entry point
│ ├─ package.json
│ └─ tsconfig.json
│
├─ shared/ # Shared code (Types, API utils)
│ ├─ types/
│ │ ├─ Child.ts
│ │ ├─ Parent.ts
│ │ ├─ Teacher.ts
│ │ └─ Entry.ts
│ ├─ api/
│ │ ├─ client.ts # Axios / fetch wrapper
│ │ └─ endpoints.ts # API paths constants
│ └─ utils/
│ └─ helpers.ts # shared helper functions
│
├─ web-admin/ # Admin Dashboard (React / Next.js)
│ ├─ app/
│ ├─ components/
│ │ ├─ KidsTable.tsx
│ │ ├─ ParentsTable.tsx
│ │ ├─ TeachersTable.tsx
│ │ ├─ ClassesTable.tsx
│ │ └─ ReportGenerator.tsx
│ ├─ hooks/
│ │ └─ useFetchChildren.ts
│ ├─ lib/
│ │ └─ api.ts
│ ├─ package.json
│ └─ tsconfig.json
│
└─ mobile-app/ # Mobile App (React Native / Expo)
├─ screens/
│ ├─ KidsScreen.tsx
│ ├─ ParentsScreen.tsx
│ ├─ TeacherEntriesScreen.tsx
│ └─ ReportsScreen.tsx
├─ components/
│ ├─ EntryCard.tsx
│ └─ ChildCard.tsx
├─ hooks/
│ └─ useChildren.ts
├─ package.json
└─ tsconfig.json
