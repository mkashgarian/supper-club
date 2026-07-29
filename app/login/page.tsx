"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Incorrect password");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm flex flex-col gap-4 rounded-xl border border-black/10 dark:border-white/15 p-6"
      >
        <h1 className="text-xl font-semibold text-center">🍽️ Supper Club</h1>
        <input
          type="password"
          placeholder="Group password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          className="rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-2"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="rounded-lg bg-foreground text-background py-2 font-medium disabled:opacity-50"
        >
          {loading ? "Checking..." : "Enter"}
        </button>
      </form>
    </main>
  );
}
