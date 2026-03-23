/**
 * AI Insight Engine
 *
 * Purpose: Convert behavioral data into specific, medically-grounded insights.
 * Neuroscience basis: Actionable feedback improves behavioral regulation in
 *   executive dysfunction by externalizing the analysis function.
 *
 * Strategy:
 *  1. Try to call OpenRouter LLM API if key is configured
 *  2. Fall back to deterministic rule-based insight generation (always available)
 *
 * Insight types:
 *  - PERFORMANCE: When user performs best
 *  - FAILURE_DIAGNOSIS: Why tasks failed
 *  - BEHAVIORAL_RECOMMENDATION: What to change
 *  - ADAPTIVE_STRATEGY: Concrete structural changes
 */

import {
  BehavioralMetrics,
  FailurePattern,
  FailurePatternType,
  Insight,
  InsightType,
} from '../types/models';

// Read optional OpenRouter API key from environment
const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ?? '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'mistralai/mistral-7b-instruct'; // free tier model

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Generate a daily insight summary (short — one insight per type).
 */
export async function generateDailyInsights(
  userId: string,
  metrics: BehavioralMetrics,
  patterns: FailurePattern[]
): Promise<Insight[]> {
  return generateInsights(userId, metrics, patterns, 'DAILY');
}

/**
 * Generate a weekly deep-analysis insight set (detailed — all types).
 */
export async function generateWeeklyInsights(
  userId: string,
  metrics: BehavioralMetrics,
  patterns: FailurePattern[]
): Promise<Insight[]> {
  return generateInsights(userId, metrics, patterns, 'WEEKLY');
}

// ─── Core Generator ───────────────────────────────────────────────────────

async function generateInsights(
  userId: string,
  metrics: BehavioralMetrics,
  patterns: FailurePattern[],
  period: 'DAILY' | 'WEEKLY'
): Promise<Insight[]> {
  // Build a compact summary for the LLM prompt
  const context = buildContext(metrics, patterns);

  if (OPENROUTER_API_KEY) {
    try {
      return await generateWithLLM(userId, context, metrics, patterns, period);
    } catch (err) {
      // LLM unavailable — fall back to rule-based insights
      console.warn('[AIInsightEngine] LLM call failed, using rule-based fallback:', err);
    }
  }

  return generateRuleBased(userId, metrics, patterns, period);
}

// ─── LLM-Based Generation ─────────────────────────────────────────────────

async function generateWithLLM(
  userId: string,
  context: string,
  metrics: BehavioralMetrics,
  patterns: FailurePattern[],
  period: 'DAILY' | 'WEEKLY'
): Promise<Insight[]> {
  const systemPrompt = `You are a clinical behavioral analyst specialising in ADHD executive dysfunction.
Your output MUST be a JSON array of insight objects with this exact schema:
[{ "type": "PERFORMANCE|FAILURE_DIAGNOSIS|BEHAVIORAL_RECOMMENDATION|ADAPTIVE_STRATEGY", "title": "...", "body": "...", "actionItems": ["..."] }]

Rules:
- Be SPECIFIC — cite the actual numbers from the context.
- Be medically grounded — reference prefrontal cortex, dopamine, circadian rhythm where relevant.
- No generic tips. BAD: "Try to focus more". GOOD: "You fail 78% of tasks after 6pm — evening cortisol drop impairs PFC function. Cut all evening tasks."
- body must be 2–4 sentences. actionItems must have 2–3 concrete items.
- Return only the JSON array. No markdown fences.`;

  const userMessage = `Context:\n${context}\n\nGenerate ${period === 'DAILY' ? '2' : '4'} insights covering the types: ${period === 'DAILY' ? 'PERFORMANCE, BEHAVIORAL_RECOMMENDATION' : 'PERFORMANCE, FAILURE_DIAGNOSIS, BEHAVIORAL_RECOMMENDATION, ADAPTIVE_STRATEGY'}.`;

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data?.choices?.[0]?.message?.content ?? '';

  // Parse JSON from LLM response
  const parsed = JSON.parse(raw) as {
    type: string;
    title: string;
    body: string;
    actionItems: string[];
  }[];

  return parsed.map((item, idx) => ({
    id: `insight-${userId}-${Date.now()}-${idx}`,
    userId,
    type: item.type as InsightType,
    generatedAt: new Date().toISOString(),
    period,
    title: item.title,
    body: item.body,
    actionItems: item.actionItems ?? [],
  }));
}

// ─── Rule-Based Fallback ──────────────────────────────────────────────────

