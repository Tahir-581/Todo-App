"use client";

import { format } from "date-fns";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Pencil, Trash2, Archive } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IDEA_STATUS_EMOJI, IDEA_STATUS_LABEL, IDEA_STATUS_ORDER } from "@/lib/ideas/ideaStatusMeta";
import { tagPillStyle } from "@/lib/ideas/tagColor";
import type { IdeaDto, IdeaStatusApi } from "@/lib/ideas/types";
import { IdeaActivityList } from "./IdeaActivityList";

function preview(text: string, max: number) {
  const t = text.trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function IdeaCard({
  idea,
  variant = "list",
  onVote,
  onPatch,
  onDelete,
}: {
  idea: IdeaDto;
  variant?: "list" | "kanban";
  onVote: (id: string, d: 1 | -1) => void;
  onPatch: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(idea.title);
  const [description, setDescription] = useState(idea.description);
  const [saving, setSaving] = useState(false);

  async function saveEdit() {
    if (!title.trim()) return;
    setSaving(true);
    await onPatch(idea.id, {
      title: title.trim(),
      description: description.trim(),
    });
    setSaving(false);
    setEditing(false);
  }

  async function setStatus(s: IdeaStatusApi) {
    await onPatch(idea.id, { status: s });
  }

  const cardBody = (
    <>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" autoFocus />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
                className="w-full resize-y rounded-lg border border-zinc-800 bg-[#0D0D0F] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none ring-accent/40 focus:border-accent focus:ring-2 light:bg-white light:border-zinc-200 light:text-zinc-900"
              />
              <div className="flex gap-2">
                <Button type="button" className="!px-3 !py-1.5 text-xs" onClick={() => void saveEdit()} loading={saving}>
                  Save
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="!px-3 !py-1.5 text-xs"
                  onClick={() => {
                    setTitle(idea.title);
                    setDescription(idea.description);
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <h3
                  className="font-medium leading-snug text-zinc-100 light:text-zinc-900 cursor-pointer"
                  onDoubleClick={() => setEditing(true)}
                  title="Double-click to edit"
                >
                  {idea.title}
                </h3>
                <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-zinc-800/80 bg-black/20 p-0.5 light:border-zinc-200 light:bg-zinc-100">
                  <button
                    type="button"
                    className="rounded p-1 text-zinc-500 hover:bg-white/5 hover:text-emerald-400"
                    aria-label="Upvote"
                    onClick={() => onVote(idea.id, 1)}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <span className="min-w-[1.25rem] text-center text-xs font-semibold tabular-nums text-zinc-300">
                    {idea.votes}
                  </span>
                  <button
                    type="button"
                    className="rounded p-1 text-zinc-500 hover:bg-white/5 hover:text-rose-400 disabled:opacity-30"
                    aria-label="Downvote"
                    disabled={idea.votes <= 0}
                    onClick={() => onVote(idea.id, -1)}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {idea.description ? (
                <p className="mt-1.5 line-clamp-2 text-sm text-zinc-500 light:text-zinc-600">
                  {preview(idea.description, 160)}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>

      {!editing ? (
        <>
          {idea.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {idea.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium light:!text-zinc-950"
                  style={tagPillStyle(tag)}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span>{format(new Date(idea.createdAt), "MMM d, yyyy")}</span>
            <span className="text-zinc-700">·</span>
            <label className="inline-flex items-center gap-1.5">
              <span className="sr-only">Status</span>
              <span aria-hidden>{IDEA_STATUS_EMOJI[idea.status]}</span>
              <select
                value={idea.status}
                onChange={(e) => void setStatus(e.target.value as IdeaStatusApi)}
                className="max-w-[10rem] rounded-md border border-zinc-700 bg-zinc-900/80 px-1.5 py-1 text-xs text-zinc-200 outline-none focus:border-accent light:border-zinc-300 light:bg-white light:text-zinc-900"
              >
                {IDEA_STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {IDEA_STATUS_EMOJI[s]} {IDEA_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              className="!h-8 !px-2 !py-0 text-xs text-zinc-400"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            {idea.status !== "archived" ? (
              <Button
                type="button"
                variant="ghost"
                className="!h-8 !px-2 !py-0 text-xs text-zinc-400"
                onClick={() => void setStatus("archived")}
              >
                <Archive className="h-3.5 w-3.5" />
                Archive
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              className="!h-8 !px-2 !py-0 text-xs text-rose-400/90 hover:text-rose-300"
              onClick={() => {
                if (typeof window !== "undefined" && window.confirm("Delete this idea permanently?")) {
                  onDelete(idea.id);
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>

          <IdeaActivityList ideaId={idea.id} />
        </>
      ) : null}
    </>
  );

  const wrapClass =
    variant === "kanban"
      ? "rounded-xl border border-zinc-800/80 bg-surface-raised/90 p-3 shadow-lg shadow-black/20 light:border-zinc-200 light:bg-white"
      : "rounded-xl border border-zinc-800/80 bg-surface-raised/60 p-4 shadow-md shadow-black/15 light:border-zinc-200 light:bg-white";

  const inner = (
    <div className={`${wrapClass} transition-shadow hover:shadow-lg hover:shadow-black/25 light:hover:shadow-zinc-200/80`}>
      {cardBody}
    </div>
  );

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      {inner}
    </motion.div>
  );
}
