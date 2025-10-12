# API Environment Variable Setup

## What Changed

We moved the backend API URL from hardcoded values in the code to an environment variable. This means you need to configure your local environment before the app will work.

## Why This Change

- The API endpoint was hardcoded to `http://localhost:5000` in multiple files
- Everyone's local backend might run on different ports (e.g., 5000, 5001, 5002)
- This makes it easier to switch between development, staging, and production environments
- No more editing code files to change the API URL

## What You Need To Do

### 1. Create or Update `.env.local` File

In the `web-admin` folder, create or update the `.env.local` file:

```bash
# Development settings
NEXT_PUBLIC_BYPASS_AUTH=true

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5001
```

**Important**: Change `5001` to whatever port your backend is running on.

### 2. Restart Your Dev Server

Environment variables are only loaded when the Next.js server starts, so you must restart:

```bash
# Stop the current server (Ctrl+C or Cmd+C)
# Then start it again:
npm run dev
```

## Files That Were Changed

The following files now use `process.env.NEXT_PUBLIC_API_URL` instead of hardcoded URLs:

- `hooks/useTeachersAPI.ts` - Teacher data fetching
- `app/helpers.ts` - Role assignment function

## Troubleshooting

**Problem**: Getting CORS errors or "Failed to fetch" errors

**Solution**:
1. Check that `.env.local` exists in the `web-admin` folder
2. Verify the port number matches your backend server
3. Make sure you restarted the Next.js dev server
4. Check that your backend is actually running on that port

**Problem**: Environment variable is undefined

**Solution**:
1. Make sure the variable name starts with `NEXT_PUBLIC_` (required for client-side access in Next.js)
2. Restart the dev server - environment variables are only loaded at startup

## For Other Environments

- **Production**: Set `NEXT_PUBLIC_API_URL` in your deployment platform (Vercel, Netlify, etc.)
- **Staging**: Use a different `.env` file or set the variable in your CI/CD pipeline
- **Teammates**: Each person sets their own port in their local `.env.local` file

## Questions?

If you have issues, check:
1. Is `.env.local` in the correct folder? (should be in `web-admin/`)
2. Did you restart the dev server?
3. Is your backend actually running?