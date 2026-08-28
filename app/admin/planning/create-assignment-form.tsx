"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createAssignmentSchema, type CreateAssignmentInput } from "@/lib/validation/assignment";
import { createAssignment } from "./actions";
import { EmployeeSelector, type EmployeeOption } from "@/components/planning/employee-selector";
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

export interface ServiceOption {
  id: string;
  label: string;
  estimatedDurationMinutes: number;
}

const DEFAULT_DURATION_MINUTES = 60;

interface CreateAssignmentFormProps {
  trigger: React.ReactNode;
  services: ServiceOption[];
  employees: EmployeeOption[];
  defaultDate?: string;
  defaultEmployeeId?: string;
}

export function CreateAssignmentForm({
  trigger,
  services,
  employees,
  defaultDate,
  defaultEmployeeId,
}: CreateAssignmentFormProps) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CreateAssignmentInput>({
    resolver: zodResolver(createAssignmentSchema),
    defaultValues: {
      serviceId: "",
      date: defaultDate ?? "",
      durationMinutes: DEFAULT_DURATION_MINUTES,
      employeeId: defaultEmployeeId,
    },
  });

  async function onSubmit(values: CreateAssignmentInput) {
    setServerError(null);
    const result = await createAssignment(values);

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    setOpen(false);
  }

  // Reset on OPEN, not on close: this component's useForm state outlives
  // the dialog closing (it's a persistent trigger, not remounted per use),
  // so whichever path closed it last — successful submit, Annulla, Escape,
  // outside-click — could leave stale values behind. Resetting synchronously
  // whenever it opens guarantees a clean form regardless of dismiss path or
  // mount history, confirmed necessary via browser-driven testing:
  // cancelling out of a conflict error left the employee selection behind
  // for the next "Nuova attività".
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      form.reset({
        serviceId: "",
        date: defaultDate ?? "",
        durationMinutes: DEFAULT_DURATION_MINUTES,
        employeeId: defaultEmployeeId,
      });
      setServerError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuova attività</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="serviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Servizio</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Pre-fill the duration from the picked service — the
                      // admin can still override it below.
                      const matching = services.find((s) => s.id === value);
                      if (matching) {
                        form.setValue("durationMinutes", matching.estimatedDurationMinutes);
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona un servizio" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="durationMinutes"
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

            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dipendente</FormLabel>
                  <FormControl>
                    <EmployeeSelector
                      employees={employees}
                      value={field.value}
                      onChange={field.onChange}
                    />
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
