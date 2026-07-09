import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

/* Thin wrapper around lib/firebase.ts that lazy-loads the Firebase SDK
   only when it's actually usable — Google sign-in requires a real
   http(s) origin, so on a file:// launch we never even import it. */

export function authAvailable(): boolean {
  return typeof location !== "undefined" && location.protocol.startsWith("http");
}

export function useAuthUser(): { user: User | null; ready: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!authAvailable()) {
      setReady(true);
      return;
    }
    let unsub: (() => void) | undefined;
    let cancelled = false;
    import("./firebase").then(({ onAuthChange }) => {
      if (cancelled) return;
      unsub = onAuthChange((u) => {
        setUser(u);
        setReady(true);
      });
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  return { user, ready };
}

export async function signIn(): Promise<User> {
  const { signInWithGoogle } = await import("./firebase");
  return signInWithGoogle();
}

export async function signOutUser(): Promise<void> {
  const { signOutOfGoogle } = await import("./firebase");
  await signOutOfGoogle();
}
