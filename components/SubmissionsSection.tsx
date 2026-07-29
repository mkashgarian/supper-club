"use client";

import { useState } from "react";
import type { Submission } from "@/lib/db";
import SubmissionForm, { SubmissionValues } from "./SubmissionForm";
import SubmissionList from "./SubmissionList";

export default function SubmissionsSection({
  cycleMonth,
  initialSubmissions,
}: {
  cycleMonth: string;
  initialSubmissions: Submission[];
}) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/submissions");
    const data = await res.json();
    setSubmissions(data.submissions);
  }

  async function handleAdd(values: SubmissionValues): Promise<string | null> {
    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) {
      setAddError(data.error);
      return data.error;
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
    const data = await res.json();
    if (!res.ok) return data.error;
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
        <h2 className="text-lg font-semibold mb-3">Submit your pick for {cycleMonth}</h2>
        <SubmissionForm submitLabel="Submit" onSubmit={handleAdd} />
        {addError && <p className="text-sm text-red-500 mt-2">{addError}</p>}
      </div>
      <div>
        <h3 className="text-sm font-medium opacity-70 mb-2">
          Submitted so far ({submissions.length})
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
