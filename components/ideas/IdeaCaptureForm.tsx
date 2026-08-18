"use client";

import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export type IdeaCaptureFormRef = {
  focusTitle: () => void;
};

type Props = {
  onCreate: (payload: { title: string; description?: string; tags: string[] }) => Promise<void>;
  existingTags: string[];
};

const IdeaCaptureFormInner = forwardRef<IdeaCaptureFormRef, Props>(function IdeaCaptureForm(
  { onCreate, existingTags },
  ref
) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [descOpen, setDescOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useImperativeHandle(ref, () => ({
    focusTitle: () => titleRef.current?.focus(),
  }));

  const addTag = useCallback((raw: string) => {
    const t = raw.trim();
    if (!t) return;
    setTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setTagInput("");
  }, []);

  const submit = useCallback(async () => {
    const t = title.trim();
    if (!t || submitting) return;
    setSubmitting(true);
    try {
      await onCreate({
        title: t,
        description: descOpen ? description : undefined,
        tags,
      });
      setTitle("");
      setDescription("");
      setTags([]);
      setTagInput("");
      setDescOpen(false);
    } finally {
      setSubmitting(false);
    }
  }, [title, description, tags, submitting, descOpen, onCreate]);

  function onTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && tagInput === "" && tags.length) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  function onTitleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <motion.div
      layout
      className="mb-8 rounded-2xl border border-zinc-800/80 bg-surface-raised/50 p-4 shadow-lg light:border-zinc-200 light:bg-white md:p-5"
    >
      <label className="sr-only" htmlFor="idea-title">
        Capture a new idea
      </label>
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Input
            ref={titleRef}
            id="idea-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={onTitleKeyDown}
            placeholder="Capture a new idea…"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setDescOpen((o) => !o)}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300 light:hover:text-zinc-700"
          >
            {descOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {descOpen ? "Hide description" : "Add description (optional)"}
          </button>
          <AnimatePresence initial={false}>
            {descOpen ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Expand on the idea…"
                  rows={3}
                  className="w-full resize-y rounded-lg border border-zinc-800 bg-[#0D0D0F] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none ring-accent/40 focus:border-accent focus:ring-2 light:bg-white light:border-zinc-200 light:text-zinc-900"
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div>
            <p className="mb-1.5 text-xs font-medium text-zinc-500">Tags</p>
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTags((prev) => prev.filter((x) => x !== tag))}
                  className="rounded-md border border-zinc-600 bg-zinc-800/60 px-2 py-0.5 text-xs text-zinc-200 hover:border-rose-500/50 hover:bg-rose-950/30 light:border-zinc-300 light:bg-zinc-100 light:text-zinc-800"
                  title="Remove tag"
                >
                  {tag} ×
                </button>
              ))}
              <input
                list="idea-tag-suggestions"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={onTagKeyDown}
                onBlur={() => {
                  if (tagInput.trim()) addTag(tagInput);
                }}
                placeholder="Type a tag, Enter to add"
                className="min-w-[8rem] flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-accent/40 light:text-zinc-900"
              />
            </div>
            <datalist id="idea-tag-suggestions">
              {existingTags
                .filter((t) => !tags.includes(t))
                .map((t) => (
                  <option key={t} value={t} />
                ))}
            </datalist>
          </div>
        </div>
        <Button type="button" onClick={() => void submit()} loading={submitting} disabled={!title.trim()}>
          <Plus className="h-4 w-4" />
          Add idea
        </Button>
      </div>
      <p className="mt-3 text-[11px] text-zinc-600">
        Press <kbd className="rounded border border-zinc-700 px-1">Enter</kbd> in the title field to save quickly.
        Press <kbd className="rounded border border-zinc-700 px-1">N</kbd> anywhere to focus capture.
      </p>
    </motion.div>
  );
});

export const IdeaCaptureForm = IdeaCaptureFormInner;
IdeaCaptureFormInner.displayName = "IdeaCaptureForm";
