import { TaskPriority, TaskRecurrence, TaskStatus } from "@prisma/client";
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean().optional(),
});

export const signupSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8, "At least 8 characters"),
});

export const projectSchema = z.object({
  name: z.string().min(1).max(120),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  emoji: z.string().max(8).optional(),
});

export const labelSchema = z.object({
  name: z.string().min(1).max(64),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const taskStatus = z.nativeEnum(TaskStatus);
const taskPriority = z.nativeEnum(TaskPriority);
const taskRecurrence = z.nativeEnum(TaskRecurrence);

export const taskCreateSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(20000).optional(),
  status: taskStatus.optional(),
  priority: taskPriority.optional(),
  projectId: z.string().cuid(),
  deadline: z.string().datetime().nullable().optional(),
  reminderAt: z.string().datetime().nullable().optional(),
  reminderSound: z.boolean().optional(),
  deadlineRecurrence: taskRecurrence.optional(),
  reminderRecurrence: taskRecurrence.optional(),
  labelIds: z.array(z.string().cuid()).optional(),
});

export const taskUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(20000).optional(),
  status: taskStatus.optional(),
  priority: taskPriority.optional(),
  projectId: z.string().cuid().optional(),
  deadline: z.string().datetime().nullable().optional(),
  reminderAt: z.string().datetime().nullable().optional(),
  reminderSound: z.boolean().optional(),
  reminderSnoozedUntil: z.string().datetime().nullable().optional(),
  deadlineRecurrence: taskRecurrence.optional(),
  reminderRecurrence: taskRecurrence.optional(),
  labelIds: z.array(z.string().cuid()).optional(),
});

export const subtaskSchema = z.object({
  title: z.string().min(1).max(500),
  order: z.number().int().optional(),
});

export const commentSchema = z.object({
  content: z.string().min(1).max(5000),
});

/** API-facing idea status (hyphenated `in-progress` matches product copy). */
export const ideaStatusApiSchema = z.enum([
  "parked",
  "priority",
  "in-progress",
  "completed",
  "archived",
]);

const ideaTagSchema = z.string().trim().min(1, "Tag cannot be empty").max(48, "Tag too long");

export const ideaCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300),
  description: z.string().max(10_000).optional().default(""),
  tags: z.array(ideaTagSchema).max(32).optional().default([]),
  status: ideaStatusApiSchema.optional(),
});

export const ideaUpdateSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().max(10_000).optional(),
  tags: z.array(ideaTagSchema).max(32).optional(),
  status: ideaStatusApiSchema.optional(),
  columnOrder: z.number().int().min(0).max(1_000_000).optional(),
  /** Server applies increment and clamps votes to >= 0. */
  voteDelta: z.union([z.literal(1), z.literal(-1)]).optional(),
});
