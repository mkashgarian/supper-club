"use client";

import type { Submission } from "@/lib/db";
import SubmissionForm, { SubmissionValues } from "./SubmissionForm";

export default function SubmissionList({
  submissions,
  editingId,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: {
  submissions: Submission[];
  editingId: number | null;
  onStartEdit: (id: number) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: number, values: SubmissionValues) => Promise<string | null>;
  onDelete: (id: number) => void;
}) {
  if (submissions.length === 0) {
    return <p className="text-sm opacity-60">No submissions yet — be the first!</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {submissions.map((s) => (
        <li key={s.id} className="rounded-lg border border-black/10 dark:border-white/15 p-3">
          {editingId === s.id ? (
            <SubmissionForm
              initial={{
                personName: s.person_name,
                restaurantName: s.restaurant_name,
                cuisine: s.cuisine ?? "",
                notes: s.notes ?? "",
                url: s.url ?? "",
              }}
              submitLabel="Save"
              onCancel={onCancelEdit}
              onSubmit={(values) => onSaveEdit(s.id, values)}
            />
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {s.restaurant_name}
                  {s.cuisine && <span className="font-normal opacity-60"> · {s.cuisine}</span>}{" "}
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-sm underline opacity-70">
                      link
                    </a>
                  )}
                </p>
                <p className="text-sm opacity-60">submitted by {s.person_name}</p>
                {s.notes && <p className="text-sm opacity-60 mt-1">{s.notes}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => onStartEdit(s.id)}
                  className="text-sm underline underline-offset-4 opacity-70 hover:opacity-100"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(s.id)}
                  className="text-sm underline underline-offset-4 opacity-70 hover:opacity-100"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
