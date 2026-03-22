/**
 * Task Entry Screen
 *
 * Simple, focused form for task creation
 * Auto-fragmentation happens automatically
 *
 * Design: One field at a time, minimal decisions
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Input, Button, Card, SectionHeader } from '../components/UI';
import { theme } from '../styles/theme';
import { Task, TaskStatus } from '../types/models';
import { fragmentTask, needsFragmentation } from '../engines/TaskFragmentationEngine';
import { calculateUrgency } from '../engines/ArtificialDeadlineEngine';
import { useStore } from '../store/appStore';
import { addHours, format } from 'date-fns';

interface TaskEntryScreenProps {
  onSubmit: (tasks: Omit<Task, 'id' | 'created_at' | 'updated_at'>[]) => void;
  onCancel: () => void;
}

export function TaskEntryScreen({ onSubmit, onCancel }: TaskEntryScreenProps) {
  const { currentUser, currentBlock } = useStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [deadline, setDeadline] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Suggest same-day deadline by default
  const suggestedDeadline = format(addHours(new Date(), 8), 'HH:mm');

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Task title is required';
    }

    if (!duration || isNaN(Number(duration)) || Number(duration) <= 0) {
      newErrors.duration = 'Enter a valid duration in minutes';
    }

    if (!deadline.trim()) {
      newErrors.deadline = 'Deadline time is required (HH:MM format)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate() || !currentUser) return;

    setIsSubmitting(true);

    try {
      // Parse deadline
      const [hours, minutes] = deadline.split(':').map(Number);
      const deadlineDate = new Date();
      deadlineDate.setHours(hours, minutes, 0, 0);

      // If deadline is in the past, assume next day
      if (deadlineDate < new Date()) {
        deadlineDate.setDate(deadlineDate.getDate() + 1);
      }

      const durationNum = Number(duration);

      // Create base task
      const baseTask: Omit<Task, 'id' | 'created_at' | 'updated_at'> = {
        user_id: currentUser.id,
        title: title.trim(),
        description: description.trim() || undefined,
        duration_minutes: durationNum,
        deadline: deadlineDate.toISOString(),
        urgency_score: 0, // Will be calculated
        status: TaskStatus.PENDING,
        is_fragmented: false,
        daily_block_id: currentBlock?.id,
      };

      // Calculate urgency
      const urgencyCalc = calculateUrgency(
        { ...baseTask, id: 'temp', created_at: '', updated_at: '' } as Task,
        currentBlock
      );
      baseTask.urgency_score = urgencyCalc.score;

      // Check if fragmentation needed
      if (needsFragmentation(durationNum)) {
        const fragmentResult = fragmentTask(baseTask);

        Alert.alert(
          'Task Auto-Fragmented',
          `This task exceeds ${currentUser.settings.max_task_duration_minutes} minutes and will be split into ${fragmentResult.fragments.length} smaller tasks.\n\n${fragmentResult.reasoning}`,
          [
            {
              text: 'OK',
              onPress: () => {
                onSubmit(fragmentResult.fragments);
                setIsSubmitting(false);
              },
            },
          ]
        );
      } else {
        onSubmit([baseTask]);
        setIsSubmitting(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create task. Please check your inputs.');
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SectionHeader
          title="Add Task"
          subtitle="Keep it simple - one clear action"
        />

        <Card>
          <Input
            label="What needs to be done?"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Write report introduction"
            error={errors.title}
          />

          <Input
            label="Additional details (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Any helpful context..."
            multiline
            numberOfLines={3}
          />

          <Input
            label="How long will it take? (minutes)"
            value={duration}
            onChangeText={setDuration}
            placeholder="e.g., 30"
            keyboardType="numeric"
            error={errors.duration}
          />

          {duration && Number(duration) > (currentUser?.settings.max_task_duration_minutes || 45) && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ⚠️ This task will be automatically split into smaller parts
              </Text>
            </View>
          )}

          <Input
            label="Deadline time (HH:MM)"
            value={deadline}
            onChangeText={setDeadline}
            placeholder={`e.g., ${suggestedDeadline}`}
            keyboardType="numeric"
            error={errors.deadline}
          />

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>💡 Tip</Text>
            <Text style={styles.infoText}>
              Same-day deadlines work best for maintaining urgency
            </Text>
          </View>
        </Card>

        <View style={styles.actions}>
          <Button
            title="ADD TASK"
            onPress={handleSubmit}
            fullWidth
            loading={isSubmitting}
          />
          <Button
            title="CANCEL"
            onPress={onCancel}
            variant="secondary"
            fullWidth
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.layout.screenPadding,
  },
  actions: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  infoBox: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  infoLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  infoText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
  },
});