function generateRuleBased(
  userId: string,
  metrics: BehavioralMetrics,
  patterns: FailurePattern[],
  period: 'DAILY' | 'WEEKLY'
): Insight[] {
  const insights: Insight[] = [];
  const now = new Date().toISOString();
  let idx = 0;

  const make = (
    type: InsightType,
    title: string,
    body: string,
    actionItems: string[],
    relatedPattern?: FailurePatternType
  ): Insight => ({
    id: `insight-${userId}-${Date.now()}-${idx++}`,
    userId,
    type,
    generatedAt: now,
    period,
    title,
    body,
    actionItems,
    relatedPattern,
  });

  // ── PERFORMANCE insight ──────────────────────────────────────────────
  if (metrics.optimalFocusWindow) {
    const { startHour, endHour } = metrics.optimalFocusWindow;
    insights.push(
      make(
        InsightType.PERFORMANCE,
        `Peak Focus: ${fmtHr(startHour)}–${fmtHr(endHour)}`,
        `Your task completion rate peaks during ${fmtHr(startHour)}–${fmtHr(endHour)}. This window aligns with your natural prefrontal cortex activation cycle. Protecting this time from interruptions maximises dopamine-driven execution.`,
        [
          `Schedule your highest-priority task to START at ${fmtHr(startHour)}.`,
          'Block calendar and silence notifications during this window.',
          'Avoid scheduling meetings or low-value work in this slot.',
        ]
      )
    );
  } else {
    insights.push(
      make(
        InsightType.PERFORMANCE,
        'Track More Sessions to Find Your Peak',
        `You need at least 4 completed sessions before a reliable optimal focus window can be detected. Data so far shows a ${metrics.completionRate_percent}% overall completion rate.`,
        [
          'Complete at least 4 sessions this week.',
          'Log sleep quality each morning in the app.',
        ]
      )
    );
  }

  // ── FAILURE DIAGNOSIS ────────────────────────────────────────────────
  if (period === 'WEEKLY') {
    const timePattern = patterns.find(
      p => p.type === FailurePatternType.TIME_OF_DAY_INEFFICIENCY
    );
    const avoidancePattern = patterns.find(
      p => p.type === FailurePatternType.AVOIDANCE
    );
    const overloadPattern = patterns.find(
      p => p.type === FailurePatternType.OVERLOAD_FAILURE
    );

    if (timePattern) {
      insights.push(
        make(
          InsightType.FAILURE_DIAGNOSIS,
          'Time-of-Day Failure Cluster Detected',
          timePattern.description,
          [
            'Move all tasks OUT of this time window.',
            'Use this period for passive recovery (walk, meal, light stretching).',
            'Do not attempt forced-start protocols during this window.',
          ],
          FailurePatternType.TIME_OF_DAY_INEFFICIENCY
        )
      );
    } else if (avoidancePattern) {
      insights.push(
        make(
          InsightType.FAILURE_DIAGNOSIS,
          'Avoidance Pattern Detected',
          avoidancePattern.description,
          [
            'Fragment the avoided task into ≤15-minute micro-tasks.',
            'Assign an artificial deadline of +2 hours, not end-of-day.',
            'If avoidance persists after 3 attempts, remove the task entirely.',
          ],
          FailurePatternType.AVOIDANCE
        )
      );
    } else if (overloadPattern) {
      insights.push(
        make(
          InsightType.FAILURE_DIAGNOSIS,
          'Cognitive Overload Causing Task Failures',
          overloadPattern.description,
          [
            'Hard cap: maximum 3 tasks per day, regardless of available time.',
            'Enable the Overload Detector to auto-reject task additions.',
            'Review the previous day\'s completion before adding new tasks.',
          ],
          FailurePatternType.OVERLOAD_FAILURE
        )
      );
    } else {
      const rate = metrics.completionRate_percent;
      insights.push(
        make(
          InsightType.FAILURE_DIAGNOSIS,
          `${100 - rate}% of Tasks Did Not Complete`,
          `Your current completion rate is ${rate}%. In executive dysfunction, incompletion is rarely a motivation problem — it is a task structure problem. Tasks that do not start within 2 minutes of initiation rarely start at all.`,
          [
            'Reduce every task duration by 25%.',
            'Ensure each task has a specific, concrete action as its first step.',
            'Remove vague tasks (e.g., "work on project") and replace with micro-actions.',
          ]
        )
      );
    }
  }

  // ── BEHAVIORAL RECOMMENDATION ────────────────────────────────────────
  const sleepPattern = patterns.find(
    p => p.type === FailurePatternType.SLEEP_PERFORMANCE_CORRELATION
  );
  if (sleepPattern) {
    insights.push(
      make(
        InsightType.BEHAVIORAL_RECOMMENDATION,
        'Sleep Quality Directly Controls Your Output',
        sleepPattern.description,
        [
          'Treat sleep time as a non-negotiable hard deadline — not a preference.',
          'Set a sleep anchor alarm 30 minutes before target sleep time.',
          'On poor-sleep days, reduce task count to 1 and task duration to 20 minutes.',
        ],
        FailurePatternType.SLEEP_PERFORMANCE_CORRELATION
      )
    );
  } else if (metrics.initiationLatencyTrend === 'WORSENING') {
    insights.push(
      make(
        InsightType.BEHAVIORAL_RECOMMENDATION,
        'Task Initiation is Getting Harder',
        `Your average start delay has been increasing (currently ${metrics.avgInitiationLatency_minutes} minutes). Increasing initiation latency is the earliest indicator of executive load accumulation — if not addressed, it precedes failure spikes within 3–5 days.`,
        [
          'Shorten forced-start countdown from 5 minutes to 2 minutes.',
          'Add an implementation intention: write the EXACT first action before starting.',
          'Remove one task from today\'s list to reduce decision overhead.',
        ]
      )
    );
  } else {
    const lat = metrics.avgInitiationLatency_minutes;
    insights.push(
      make(
        InsightType.BEHAVIORAL_RECOMMENDATION,
        lat < 2
          ? 'Strong Task Initiation — Protect This Habit'
          : 'Reduce Initiation Friction',
        lat < 2
          ? `Your average start delay is ${lat} minutes — well within the 2-minute initiation threshold that research identifies as the boundary between successful and failed task starts in ADHD profiles.`
          : `Your average start delay is ${lat} minutes. Each minute of delay increases abandonment probability by approximately 15% in executive dysfunction profiles.`,
        lat < 2
          ? [
              'Maintain your current task structure and deadline settings.',
              'Do not increase daily task count while latency stays under 2 minutes.',
            ]
          : [
              'Pre-commit to your next task the night before by writing it down.',
              'Use a 90-second forced-start countdown (shorter = less avoidance time).',
              'Remove all optional decisions from the task start (pre-set environment).',
            ]
      )
    );
  }

  // ── ADAPTIVE STRATEGY ────────────────────────────────────────────────
  if (period === 'WEEKLY') {
    const fatigueHour = metrics.cognitiveFatigueHour;
    if (fatigueHour !== null) {
      insights.push(
        make(
          InsightType.ADAPTIVE_STRATEGY,
          `Stop Scheduling Tasks After ${fmtHr(fatigueHour)}`,
          `Completion rates drop below 50% after ${fmtHr(fatigueHour)} based on your session history. The prefrontal cortex operates under depleting glucose and neurotransmitter reserves after sustained cognitive effort — this is not a willpower failure, it is a biological ceiling.`,
          [
            `Set a hard cutoff: no new tasks after ${fmtHr(fatigueHour)}.`,
            `Reserve ${fmtHr(fatigueHour)}–${fmtHr(fatigueHour + 2)} for low-cognitive activities only.`,
            'Move any remaining high-priority tasks to the next morning work block.',
          ]
        )
      );
    } else {
      insights.push(
        make(
          InsightType.ADAPTIVE_STRATEGY,
          'Compress Your Daily Task Window',
          `Research on executive dysfunction shows that spreading tasks across a full day leads to lower completion than concentrating them into a defined 3-hour work block. Your system should enforce a single productive window rather than all-day availability.`,
          [
            'Define one 3-hour work block per day and reject all task scheduling outside it.',
            'Use the remaining hours for recovery, not rescheduled tasks.',
            'Track which 3-hour window consistently produces the most completions.',
          ]
        )
      );
    }
  }

  return insights;
}

