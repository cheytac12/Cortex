# Cortex: Behavioral Regulation System for Executive Dysfunction

## Overview

Cortex is a **production-grade mobile application** designed as a **behavioral regulation system** for individuals with executive dysfunction (ADHD-like profile). This is not a productivity app—it is a serious cognitive support system grounded in neuroscience and behavioral design.

## Scientific Foundation

### Core Mechanisms Addressed

1. **Executive Dysfunction**
   - Impaired planning, initiation, and task execution
   - Manifests as "wanting to act but being unable to start"

2. **Dopamine/Motivation Deficit**
   - ADHD brains operate on an interest-based nervous system
   - Low stimulation prevents task initiation

3. **Task Initiation Deficit**
   - Core impairment linked to executive function + dopamine
   - Even simple tasks require disproportionate effort to begin

4. **Time Perception Impairment**
   - Difficulty estimating and feeling time passage

5. **Task Paralysis**
   - Overwhelm leads to cognitive shutdown and inaction

### Design Principle

> **Externalized Executive Function**

The app replaces internal control with external structure. The user should NOT rely on motivation or discipline.

## System Architecture

```
Task → Forced Start → Focus Execution → Monitoring → Feedback → Adaptive Adjustment
```

Closed-loop behavioral system that continuously adapts to user performance.

## Feature Systems

### 1. Forced Start Protocol (Task Initiation Engine)

**Problem:** User cannot start tasks due to activation energy barrier

**Implementation:**
- 5-minute countdown after task selection
- Full-screen takeover, no escape routes
- Only two options: START or FAIL (double confirmation)
- Automatic failure on app exit
- Adaptive: Repeated failures → shorter countdowns

**Location:** `src/engines/ForcedStartEngine.ts`

### 2. Time Skeleton Engine (Temporal Structure System)

**Problem:** User cannot structure time internally

**Implementation:**
- Predefined day structure:
  - Wake Block
  - Work Block 1
  - Break
  - Work Block 2
  - Recovery
  - Sleep Block
- Users can only adjust within strict bounds (±30-60 minutes)
- No arbitrary scheduling allowed

**Location:** `src/engines/TimeSkeletonEngine.ts`

### 3. Task Fragmentation Engine

**Problem:** Large tasks trigger avoidance/paralysis

**Implementation:**
- Automatic splitting of tasks >45 minutes
- Generates descriptive fragment titles
- Reduces cognitive load per fragment

**Location:** `src/engines/TaskFragmentationEngine.ts`

### 4. Locked Focus Mode (Attention Control System)

**Problem:** User cannot sustain attention

**Implementation:**
- Full-screen timer mode
- No task switching allowed
- App backgrounding = automatic session failure
- Must complete or explicitly fail

**Location:** `src/screens/FocusScreen.tsx`

### 5. Artificial Deadline Engine (Urgency System)

**Problem:** User only works under pressure

**Implementation:**
- Urgency scoring (0-100) based on:
  - Time until deadline (50% weight)
  - Task duration vs available time (35% weight)
  - Block compatibility (15% weight)
- Tasks escalate if ignored
- Same-day deadlines preferred

**Location:** `src/engines/ArtificialDeadlineEngine.ts`

### 6. Sleep Anchor System

**Problem:** Late sleep reduces executive function

**Implementation:**
- Tracks sleep deviation from targets
- Poor sleep → reduced workload (50-85% capacity)
- Sleep quality scoring
- Long sessions disabled on poor sleep days

**Location:** `src/engines/SleepAnchorSystem.ts`

### 7. Feedback Loop Engine

**Problem:** No self-monitoring

**Implementation:**
- Tracks:
  - Task start latency
  - Session completion rate
  - Failure patterns
- Daily summaries with actionable insights
- Weekly pattern detection
- No vanity metrics

**Location:** `src/engines/FeedbackLoopEngine.ts`

### 8. System Rules Engine

**Problem:** Too many options cause paralysis

**Implementation:**
- Maximum 3 tasks per day (strict)
- Tasks >45 min must auto-split
- Missed sessions reduce next-day workload
- Repeated failures → stricter constraints
- No immediate rescheduling after failure

