"use client";

import { useState } from "react";

import { cloneWeekToNextWeek } from "./actions";
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

export function CloneWeekButton({ weekStart }: { weekStart: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setError(null);
      setNotice(null);
    }
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    setNotice(null);
    const result = await cloneWeekToNextWeek(weekStart);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    if (result.data.skippedCount > 0) {
      setNotice(
        `Copiate ${result.data.clonedCount} attività. ` +
          `${result.data.skippedCount} saltate perché il dipendente ha già un impegno in quell'orario la settimana successiva.`
      );
      return;
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Clona settimana successiva</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clonare questa settimana nella successiva?</DialogTitle>
          <DialogDescription>
            Ogni attività assegnata in questa settimana verrà copiata sullo stesso giorno e orario,
            allo stesso dipendente, una settimana dopo. Le attività dove il dipendente ha già un
            altro impegno in quell&apos;orario vengono saltate automaticamente.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {notice && <p className="text-sm text-muted-foreground">{notice}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Chiudi
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={loading}>
            {loading ? "Clonazione..." : "Clona"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
