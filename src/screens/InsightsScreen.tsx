/**
 * Insights Screen
 *
 * Delivery UX for AI Insight Engine:
 *  - Daily tab: short actionable summary (2 insights)
 *  - Weekly tab: deep analysis (all 4 insight types)
 *
 * Design principle: Every screen must be immediately actionable.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Card, SectionHeader, Button, Divider } from '../components/UI';
import { theme } from '../styles/theme';
import { useStore } from '../store/appStore';
import { generateDailyInsights, generateWeeklyInsights } from '../engines/AIInsightEngine';
import { computeBehavioralMetrics, detectPatterns } from '../engines/BehavioralAnalysisEngine';
import { Insight, InsightType } from '../types/models';
import { format } from 'date-fns';

interface InsightsScreenProps {
  onClose: () => void;
}

type TabId = 'daily' | 'weekly';

const INSIGHT_TYPE_ICON: Record<InsightType, string> = {
  [InsightType.PERFORMANCE]: '⚡',
  [InsightType.FAILURE_DIAGNOSIS]: '🔍',
  [InsightType.BEHAVIORAL_RECOMMENDATION]: '→',
  [InsightType.ADAPTIVE_STRATEGY]: '⚙',
};

const INSIGHT_TYPE_LABEL: Record<InsightType, string> = {
  [InsightType.PERFORMANCE]: 'Performance',
  [InsightType.FAILURE_DIAGNOSIS]: 'Failure Diagnosis',
  [InsightType.BEHAVIORAL_RECOMMENDATION]: 'Recommendation',
  [InsightType.ADAPTIVE_STRATEGY]: 'Adaptive Strategy',
};

export function InsightsScreen({ onClose }: InsightsScreenProps) {
  const { currentUser, sessionHistory } = useStore();
  const [activeTab, setActiveTab] = useState<TabId>('daily');
  const [dailyInsights, setDailyInsights] = useState<Insight[]>([]);
  const [weeklyInsights, setWeeklyInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInsights = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const metrics = computeBehavioralMetrics(currentUser.id, sessionHistory);
      const patterns = detectPatterns(sessionHistory);

      const [daily, weekly] = await Promise.all([
        generateDailyInsights(currentUser.id, metrics, patterns),
        generateWeeklyInsights(currentUser.id, metrics, patterns),
      ]);

      setDailyInsights(daily);
      setWeeklyInsights(weekly);
    } catch {
      setError('Failed to generate insights. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, sessionHistory]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const insights = activeTab === 'daily' ? dailyInsights : weeklyInsights;

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'daily' && styles.tabActive]}
          onPress={() => setActiveTab('daily')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'daily' }}
        >
          <Text style={[styles.tabText, activeTab === 'daily' && styles.tabTextActive]}>
            Daily Summary
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'weekly' && styles.tabActive]}
          onPress={() => setActiveTab('weekly')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'weekly' }}
        >
          <Text style={[styles.tabText, activeTab === 'weekly' && styles.tabTextActive]}>
            Weekly Analysis
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SectionHeader
          title={activeTab === 'daily' ? "Today's Insights" : 'Weekly Deep Analysis'}
          subtitle={format(new Date(), 'EEEE, MMMM d')}
        />

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={styles.loadingText}>Analyzing your behavioral data…</Text>
          </View>
        )}

        {error && !isLoading && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="RETRY" onPress={loadInsights} />
          </Card>
        )}

        {!isLoading && !error && insights.length === 0 && (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Not Enough Data Yet</Text>
            <Text style={styles.emptyBody}>
              Complete at least 4 sessions to generate meaningful behavioural insights.
              Each session you complete teaches the system about your patterns.
            </Text>
          </Card>
        )}

        {!isLoading &&
          insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}

        {/* Session count note */}
        {!isLoading && sessionHistory.length > 0 && (
          <Card style={styles.metaCard}>
            <Text style={styles.metaText}>
              Analysis based on {sessionHistory.length} recorded session
              {sessionHistory.length !== 1 ? 's' : ''}.
            </Text>
          </Card>
        )}
      </ScrollView>

      <View style={styles.bottomActions}>
        <Button title="CLOSE" onPress={onClose} fullWidth />
      </View>
    </View>
  );
}

// ─── Insight Card ─────────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: Insight }) {
  const icon = INSIGHT_TYPE_ICON[insight.type] ?? '•';
  const label = INSIGHT_TYPE_LABEL[insight.type] ?? insight.type;

  return (
    <Card style={styles.insightCard}>
      <View style={styles.insightHeader}>
        <View style={styles.insightTypeBadge}>
          <Text style={styles.insightIcon}>{icon}</Text>
          <Text style={styles.insightTypeLabel}>{label}</Text>
        </View>
      </View>

      <Text style={styles.insightTitle}>{insight.title}</Text>
      <Divider />
      <Text style={styles.insightBody}>{insight.body}</Text>

      {insight.actionItems.length > 0 && (
        <>
          <Text style={styles.actionItemsHeader}>Action steps:</Text>
          {insight.actionItems.map((item, i) => (
            <View key={i} style={styles.actionItemRow}>
              <Text style={styles.actionItemBullet}>{i + 1}.</Text>
              <Text style={styles.actionItemText}>{item}</Text>
            </View>
          ))}
        </>
      )}
    </Card>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.accent,
  },
  tabText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.accent,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  scrollContent: {
    padding: theme.layout.screenPadding,
    paddingBottom: theme.spacing.xxl,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  errorCard: {
    marginBottom: theme.spacing.lg,
    backgroundColor: '#FFF3F3',
  },
  errorText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.error,
    marginBottom: theme.spacing.md,
  },
  emptyCard: {
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
  },
  insightCard: {
    marginBottom: theme.spacing.lg,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  insightTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  insightIcon: {
    fontSize: theme.typography.fontSize.base,
    marginRight: theme.spacing.xs,
  },
  insightTypeLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  insightBody: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  actionItemsHeader: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  actionItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  actionItemBullet: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.accent,
    marginRight: theme.spacing.sm,
    width: 16,
  },
  actionItemText: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
  },
  metaCard: {
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceElevated,
  },
  metaText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  bottomActions: {
    padding: theme.layout.screenPadding,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
});
