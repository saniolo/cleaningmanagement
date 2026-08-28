"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { assignmentSchema, type AssignmentInput } from "@/lib/validation/assignment";
import { updateAssignment } from "./actions";
import { EmployeeSelector, type EmployeeOption } from "@/components/planning/employee-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

interface EditAssignmentFormProps {
  trigger: React.ReactNode;
  employees: EmployeeOption[];
  assignment: {
    id: string;
    date: string;
    durationMinutes: number;
    employeeId?: string;
  };
  serviceName: string;
  address: string;
  customerName: string;
}

export function EditAssignmentForm({
  trigger,
  employees,
  assignment,
  serviceName,
  address,
  customerName,
}: EditAssignmentFormProps) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<AssignmentInput>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      date: assignment.date,
      durationMinutes: assignment.durationMinutes,
      employeeId: assignment.employeeId,
    },
  });

  async function onSubmit(values: AssignmentInput) {
    setServerError(null);
    const result = await updateAssignment(assignment.id, values);

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          // re-sync in case the row's data changed since this dialog last opened
          form.reset({
            date: assignment.date,
            durationMinutes: assignment.durationMinutes,
            employeeId: assignment.employeeId,
          });
          setServerError(null);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{serviceName}</DialogTitle>
          <DialogDescription>
            {customerName} · {address}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                onClick={() => setOpen(false)}
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
