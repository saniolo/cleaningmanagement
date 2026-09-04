"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";

import { adminProfileSchema, type AdminProfileInput } from "@/lib/validation/admin-profile";
import { updateAdminProfile } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface AdminProfileFormProps {
  trigger: React.ReactNode;
  admin: {
    firstName: string;
    lastName: string;
    email: string;
    mustChangePassword: boolean;
  };
}

export function AdminProfileForm({ trigger, admin }: AdminProfileFormProps) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const defaultValues: AdminProfileInput = {
    firstName: admin.firstName,
    lastName: admin.lastName,
    email: admin.email,
    currentPassword: "",
    newPassword: undefined,
  };

  const form = useForm<AdminProfileInput>({
    resolver: zodResolver(adminProfileSchema),
    defaultValues,
  });

  async function onSubmit(values: AdminProfileInput) {
    setServerError(null);
    const result = await updateAdminProfile(values);

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
      form.reset(defaultValues);
      setServerError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="gap-5">
        <DialogHeader>
          <DialogTitle>Modifica account</DialogTitle>
        </DialogHeader>

        {admin.mustChangePassword && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>Devi impostare una nuova password: quella attuale è provvisoria.</span>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cognome</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nuova password (opzionale)</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Lascia vuoto per non cambiarla"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password attuale</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
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
                {form.formState.isSubmitting ? "Salvataggio..." : "Salva"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
