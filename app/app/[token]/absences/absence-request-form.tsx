"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  absenceRequestSchema,
  type AbsenceRequestInput,
  ABSENCE_TYPE_LABELS_IT,
} from "@/lib/validation/absence";
import { createAbsenceRequest } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Local (not UTC) YYYY-MM-DD — this feeds a native <input type="date">,
// whose displayed value is the user's local calendar day.
function todayLocalISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Dates start pre-filled to today rather than blank: an empty native date
// input only renders a "gg/mm/aaaa" placeholder that some browsers draw as
// today's date, so it looks filled but submits an empty string and trips
// the "data obbligatoria" validation. Defaulting to today also makes a
// single-day request a zero-edit submit.
function buildDefaultValues(): AbsenceRequestInput {
  const today = todayLocalISODate();
  return {
    type: "VACATION",
    startDate: today,
    endDate: today,
    notes: undefined,
  };
}

export function AbsenceRequestForm({
  token,
  trigger,
}: {
  token: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<AbsenceRequestInput>({
    resolver: zodResolver(absenceRequestSchema),
    defaultValues: buildDefaultValues(),
  });

  async function onSubmit(values: AbsenceRequestInput) {
    setServerError(null);
    const result = await createAbsenceRequest(token, values);

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    setOpen(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      form.reset(buildDefaultValues());
      setServerError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="gap-5">
        <DialogHeader>
          <DialogTitle>Richiesta di assenza</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(ABSENCE_TYPE_LABELS_IT).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Impilati, non affiancati (vedi sotto per il perché).
                appearance-none: il "chrome" nativo di <input type="date">
                su Safari iOS ignora width: 100% finché non se ne disattiva
                lo stile nativo — senza, resta più stretto degli altri
                campi invece di allinearsi al loro bordo destro. */}
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dal</FormLabel>
                  <FormControl>
                    <Input type="date" className="appearance-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Al</FormLabel>
                  <FormControl>
                    {/* min impedisce di scegliere dal calendario nativo una
                        data precedente a "Dal" — la validazione vera resta
                        comunque lo schema Zod, questo è solo un aiuto in UI. */}
                    <Input
                      type="date"
                      className="appearance-none"
                      min={form.watch("startDate") || undefined}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (opzionale)</FormLabel>
                  <FormControl>
                    <Textarea rows={3} className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => handleOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                Annulla
              </Button>
              <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Invio..." : "Invia richiesta"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
