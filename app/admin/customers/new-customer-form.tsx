"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";

import { newCustomerSchema, type NewCustomerInput } from "@/lib/validation/customer";
import { createCustomer } from "./actions";
import { createActivityTemplate } from "./activity-template-actions";
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

export interface ActivityTemplateOption {
  id: string;
  name: string;
  estimatedDurationMinutes: number;
}

// Monday-first display order, mapped to the Sunday=0..Saturday=6 values
// RecurringSchedule.dayOfWeek actually stores — same order as ServiceForm.
const DAY_TOGGLE_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface ActivitySchedule {
  daysOfWeek: number[];
}

const DEFAULT_VALUES: NewCustomerInput = {
  name: "",
  addressLine: "",
  city: "",
  postalCode: "",
  province: "",
  notes: "",
  activities: [],
};

export function NewCustomerForm({
  trigger,
  activityTemplates,
}: {
  trigger: React.ReactNode;
  activityTemplates: ActivityTemplateOption[];
}) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ActivityTemplateOption[]>(activityTemplates);
  // Insertion order of picked templates, kept separate from the schedule
  // map below so the per-activity rows render in a stable, predictable
  // order instead of jumping around as the underlying object's keys shift.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [schedules, setSchedules] = useState<Record<string, ActivitySchedule>>({});
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDuration, setNewTemplateDuration] = useState("60");
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [addingTemplate, setAddingTemplate] = useState(false);

  const form = useForm<NewCustomerInput>({
    resolver: zodResolver(newCustomerSchema),
    defaultValues: DEFAULT_VALUES,
  });

  function toggleTemplate(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        setSchedules((s) => {
          const next = { ...s };
          delete next[id];
          return next;
        });
        return prev.filter((i) => i !== id);
      }
      setSchedules((s) => ({ ...s, [id]: { daysOfWeek: [] } }));
      return [...prev, id];
    });
  }

  function toggleActivityDay(templateId: string, day: number) {
    setSchedules((s) => {
      const current = s[templateId] ?? { daysOfWeek: [] };
      const daysOfWeek = current.daysOfWeek.includes(day)
        ? current.daysOfWeek.filter((d) => d !== day)
        : [...current.daysOfWeek, day].sort();
      return { ...s, [templateId]: { ...current, daysOfWeek } };
    });
  }

  async function handleAddTemplate() {
    if (!newTemplateName.trim()) {
      setTemplateError("Inserisci un nome.");
      return;
    }
    setAddingTemplate(true);
    setTemplateError(null);
    const result = await createActivityTemplate({
      name: newTemplateName,
      estimatedDurationMinutes: Number(newTemplateDuration),
    });
    setAddingTemplate(false);

    if (!result.success) {
      setTemplateError(result.error);
      return;
    }

    setTemplates((prev) => [...prev, result.data]);
    setSelectedIds((prev) => [...prev, result.data.id]);
    setSchedules((s) => ({ ...s, [result.data.id]: { daysOfWeek: [] } }));
    setNewTemplateName("");
    setNewTemplateDuration("60");
  }

  async function onSubmit(values: NewCustomerInput) {
    setServerError(null);
    const result = await createCustomer({
      ...values,
      activities: selectedIds.map((id) => ({
        activityTemplateId: id,
        daysOfWeek: schedules[id]?.daysOfWeek ?? [],
      })),
    });

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
      form.reset(DEFAULT_VALUES);
      setSelectedIds([]);
      setSchedules({});
      setNewTemplateName("");
      setNewTemplateDuration("60");
      setTemplateError(null);
      setServerError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuovo cliente</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Condominio Verdi" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="addressLine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indirizzo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Città</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CAP</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provincia</FormLabel>
                      <FormControl>
                        <Input {...field} maxLength={2} placeholder="RM" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold">Attività (opzionale)</h3>

              {templates.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTemplate(t.id)}
                      className={cn(
                        "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                        selectedIds.includes(t.id)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      )}
                    >
                      {t.name} · {t.estimatedDurationMinutes} min
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs text-muted-foreground">Nuova attività standard</label>
                  <Input
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="Es. Pulizia scale"
                  />
                </div>
                <div className="w-24 space-y-1.5">
                  <label className="text-xs text-muted-foreground">Minuti</label>
                  <Input
                    type="number"
                    min={1}
                    value={newTemplateDuration}
                    onChange={(e) => setNewTemplateDuration(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTemplate}
                  disabled={addingTemplate}
                >
                  Aggiungi
                </Button>
              </div>
              {templateError && <p className="text-sm text-destructive">{templateError}</p>}

              {selectedIds.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Verranno create {selectedIds.length} attività per questo cliente. Per ognuna
                    puoi impostare subito i giorni della settimana (opzionale).
                  </p>
                  {selectedIds.map((id) => {
                    const t = templates.find((tpl) => tpl.id === id);
                    if (!t) return null;
                    const schedule = schedules[id] ?? { daysOfWeek: [] };
                    return (
                      <div key={id} className="space-y-2 rounded-md border p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-medium">
                            {t.name}
                            <span className="ml-1.5 font-normal text-muted-foreground">
                              · {t.estimatedDurationMinutes} min
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleTemplate(id)}
                            aria-label={`Rimuovi ${t.name}`}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-1">
                          {DAY_TOGGLE_ORDER.map((day) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleActivityDay(id, day)}
                              className={cn(
                                "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                                schedule.daysOfWeek.includes(day)
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "hover:bg-accent"
                              )}
                            >
                              {DAY_OF_WEEK_SHORT_LABELS_IT[day]}
                            </button>
                          ))}
                        </div>

                        {schedule.daysOfWeek.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            Nessun giorno selezionato: l&apos;attività verrà creata senza
                            ricorrenza, pianificabile a mano in seguito.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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
