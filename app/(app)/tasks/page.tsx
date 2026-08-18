"use client";

import { motion } from "framer-motion";
import { TasksWorkspace } from "@/components/tasks/TasksWorkspace";

export default function TasksPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      <h1 className="font-display text-2xl font-semibold tracking-tight">All tasks</h1>
      <p className="mt-1 text-sm text-zinc-500">List, board, and calendar across every project.</p>
      <div className="mt-8">
        <TasksWorkspace />
      </div>
    </motion.div>
  );
}
