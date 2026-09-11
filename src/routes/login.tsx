import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  getArchiveProfile,
  hasValidAuthSession,
  PROFILE_CREDENTIALS,
  startArchiveSession,
  type ArchiveProfile,
} from "../lib/archive-auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — FM Squad Archive" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (hasValidAuthSession()) {
      router.navigate({ to: "/", replace: true });
    }
  }, [router]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const username = String(data.get("username") || "").trim();
    const password = String(data.get("password") || "");

    const profile = (Object.keys(PROFILE_CREDENTIALS) as ArchiveProfile[]).find(
      (candidate) => candidate === username && PROFILE_CREDENTIALS[candidate] === password,
    );

    if (profile) {
      startArchiveSession(profile);
      setError(false);
      router.navigate({ to: "/", replace: true });
    } else {
      setError(true);
    }
  }

  const currentProfile = hasValidAuthSession() ? getArchiveProfile() : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="fm-panel w-full max-w-sm p-8">
        <p className="fm-label">Restricted Access</p>
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-foreground">
          Squad Archive
        </h1>
        {currentProfile && (
          <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            Active profile / {currentProfile}
          </p>
        )}
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="username" className="fm-label">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              className="h-10 w-full rounded-md border border-input bg-input px-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="password" className="fm-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="h-10 w-full rounded-md border border-input bg-input px-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          {error && (
            <p className="text-xs text-muted-foreground">
              Invalid credentials.
            </p>
          )}
          <button
            type="submit"
            className="h-10 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