**Location:** `src/engines/SystemRulesEngine.ts`

## UX Design

### Principles

- **Reduce cognitive load:** One decision per screen
- **No visual clutter:** Clinical, minimal design
- **No gamification:** No points, streaks, or badges
- **Non-stimulating colors:** Cool, muted palette

### Color Palette

```typescript
Primary: #2C3E50 (Dark slate blue)
Background: #F4F6F7 (Light gray)
Accent: #5DADE2 (Soft blue)
```

**Research Basis:** Low perceptual load environments improve performance in ADHD profiles

### Typography

- Sans-serif (System font)
- Medium weight for readability
- Clear hierarchy

## Screen Flow

### 1. Home Screen
Shows ONLY:
- Current time block
- Next task
- START button

**Location:** `src/screens/HomeScreen.tsx`

### 2. Task Entry Screen
Simple form:
- Title
- Duration
- Deadline
- Auto-fragmentation happens after submission

**Location:** `src/screens/TaskEntryScreen.tsx`

### 3. Forced Start Screen
- 5-minute countdown
- Task details
- Two buttons: "I'M READY" or "I CANNOT DO THIS"
- Double confirmation for failure

**Location:** `src/screens/ForcedStartScreen.tsx`

### 4. Focus Screen
- Full-screen timer
- Progress bar
- Only option: Complete or Fail (after 80% elapsed)

**Location:** `src/screens/FocusScreen.tsx`

### 5. Review Screen
- Completed vs failed tasks
- Completion rate
- Start latency metrics
- Actionable insights only

**Location:** `src/screens/ReviewScreen.tsx`

## Database Schema

PostgreSQL/Supabase schema with:
- `users` - User accounts and settings
- `tasks` - Task records with fragmentation support
- `sessions` - Execution sessions with status tracking
- `daily_blocks` - Time structure blocks
- `sleep_logs` - Sleep tracking for adjustment
- `daily_metrics` - Performance analytics
- `weekly_patterns` - Trend analysis

**Location:** `supabase/schema.sql`

### Key Features
- Row Level Security (RLS) enabled
- Automatic timestamp updates
- Proper indexes for performance
- Foreign key constraints

## Technology Stack

### Frontend
- **React Native** (0.74.1)
- **Expo** (~51.0.0)
- **TypeScript** (5.3.0)
- **React Navigation** (6.1.9)
- **Zustand** (4.4.7) - State management

### Backend
- **Supabase** (2.39.0)
  - PostgreSQL database
  - Authentication
  - Row Level Security

### Utilities
- **date-fns** (3.0.0) - Date manipulation
- **AsyncStorage** (1.23.1) - Local persistence

## Installation & Setup

### Prerequisites
- Node.js 18+ installed
- Expo CLI installed globally
- Supabase account (free tier works)

### Step 1: Clone and Install

```bash
cd Cortex
npm install
```

### Step 2: Configure Supabase

1. Create a Supabase project at https://supabase.com
2. Run the SQL schema:
   ```bash
   # In Supabase SQL Editor, execute:
   cat supabase/schema.sql
   ```

3. Get your Supabase credentials:
   - Project URL
   - Anon/Public API Key

4. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

