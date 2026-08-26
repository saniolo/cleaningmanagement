"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  recurringScheduleSchema,
  type RecurringScheduleInput,
} from "@/lib/validation/recurring-schedule";
import { DAY_OF_WEEK_LABELS_IT } from "@/lib/dates";
import { createRecurringSchedule, updateRecurringSchedule } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface RecurringScheduleFormProps {
  trigger: React.ReactNode;
  customerId: string;
  locationId: string;
  serviceId: string;
  schedule?: { id: string } & RecurringScheduleInput;
}

export function RecurringScheduleForm({
  trigger,
  customerId,
  locationId,
  serviceId,
  schedule,
}: RecurringScheduleFormProps) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<RecurringScheduleInput>({
    resolver: zodResolver(recurringScheduleSchema),
    defaultValues: {
      dayOfWeek: schedule?.dayOfWeek ?? 1,
      startTime: schedule?.startTime ?? "08:00",
      estimatedDurationMinutes: schedule?.estimatedDurationMinutes ?? 60,
      effectiveFrom: schedule?.effectiveFrom ?? new Date().toISOString().slice(0, 10),
      effectiveUntil: schedule?.effectiveUntil ?? "",
    },
  });

  async function onSubmit(values: RecurringScheduleInput) {
    setServerError(null);
    const result = schedule
      ? await updateRecurringSchedule(customerId, locationId, serviceId, schedule.id, values)
      : await createRecurringSchedule(customerId, locationId, serviceId, values);

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
        dayOfWeek: schedule?.dayOfWeek ?? 1,
        startTime: schedule?.startTime ?? "08:00",
        estimatedDurationMinutes: schedule?.estimatedDurationMinutes ?? 60,
        effectiveFrom: schedule?.effectiveFrom ?? new Date().toISOString().slice(0, 10),
        effectiveUntil: schedule?.effectiveUntil ?? "",
      });
      setServerError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{schedule ? "Modifica ricorrenza" : "Nuova ricorrenza"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="dayOfWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Giorno della settimana</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DAY_OF_WEEK_LABELS_IT.map((label, index) => (
                        <SelectItem key={index} value={String(index)}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ora inizio</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
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
                    <FormLabel>Durata (minuti)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="effectiveFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valida dal</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="effectiveUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valida fino al (opzionale)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
