"use client";

import { useState } from "react";

import { generateAssignmentsAction } from "./actions";
import { Button } from "@/components/ui/button";

export function GenerateAssignmentsButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setMessage(null);
    setError(null);

    const result = await generateAssignmentsAction();

    if (!result.success) {
      setError(result.error);
    } else if (result.data.created === 0) {
      setMessage("Nessuna nuova attività da generare: tutto è già aggiornato.");
    } else {
      setMessage(`${result.data.created} nuova/e attività generata/e dalle ricorrenze attive.`);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} disabled={loading}>
        {loading ? "Generazione in corso..." : "Genera prossime attività"}
      </Button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