5. Edit `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

### Step 3: Run the App

```bash
# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run in web browser
npm run web
```

## Production Deployment

### iOS (App Store)

1. **Configure app.json:**
   - Update `bundleIdentifier`
   - Set production icon/splash

2. **Build:**
   ```bash
   eas build --platform ios
   ```

3. **Submit to App Store:**
   ```bash
   eas submit --platform ios
   ```

### Android (Google Play)

1. **Configure app.json:**
   - Update `package` name
   - Set production icon/splash

2. **Build:**
   ```bash
   eas build --platform android
   ```

3. **Submit to Play Store:**
   ```bash
   eas submit --platform android
   ```

## Project Structure

```
Cortex/
├── src/
│   ├── components/        # Reusable UI components
│   │   └── UI.tsx        # Clinical design components
│   ├── engines/          # Behavioral system engines
│   │   ├── ForcedStartEngine.ts
│   │   ├── TimeSkeletonEngine.ts
│   │   ├── TaskFragmentationEngine.ts
│   │   ├── ArtificialDeadlineEngine.ts
│   │   ├── SleepAnchorSystem.ts
│   │   ├── FeedbackLoopEngine.ts
│   │   └── SystemRulesEngine.ts
│   ├── screens/          # Screen components
│   │   ├── HomeScreen.tsx
│   │   ├── TaskEntryScreen.tsx
│   │   ├── ForcedStartScreen.tsx
│   │   ├── FocusScreen.tsx
│   │   └── ReviewScreen.tsx
│   ├── store/            # State management
│   │   └── appStore.ts
│   ├── styles/           # Design system
│   │   └── theme.ts
│   ├── types/            # TypeScript types
│   │   └── models.ts
│   └── lib/              # External services
│       └── supabase.ts
├── supabase/
│   └── schema.sql        # Database schema
├── App.tsx               # Main app component
├── package.json
└── README.md
```

## Behavioral Loop Flow

1. **User opens app** → Sees current block and next task
2. **User taps START** → Forced Start Protocol initiated
3. **5-minute countdown** → User must commit or fail
4. **User commits** → Locked Focus Mode activated
5. **Task execution** → Timer running, no escape
6. **Completion** → Metrics recorded, feedback generated
7. **System adaptation** → Workload adjusted for tomorrow

## System Rules

### Hard Limits
- Maximum 3 tasks per day (configurable 1-5)
- Maximum 45 minutes per task fragment
- No rescheduling immediately after failure
- No task switching during focus mode

### Adaptive Adjustments
- Poor sleep → 50-85% workload reduction
- Low completion rate (<40%) → 70% workload reduction
- High failure rate (>50%) → 75% workload reduction
- Zero completions yesterday → 60% workload reduction

## Failure Handling

### Task Initiation Failures
- Countdown expires → Automatic failure
- App exit → Automatic failure
- Explicit failure → Double confirmation required
- 2+ failures → Auto-fragmentation triggered

### Focus Session Failures
- App backgrounded → Automatic abandonment
- Explicit failure → Recorded with reason
- Multiple failures → Task removed or refragmented

### Workload Adaptation
- Consecutive failure days → Progressive task reduction
- Recovery period required before increasing workload
- Minimum 1 task per day enforced

## Testing

```bash
# Run linter
npm run lint

# Run type check
npx tsc --noEmit

# Future: Add unit tests
npm test
```

## Development Notes

### Adding New Features

1. **New Behavioral Engine:**
   - Create in `src/engines/`
   - Export pure functions
   - Add unit tests

2. **New Screen:**
   - Create in `src/screens/`
   - Use clinical design components from `src/components/UI.tsx`
   - Follow one-decision-per-screen principle

3. **Database Changes:**
   - Update `supabase/schema.sql`
   - Run migrations in Supabase console
   - Update TypeScript types in `src/types/models.ts`

### Design Guidelines

- Use `theme.ts` for all colors, spacing, typography
- No custom animations (reduce distraction)
- Minimum touch target: 44px
- Maximum one primary action per screen
- No gamification elements

## Research References

1. **Executive Dysfunction:** [The Advocacy Project](https://www.theaddvocacyproject.com/blog/adhd-task-initiation-high-performing-adults)
2. **Task Initiation:** [Tiimo](https://www.tiimoapp.com/resource-hub/task-initiation-adhd)
3. **Neuroscience Basis:** [Positive Reset](https://positivereseteatontown.com/task-initiation-adhd-understanding-the-science-behind-why-starting-feels-impossible/)
4. **Time Perception:** [PMC Study](https://pmc.ncbi.nlm.nih.gov/articles/PMC9962130/)
5. **ADHD Paralysis:** [ADDA](https://add.org/adhd-paralysis/)

## License

Proprietary - All rights reserved

## Support

For issues or questions:
- GitHub Issues: [Repository Issues](https://github.com/cheytac12/Cortex/issues)
- Email: support@cortex.app

## Changelog

### v1.0.0 (2026-03-22)
- Initial release
- Complete behavioral engine implementation
- All core screens and flows
- Supabase integration
- Clinical UX design system
