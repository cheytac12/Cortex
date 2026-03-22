# Cortex - Deployment & Operations Guide

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Local Development](#local-development)
5. [Production Deployment](#production-deployment)
6. [Monitoring & Analytics](#monitoring--analytics)
7. [Troubleshooting](#troubleshooting)
8. [Security Considerations](#security-considerations)

## Quick Start

### For Development (5 minutes)

```bash
# 1. Clone repository
git clone https://github.com/cheytac12/Cortex.git
cd Cortex

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# 4. Start development server
npm start
```

### For Production (30 minutes)

See [Production Deployment](#production-deployment) section below.

## Environment Setup

### Required Tools

1. **Node.js** (v18 or higher)
   ```bash
   node --version  # Should be ≥18.0.0
   ```

2. **Expo CLI**
   ```bash
   npm install -g expo-cli
   ```

3. **EAS CLI** (for production builds)
   ```bash
   npm install -g eas-cli
   eas login
   ```

### Platform-Specific Setup

#### iOS Development

- macOS required
- Xcode 14+ installed
- iOS Simulator configured
- Apple Developer Account (for physical devices)

```bash
# Install Xcode command line tools
xcode-select --install

# Verify installation
xcodebuild -version
```

#### Android Development

- Android Studio installed
- Android SDK configured
- Android Emulator set up

```bash
# Verify Android SDK
echo $ANDROID_HOME  # Should point to SDK location

# List available emulators
emulator -list-avds
```

## Database Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization
4. Set project name: `cortex-production`
5. Generate secure database password
6. Select region (choose closest to target users)
7. Wait for project creation (~2 minutes)

### Step 2: Run Database Schema

1. Open Supabase SQL Editor
2. Copy contents of `supabase/schema.sql`
3. Execute script
4. Verify tables created:
   - users
   - tasks
   - sessions
   - daily_blocks
   - sleep_logs
   - daily_metrics
   - weekly_patterns

### Step 3: Configure Row Level Security

RLS is automatically enabled by the schema. Verify policies:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- All should show rowsecurity = true
```

### Step 4: Get API Credentials

1. Go to Project Settings → API
2. Copy:
   - Project URL: `https://xxxxx.supabase.co`
   - `anon` public key: `eyJhbG...`
   - `service_role` key (keep secret): `eyJhbG...`

### Step 5: Configure Environment

Create `.env` file:

```env
# Required
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...

# Optional (for analytics, push notifications, etc.)
# EXPO_PUBLIC_SENTRY_DSN=
# EXPO_PUBLIC_AMPLITUDE_KEY=
```

## Local Development

### Starting Development Server

```bash
# Start Expo dev server
npm start

# Or with specific platform
npm run ios      # iOS simulator
npm run android  # Android emulator
npm run web      # Web browser
```

### Development Workflow

1. **Hot Reload Enabled:**
   - Save files to see changes instantly
   - No need to rebuild

2. **Debug Tools:**
   - Press `d` in terminal to open dev menu
   - Use React Native Debugger
   - Check Expo DevTools in browser

3. **Testing on Physical Device:**
   - Install Expo Go app
   - Scan QR code from terminal
   - Must be on same WiFi network

### Common Development Commands

```bash
# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Fix lint errors
npm run lint --fix

# Clear cache
expo start -c

# Reset Metro bundler
watchman watch-del-all
rm -rf node_modules
npm install
```

## Production Deployment

### Pre-Deployment Checklist

- [ ] All features tested on iOS and Android
- [ ] Database schema deployed to production Supabase
- [ ] Environment variables configured
- [ ] App icons and splash screens created
- [ ] Privacy policy and terms of service ready
- [ ] App Store/Play Store accounts set up

### iOS Deployment

#### 1. Configure App

Edit `app.json`:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.cortex",
      "buildNumber": "1",
      "supportsTablet": false
    }
  }
}
```

#### 2. Create App Store Listing

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create new app
3. Fill in metadata:
   - Name: Cortex
   - Subtitle: Behavioral Regulation System
   - Category: Health & Fitness
   - Age Rating: 4+
4. Upload screenshots (required sizes)
5. Write app description

#### 3. Build and Submit

```bash
# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

#### 4. Wait for Review

- Typical review time: 1-3 days
- Respond to any rejection notes
- Once approved, app goes live

### Android Deployment

#### 1. Configure App

Edit `app.json`:

```json
{
  "expo": {
    "android": {
      "package": "com.yourcompany.cortex",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#F4F6F7"
      }
    }
  }
}
```

#### 2. Create Play Store Listing

1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app
3. Fill in store listing:
   - App name: Cortex
   - Short description
   - Full description
   - Screenshots
   - Feature graphic
4. Set content rating
5. Configure pricing (free)

#### 3. Build and Submit

```bash
# Build for Android
eas build --platform android

# Submit to Play Store
eas submit --platform android
```

#### 4. Wait for Review

- Typical review time: Few hours to 1 day
- Respond to any policy violations
- Once approved, app goes live

### Environment-Specific Configurations

#### Staging Environment

```env
EXPO_PUBLIC_SUPABASE_URL=https://staging-xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=staging_key
```

#### Production Environment

```env
EXPO_PUBLIC_SUPABASE_URL=https://prod-xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=prod_key
```

## Monitoring & Analytics

### Error Tracking with Sentry

1. **Install Sentry:**
   ```bash
   npm install @sentry/react-native
   ```

2. **Configure:**
   ```typescript
   import * as Sentry from '@sentry/react-native';

   Sentry.init({
     dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
     environment: __DEV__ ? 'development' : 'production',
   });
   ```

3. **Monitor crashes in Sentry dashboard**

### Analytics with Amplitude

1. **Install:**
   ```bash
   npm install @amplitude/analytics-react-native
   ```

2. **Track events:**
   ```typescript
   import { track } from '@amplitude/analytics-react-native';

   track('Task Started', {
     duration: task.duration_minutes,
     urgency: task.urgency_score,
   });
   ```

### Supabase Dashboard Monitoring

Monitor:
- Database performance (Supabase Dashboard → Database)
- API usage (Supabase Dashboard → API)
- Active users (Supabase Dashboard → Authentication)

## Troubleshooting

### Common Issues

#### 1. "Cannot connect to Supabase"

**Symptoms:** App fails to load data

**Solutions:**
- Verify `.env` file exists and has correct values
- Check Supabase project is running
- Verify network connectivity
- Check Supabase status page

```bash
# Test Supabase connection
curl https://your-project.supabase.co/rest/v1/
```

#### 2. "Module not found" errors

**Symptoms:** Import errors on app start

**Solutions:**
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
expo start -c
```

#### 3. "Build failed" on EAS

**Symptoms:** EAS build fails

**Solutions:**
- Check `eas.json` configuration
- Verify credentials are set up
- Check build logs for specific errors

```bash
# View build logs
eas build:list
eas build:view [build-id]
```

#### 4. TypeScript errors

**Symptoms:** Type mismatches

**Solutions:**
```bash
# Regenerate types
npx tsc --noEmit

# If using Supabase types
npx supabase gen types typescript --project-id your-project > src/types/supabase.ts
```

### Performance Optimization

#### Slow App Launch

1. **Enable Hermes (Android):**
   ```json
   // app.json
   {
     "expo": {
       "android": {
         "enableHermes": true
       }
     }
   }
   ```

2. **Optimize images:**
   - Use WebP format
   - Compress assets
   - Lazy load images

#### High Memory Usage

1. **Profile with Flipper:**
   ```bash
   npx react-native-flipper
   ```

2. **Check for memory leaks:**
   - Unmount listeners properly
   - Clear intervals/timeouts
   - Remove event subscriptions

## Security Considerations

### Environment Variables

- **Never commit `.env` to git**
- Use different keys for staging/production
- Rotate keys regularly (every 90 days)

### Supabase Security

1. **Enable RLS:**
   - Already configured in schema
   - Verify policies are working

2. **API Key Management:**
   - Use `anon` key in client
   - Keep `service_role` key server-side only
   - Never expose in client code

3. **Authentication:**
   - Implement email verification
   - Use strong password requirements
   - Enable 2FA for admin accounts

### Code Security

1. **Dependency Auditing:**
   ```bash
   npm audit
   npm audit fix
   ```

2. **Regular Updates:**
   ```bash
   npm outdated
   npm update
   ```

3. **Secret Scanning:**
   - Enable GitHub secret scanning
   - Use `.gitignore` for sensitive files

### Data Privacy

- **GDPR Compliance:**
  - Provide data export functionality
  - Allow account deletion
  - Clear privacy policy

- **HIPAA Considerations:**
  - If handling health data in US
  - May need BAA with Supabase
  - Additional security measures required

## Backup & Recovery

### Database Backups

Supabase automatically backs up daily. Manual backup:

```bash
# Export database
pg_dump -h db.xxxxx.supabase.co -U postgres cortex > backup.sql

# Restore database
psql -h db.xxxxx.supabase.co -U postgres cortex < backup.sql
```

### Disaster Recovery Plan

1. **Database failure:**
   - Restore from Supabase automatic backups
   - Or restore from manual backup

2. **App unavailable:**
   - Check App Store/Play Store status
   - Verify Expo/EAS service status
   - Roll back to previous version if needed

3. **Data loss:**
   - Restore from most recent backup
   - Communicate with affected users
   - Document incident for postmortem

## Support & Maintenance

### Regular Maintenance Tasks

- [ ] Weekly: Check error logs in Sentry
- [ ] Weekly: Review analytics in Amplitude
- [ ] Monthly: Update dependencies
- [ ] Monthly: Review and rotate API keys
- [ ] Quarterly: Performance audit
- [ ] Quarterly: Security audit

### Getting Help

- GitHub Issues: https://github.com/cheytac12/Cortex/issues
- Email: support@cortex.app
- Expo Forums: https://forums.expo.dev
- Supabase Discord: https://discord.supabase.com

## Appendix

### Useful Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native Documentation](https://reactnative.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [React Navigation Docs](https://reactnavigation.org)

### Version Information

- React Native: 0.74.1
- Expo SDK: 51
- Supabase JS: 2.39.0
- TypeScript: 5.3.0

---

**Last Updated:** 2026-03-22
**Version:** 1.0.0
