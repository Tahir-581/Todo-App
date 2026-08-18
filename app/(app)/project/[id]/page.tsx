"use client";

import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { TasksWorkspace } from "@/components/tasks/TasksWorkspace";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState("Project");

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((list: { id: string; name: string }[]) => {
        const p = list.find((x) => x.id === id);
        if (p) setName(p.name);
      })
      .catch(() => {});
  }, [id]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      <h1 className="font-display text-2xl font-semibold tracking-tight">{name}</h1>
      <p className="mt-1 text-sm text-zinc-500">Tasks scoped to this project.</p>
      <div className="mt-8">
        <TasksWorkspace projectId={id} hideProjectFilter />
      </div>
    </motion.div>
  );
}