// ─── Context Builder ──────────────────────────────────────────────────────

function buildContext(metrics: BehavioralMetrics, patterns: FailurePattern[]): string {
  const lines: string[] = [
    `Completion rate: ${metrics.completionRate_percent}%`,
    `Avg initiation latency: ${metrics.avgInitiationLatency_minutes} min (trend: ${metrics.initiationLatencyTrend})`,
    `Optimal focus window: ${metrics.optimalFocusWindow ? `${fmtHr(metrics.optimalFocusWindow.startHour)}–${fmtHr(metrics.optimalFocusWindow.endHour)}` : 'not yet determined'}`,
    `Cognitive fatigue hour: ${metrics.cognitiveFatigueHour !== null ? fmtHr(metrics.cognitiveFatigueHour) : 'not yet determined'}`,
  ];

  const peakFailureHour = Object.entries(metrics.failureByHour).sort(
    ([, a], [, b]) => b - a
  )[0];
  if (peakFailureHour) {
    lines.push(`Peak failure hour: ${fmtHr(Number(peakFailureHour[0]))} (${peakFailureHour[1]} failures)`);
  }

  if (patterns.length > 0) {
    lines.push('Detected patterns:');
    patterns.forEach(p => lines.push(`  [${p.type}] ${p.description}`));
  }

  return lines.join('\n');
}

function fmtHr(h: number): string {
  const suffix = h >= 12 ? 'pm' : 'am';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${suffix}`;
}
