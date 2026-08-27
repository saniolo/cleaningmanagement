"use client";

import { cancelReplacementRequest } from "./actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";

export function CancelReplacementButton({ id }: { id: string }) {
  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="ghost">
          Annulla proposta
        </Button>
      }
      title="Annullare la proposta?"
      description="Il dipendente non potrà più accettarla. L'attività resta da assegnare e potrai proporla a qualcun altro."
      confirmLabel="Annulla proposta"
      variant="destructive"
      onConfirm={async () => {
        await cancelReplacementRequest(id);
      }}
    />
  );
}
