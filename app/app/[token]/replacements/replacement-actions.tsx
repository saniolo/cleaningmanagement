"use client";

import { useState } from "react";

import { acceptReplacementRequest, rejectReplacementRequest } from "./actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";

export function ReplacementActions({ token, id }: { token: string; id: string }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="outline" className="flex-1">
              Rifiuta
            </Button>
          }
          title="Rifiutare questa attività?"
          confirmLabel="Rifiuta"
          variant="destructive"
          onConfirm={async () => {
            setError(null);
            const result = await rejectReplacementRequest(token, id);
            if (!result.success) setError(result.error);
          }}
        />
        <ConfirmDialog
          trigger={
            <Button size="sm" className="flex-1">
              Accetta
            </Button>
          }
          title="Accettare questa attività?"
          confirmLabel="Accetta"
          onConfirm={async () => {
            setError(null);
            const result = await acceptReplacementRequest(token, id);
            if (!result.success) setError(result.error);
          }}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
