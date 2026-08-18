import type { z } from "zod";
import type { ideaStatusApiSchema } from "@/lib/validators";

/** Wire format for idea status (matches REST JSON). */
export type IdeaStatusApi = z.infer<typeof ideaStatusApiSchema>;

/** Idea as returned by `/api/ideas` (ISO date strings for JSON). */
export type IdeaDto = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  status: IdeaStatusApi;
  votes: number;
  columnOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type IdeaActivityDto = {
  id: string;
  ideaId: string;
  action: string;
  detail: string | null;
  createdAt: string;
};
