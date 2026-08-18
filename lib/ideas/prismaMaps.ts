import type { IdeaDto, IdeaStatusApi } from "./types";

/**
 * Values persisted by Prisma for `Idea.status` (schema `enum IdeaStatus`).
 * Kept as string literals so this module never reads `@prisma/client` enum
 * objects at load time — those can be missing until `prisma generate` runs.
 */
export type PrismaIdeaStatusDb =
  | "PARKED"
  | "PRIORITY"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "ARCHIVED";

/** Maps DB enum strings to API strings (hyphenated where needed). */
export const PRISMA_TO_API: Record<PrismaIdeaStatusDb, IdeaStatusApi> = {
  PARKED: "parked",
  PRIORITY: "priority",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  ARCHIVED: "archived",
};

const API_TO_PRISMA: Record<IdeaStatusApi, PrismaIdeaStatusDb> = {
  parked: "PARKED",
  priority: "PRIORITY",
  "in-progress": "IN_PROGRESS",
  completed: "COMPLETED",
  archived: "ARCHIVED",
};

export function toApiStatus(s: PrismaIdeaStatusDb): IdeaStatusApi {
  return PRISMA_TO_API[s];
}

export function toPrismaStatus(s: IdeaStatusApi): PrismaIdeaStatusDb {
  return API_TO_PRISMA[s];
}

export function ideaRowToDto(idea: {
  id: string;
  title: string;
  description: string;
  tags: string[];
  status: PrismaIdeaStatusDb;
  votes: number;
  columnOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): IdeaDto {
  return {
    id: idea.id,
    title: idea.title,
    description: idea.description,
    tags: idea.tags,
    status: toApiStatus(idea.status),
    votes: idea.votes,
    columnOrder: idea.columnOrder,
    createdAt: idea.createdAt.toISOString(),
    updatedAt: idea.updatedAt.toISOString(),
  };
}
