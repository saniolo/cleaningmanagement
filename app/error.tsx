"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

// Catches unexpected exceptions (a real bug, a DB hiccup) — anything routed
// through the ActionResult pattern never reaches here, since every Server
// Action returns a plain {success:false, error} for expected business
// errors instead of throwing. This is only for the rest: PROJECT_SPEC.md
// section 30 still applies — no raw stack trace shown to the user.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold">Si è verificato un errore imprevisto.</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Riprova. Se il problema persiste, contatta l&apos;amministratore.
      </p>
      <Button onClick={reset}>Riprova</Button>
    </div>
  );
}
