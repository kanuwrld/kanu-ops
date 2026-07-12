import { z } from "zod";

export const projectCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  summary: z.string().trim().min(4).max(220),
});

export const branchCreateSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  goal: z.string().trim().min(4).max(220),
  dueDate: z.string().optional().nullable(),
});

export const taskCreateSchema = z.object({
  projectId: z.string().min(1),
  branchId: z.string().min(1),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().default(""),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  type: z
    .enum(["FEATURE", "BUG", "CHORE", "RESEARCH", "RELEASE"])
    .default("FEATURE"),
});

export const taskUpdateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  title: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
});

export const commentCreateSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  isPrivate: z.boolean().default(true),
});

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}
