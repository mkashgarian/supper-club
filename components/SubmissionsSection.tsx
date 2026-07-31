"use client";

import { useState } from "react";
import type { Submission } from "@/lib/db";
import SubmissionForm, { SubmissionValues } from "./SubmissionForm";
import SubmissionList from "./SubmissionList";

async function safeJson(res: Response): Promise<{ error?: string; [key: string]: unknown }> {
  try {
    return await res.json();
  } catch {
    return { error: `Something went wrong (server returned ${res.status}).` };
  }
}

export default function SubmissionsSection({
  initialSubmissions,
}: {
  initialSubmissions: Submission[];
}) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/submissions");
    const data = await safeJson(res);
    if (Array.isArray(data.submissions)) setSubmissions(data.submissions as Submission[]);
  }

  async function handleAdd(values: SubmissionValues): Promise<string | null> {
    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await safeJson(res);
    if (!res.ok) {
      const message = data.error ?? "Couldn't submit — please try again.";
      setAddError(message);
      return message;
    }
    setAddError(null);
    await refresh();
    return null;
  }

  async function handleSaveEdit(id: number, values: SubmissionValues): Promise<string | null> {
    const res = await fetch(`/api/submissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await safeJson(res);
    if (!res.ok) return data.error ?? "Couldn't save — please try again.";
    setEditingId(null);
    await refresh();
    return null;
  }

  async function handleDelete(id: number) {
    await fetch(`/api/submissions/${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold mb-3">Add your pick</h2>
        <p className="text-sm opacity-60 mb-3">
          One active pick per person. It stays in the running until it wins — no need to resubmit
          each month.
        </p>
        <SubmissionForm submitLabel="Submit" onSubmit={handleAdd} />
        {addError && <p className="text-sm text-red-500 mt-2">{addError}</p>}
      </div>
      <div>
        <h3 className="text-sm font-medium opacity-70 mb-2">
          In the running ({submissions.length})
        </h3>
        <SubmissionList
          submissions={submissions}
          editingId={editingId}
          onStartEdit={setEditingId}
          onCancelEdit={() => setEditingId(null)}
          onSaveEdit={handleSaveEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
