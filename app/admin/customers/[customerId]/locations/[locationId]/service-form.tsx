"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { serviceSchema, type ServiceInput } from "@/lib/validation/service";
import { createService, updateService } from "./actions";
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
  locationId: string;
  service?: { id: string } & ServiceInput;
}

export function ServiceForm({ trigger, customerId, locationId, service }: ServiceFormProps) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ServiceInput>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: service?.name ?? "",
      description: service?.description ?? "",
      estimatedDurationMinutes: service?.estimatedDurationMinutes ?? 60,
      operationalNotes: service?.operationalNotes ?? "",
    },
  });

  async function onSubmit(values: ServiceInput) {
    setServerError(null);
    const result = service
      ? await updateService(customerId, locationId, service.id, values)
      : await createService(customerId, locationId, values);

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    setOpen(false);
    // In create mode, reset to blank defaults (not `values`) — this
    // component's useForm state outlives the dialog closing, so without
    // this the next "Nuovo servizio" click would reopen pre-filled with
    // whatever was just submitted instead of a clean form.
    form.reset(service ? values : undefined);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
