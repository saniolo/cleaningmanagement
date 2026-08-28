"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { deleteService } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteServiceButton({
  customerId,
  serviceId,
  serviceName,
}: {
  customerId: string;
  serviceId: string;
  serviceName: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setError(null);
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const result = await deleteService(customerId, serviceId);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Elimina">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminare {serviceName}?</DialogTitle>
          <DialogDescription>
            L&apos;eliminazione è definitiva e rimuove anche le sue ricorrenze e tutte le attività
            pianificate, passate e future. Se vuoi solo smettere di pianificarlo mantenendo lo
            storico, usa &quot;Disattiva&quot; invece.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Annulla
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? "Eliminazione..." : "Elimina"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
