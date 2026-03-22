/**
 * Clinical Design System
 *
 * Purpose: Low-stimulation, high-clarity visual system
 * Research basis: Low perceptual load improves ADHD performance
 *
 * Design principles:
 * - Minimal cognitive load
 * - High readability
 * - No unnecessary stimulation
 * - One action per screen
 */

export const Colors = {
  // Primary palette - cool, calming tones
  primary: '#2C3E50',      // Dark slate blue
  secondary: '#34495E',    // Lighter slate
  accent: '#5DADE2',       // Soft blue - for actions

  // Backgrounds
  background: '#F4F6F7',   // Very light gray
  surface: '#FFFFFF',      // Pure white
  surfaceElevated: '#FAFBFC',

  // Text
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  textDisabled: '#BDC3C7',

  // Status colors - muted, not alarming
  success: '#27AE60',      // Muted green
  warning: '#F39C12',      // Muted orange
  error: '#E74C3C',        // Muted red
  info: '#3498DB',         // Muted blue

  // Urgency levels (non-alarming)
  urgencyCritical: '#E67E22',
  urgencyHigh: '#F39C12',
  urgencyMedium: '#F1C40F',
  urgencyLow: '#95A5A6',

  // Borders
  border: '#ECF0F1',
  borderDark: '#BDC3C7',

  // Overlays
  overlay: 'rgba(44, 62, 80, 0.9)',
  scrim: 'rgba(0, 0, 0, 0.3)',
};

export const Typography = {
  // Font families
  fontFamily: {
    regular: 'System',     // Use system font for best performance
    medium: 'System',
    bold: 'System',
  },

  // Font sizes - clear hierarchy
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },

  // Font weights
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // Line heights - optimized for readability
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const Shadows = {
  // Minimal shadows - reduce visual noise
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const Layout = {
  // Screen padding
  screenPadding: Spacing.lg,

  // Container max widths
  containerMaxWidth: 600,

  // Minimum touch target size (accessibility)
  minTouchTarget: 44,
};

export const Animation = {
  // Minimal animations - reduce distraction
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  easing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

/**
 * Component-specific styles
 */

export const ComponentStyles = {
  button: {
    primary: {
      backgroundColor: Colors.accent,
      color: Colors.surface,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.md,
      minHeight: Layout.minTouchTarget,
    },
    secondary: {
      backgroundColor: Colors.surface,
      color: Colors.primary,
      borderWidth: 2,
      borderColor: Colors.border,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.md,
      minHeight: Layout.minTouchTarget,
    },
    danger: {
      backgroundColor: Colors.error,
      color: Colors.surface,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.md,
      minHeight: Layout.minTouchTarget,
    },
  },

  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },

  input: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    minHeight: Layout.minTouchTarget,
  },

  header: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Layout.screenPadding,
  },
};

/**
 * Status badge colors
 */
export function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return Colors.success;
    case 'FAILED':
    case 'ABANDONED':
      return Colors.error;
    case 'IN_PROGRESS':
    case 'ACTIVE':
      return Colors.info;
    case 'PENDING':
    case 'INITIATED':
      return Colors.warning;
    default:
      return Colors.textSecondary;
  }
}

/**
 * Urgency badge colors
 */
export function getUrgencyColor(score: number): string {
  if (score >= 80) return Colors.urgencyCritical;
  if (score >= 60) return Colors.urgencyHigh;
  if (score >= 40) return Colors.urgencyMedium;
  return Colors.urgencyLow;
}

/**
 * Block type colors
 */
export function getBlockTypeColor(blockType: string): string {
  switch (blockType) {
    case 'WORK_1':
    case 'WORK_2':
      return Colors.accent;
    case 'BREAK':
    case 'RECOVERY':
      return Colors.success;
    case 'WAKE':
      return Colors.info;
    case 'SLEEP':
      return Colors.primary;
    default:
      return Colors.textSecondary;
  }
}

export const theme = {
  colors: Colors,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
  shadows: Shadows,
  layout: Layout,
  animation: Animation,
  components: ComponentStyles,
  getStatusColor,
  getUrgencyColor,
  getBlockTypeColor,
};

export type Theme = typeof theme;
