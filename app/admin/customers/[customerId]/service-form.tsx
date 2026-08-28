"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { serviceSchema, type ServiceInput } from "@/lib/validation/service";
import { createService, updateService } from "./actions";
import { DAY_OF_WEEK_SHORT_LABELS_IT } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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

interface ServiceFormProps {
  trigger: React.ReactNode;
  customerId: string;
  service?: { id: string } & ServiceInput;
  // Days currently active for this service (edit mode only), used to
  // pre-fill the toggles below.
  activeDays?: number[];
}

// Monday-first display order for the day toggles, mapped to the
// Sunday=0..Saturday=6 values RecurringSchedule.dayOfWeek actually stores.
const DAY_TOGGLE_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function ServiceForm({ trigger, customerId, service, activeDays = [] }: ServiceFormProps) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [scheduleDays, setScheduleDays] = useState<number[]>(activeDays);

  const form = useForm<ServiceInput>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: service?.name ?? "",
      description: service?.description ?? "",
      estimatedDurationMinutes: service?.estimatedDurationMinutes ?? 60,
      operationalNotes: service?.operationalNotes ?? "",
    },
  });

  function toggleDay(day: number) {
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  async function onSubmit(values: ServiceInput) {
    setServerError(null);
    const scheduleInput = { daysOfWeek: scheduleDays };
    const result = service
      ? await updateService(customerId, service.id, values, scheduleInput)
      : await createService(customerId, values, scheduleInput);

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    setOpen(false);
  }

  // Reset on OPEN, not on close — see EmployeeForm for why (this
  // component's useForm state outlives the dialog closing).
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      form.reset({
        name: service?.name ?? "",
        description: service?.description ?? "",
        estimatedDurationMinutes: service?.estimatedDurationMinutes ?? 60,
        operationalNotes: service?.operationalNotes ?? "",
      });
      setScheduleDays(activeDays);
      setServerError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{service ? "Modifica servizio" : "Nuovo servizio"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Pulizia scale" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="estimatedDurationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Durata stimata (minuti)</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Giorni della settimana (opzionale)</FormLabel>
              <div className="flex flex-wrap gap-1">
                {DAY_TOGGLE_ORDER.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                      scheduleDays.includes(day)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                  >
                    {DAY_OF_WEEK_SHORT_LABELS_IT[day]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {service
                  ? "Stessa durata per tutti i giorni selezionati. Deselezionando un giorno la sua ricorrenza viene disattivata (le attività già pianificate restano invariate)."
                  : "Per ogni giorno selezionato viene creata una ricorrenza settimanale con la durata indicata sopra."}
              </p>
            </FormItem>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="operationalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note operative</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Visibili al dipendente assegnato" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Salvataggio..." : "Salva"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
