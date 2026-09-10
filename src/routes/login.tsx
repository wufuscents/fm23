import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — FM Squad Archive" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

const AUTH_STORAGE_KEY = "fm_auth_expires_at";
const AUTH_DURATION_MS = 2 * 60 * 60 * 1000;

function hasValidAuthSession() {
  if (typeof window === "undefined") return false;

  const expiresAt = Number(localStorage.getItem(AUTH_STORAGE_KEY) || 0);
  if (expiresAt > Date.now()) return true;

  localStorage.removeItem(AUTH_STORAGE_KEY);
  return false;
}

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
    const username = data.get("username");
    const password = data.get("password");
    if (username === "Death" && password === "liveisdead") {
      localStorage.setItem(AUTH_STORAGE_KEY, String(Date.now() + AUTH_DURATION_MS));
      router.navigate({ to: "/", replace: true });
    } else {
      setError(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="fm-panel w-full max-w-sm p-8">
        <p className="fm-label">Restricted Access</p>
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-foreground">
          Squad Archive
        </h1>
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
          {error && <p className="text-xs text-muted-foreground">lid</p>}
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
