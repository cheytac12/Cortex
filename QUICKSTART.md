# Cortex - Quick Start Guide

## Get Running in 5 Minutes

### Prerequisites Check

```bash
# Verify Node.js installed (v18+)
node --version

# If not installed, download from: https://nodejs.org
```

### Installation

```bash
# 1. Navigate to project
cd Cortex

# 2. Install all dependencies
npm install
```

### Configuration

```bash
# 3. Copy environment template
cp .env.example .env

# 4. Edit .env file with your Supabase credentials
# (Or use demo mode - will work without Supabase for testing UI)
```

### Run the App

```bash
# 5. Start development server
npm start

# Then press:
# - 'i' for iOS simulator (macOS only)
# - 'a' for Android emulator
# - 'w' for web browser
```

## First Time Setup (Detailed)

### If You Don't Have Supabase Yet

The app will run in **demo mode** without Supabase - perfect for testing the UI and behavioral flows.

To get full functionality:

1. **Create free Supabase account:** https://supabase.com
2. **Create new project** (takes ~2 minutes)
3. **Run database schema:**
   - Go to Supabase SQL Editor
   - Copy/paste contents of `supabase/schema.sql`
   - Execute
4. **Get credentials:**
   - Project Settings → API
   - Copy Project URL and anon key
   - Add to `.env` file

### Project Structure Overview

```
Cortex/
├── App.tsx                 # Main app entry point
├── src/
│   ├── engines/           # Behavioral regulation engines
│   ├── screens/           # UI screens (Home, Focus, etc.)
│   ├── components/        # Reusable UI components
│   ├── store/             # Global state management
│   ├── styles/            # Design system (theme)
│   └── types/             # TypeScript definitions
├── supabase/
│   └── schema.sql         # Database structure
└── package.json
```

## Understanding the System

### Core Concept

Cortex implements **externalized executive function** - the app provides structure that users with executive dysfunction cannot generate internally.

### Key Behavioral Flows

1. **Home Screen** → Shows current time block + next task
2. **START button** → Initiates 5-minute forced start countdown
3. **User commits** → Enters locked focus mode (full screen)
4. **Task completion** → Records metrics, provides feedback
5. **System adapts** → Adjusts tomorrow's workload based on today

### Main Engines (in `src/engines/`)

- `ForcedStartEngine.ts` - Forces task initiation (removes decision paralysis)
- `TimeSkeletonEngine.ts` - Provides rigid daily time structure
- `TaskFragmentationEngine.ts` - Auto-splits tasks >45 min
- `ArtificialDeadlineEngine.ts` - Creates urgency scores
- `SleepAnchorSystem.ts` - Adapts workload to sleep quality
- `FeedbackLoopEngine.ts` - Tracks performance metrics
- `SystemRulesEngine.ts` - Enforces behavioral constraints

### Main Screens (in `src/screens/`)

- `HomeScreen.tsx` - Main dashboard
- `TaskEntryScreen.tsx` - Add new tasks
- `ForcedStartScreen.tsx` - 5-minute countdown modal
- `FocusScreen.tsx` - Locked focus mode
- `ReviewScreen.tsx` - Daily performance review

## Common Development Tasks

### Check for TypeScript Errors

```bash
npx tsc --noEmit
```

### Run Linter

```bash
npm run lint
```

### Clear Cache (if things break)

```bash
expo start -c
```

### Test on Physical Device

1. Install **Expo Go** app on your phone
2. Run `npm start`
3. Scan QR code with phone camera (iOS) or Expo Go (Android)
4. Make sure phone and computer are on same WiFi

## Design Principles

When adding features, follow these rules:

1. ✅ **One decision per screen** - Never overwhelm the user
2. ✅ **Clinical design** - Low stimulation, high clarity
3. ✅ **No gamification** - No points, badges, or streaks
4. ✅ **Enforce structure** - Reduce freedom, increase constraints
5. ✅ **External control** - Never rely on user motivation

## Need Help?

- **Full documentation:** See `README.md`
- **Deployment guide:** See `DEPLOYMENT.md`
- **Issues:** https://github.com/cheytac12/Cortex/issues

## Testing the Behavioral Loop

### Manual Test Flow

1. **Start app** → Should see Home screen with time block
2. **Add task** → Tap "ADD TASK", enter details
3. **Start task** → Tap "START TASK"
4. **Forced start** → 5-minute countdown appears (full screen)
5. **Commit** → Tap "I'M READY - START NOW"
6. **Focus mode** → Full-screen timer begins
7. **Complete** → After 80% elapsed, can mark complete
8. **Review** → View daily summary and insights

### Expected Behaviors

- ❌ Cannot exit forced start without failing
- ❌ Cannot background app during focus mode
- ❌ Cannot add >3 tasks per day (default)
- ❌ Cannot create tasks >45 min (auto-splits)
- ✅ Task failures reduce tomorrow's workload
- ✅ Poor sleep reduces today's capacity

## Key Files to Understand

Start with these files to understand the system:

1. `App.tsx` - Main orchestration and navigation
2. `src/engines/ForcedStartEngine.ts` - Core task initiation logic
3. `src/screens/HomeScreen.tsx` - Primary user interface
4. `src/types/models.ts` - Data models and types
5. `src/styles/theme.ts` - Clinical design system

## Production Readiness

This codebase is **production-ready** and includes:

- ✅ TypeScript for type safety
- ✅ Proper error handling
- ✅ State management (Zustand)
- ✅ Database schema with security
- ✅ Clinical UX design
- ✅ Complete documentation

Ready to deploy to iOS and Android app stores.

---

**Questions?** Check the full README.md or DEPLOYMENT.md

**Happy coding! 🧠**
