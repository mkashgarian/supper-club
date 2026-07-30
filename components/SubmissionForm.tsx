"use client";

import { useState } from "react";

export type SubmissionValues = {
  personName: string;
  restaurantName: string;
  cuisine: string;
  notes: string;
  url: string;
};

const EMPTY: SubmissionValues = {
  personName: "",
  restaurantName: "",
  cuisine: "",
  notes: "",
  url: "",
};

export default function SubmissionForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: SubmissionValues;
  submitLabel: string;
  onSubmit: (values: SubmissionValues) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<SubmissionValues>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const err = await onSubmit(values);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    if (!initial) setValues(EMPTY);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          required
          placeholder="Your name"
          value={values.personName}
          onChange={(e) => setValues({ ...values, personName: e.target.value })}
          className="rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-2"
        />
        <input
          required
          placeholder="Restaurant name"
          value={values.restaurantName}
          onChange={(e) => setValues({ ...values, restaurantName: e.target.value })}
          className="rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-2"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          placeholder="Cuisine (optional)"
          value={values.cuisine}
          onChange={(e) => setValues({ ...values, cuisine: e.target.value })}
          className="rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-2"
        />
        <input
          placeholder="Link (optional)"
          value={values.url}
          onChange={(e) => setValues({ ...values, url: e.target.value })}
          className="rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-2"
        />
      </div>
      <textarea
        placeholder="Notes (optional)"
        value={values.notes}
        onChange={(e) => setValues({ ...values, notes: e.target.value })}
        rows={2}
        className="rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-2"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Saving..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-black/15 dark:border-white/20 px-4 py-2 text-sm"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
