"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronLeft, Clock3, MapPin, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { updateAssignment } from "./actions";
import { usePlanningSearch } from "./planning-search";
import {
  EmployeeSelector,
  type EmployeeOption,
} from "@/components/planning/employee-selector";

export interface UnassignedPlanningGroup {
  id: string;
  customerName: string;
  address: string;
  serviceName: string;
  durationMinutes: number;
  occurrences: {
    id: string;
    date: string;
    displayDate: string;
    durationMinutes: number;
    employeeId?: string;
    requiresConfirmation?: boolean;
  }[];
}

const weekdayFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  timeZone: "UTC",
});
const longDateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatWeekday(date: string) {
  if (!date) return "";
  return weekdayFormatter.format(new Date(`${date}T00:00:00.000Z`));
}

export function UnassignedPlanningPanel({
  groups,
  employees,
}: {
  groups: UnassignedPlanningGroup[];
  employees: EmployeeOption[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { selectedAssignment, setSelectedAssignment } = usePlanningSearch();
  const selected = useMemo(
    () => groups.find((group) => group.id === selectedId) ?? null,
    [groups, selectedId]
  );
  const assignedGroup = useMemo<UnassignedPlanningGroup | null>(() => {
    if (!selectedAssignment) return null;
    return {
      id: `assigned:${selectedAssignment.id}`,
      customerName: selectedAssignment.customerName,
      address: selectedAssignment.address,
      serviceName: selectedAssignment.serviceName,
      durationMinutes: selectedAssignment.durationMinutes,
      occurrences: [
        {
          id: selectedAssignment.id,
          date: selectedAssignment.date,
          displayDate: longDateFormatter.format(
            new Date(`${selectedAssignment.date}T00:00:00.000Z`)
          ),
          durationMinutes: selectedAssignment.durationMinutes,
          employeeId: selectedAssignment.employeeId,
          requiresConfirmation: selectedAssignment.requiresConfirmation,
        },
      ],
    };
  }, [selectedAssignment]);

  useEffect(() => {
    if (selectedAssignment) setSelectedId(null);
  }, [selectedAssignment]);

  const detailGroup = assignedGroup ?? selected;
  const isAssignedDetail = Boolean(assignedGroup);

  return (
    <aside
      className={cn(
        "flex min-h-[34rem] flex-col overflow-hidden rounded-xl border bg-card shadow-[0_14px_40px_-32px_rgba(15,23,42,0.35)] transition-[border-color,box-shadow] xl:sticky xl:top-0 xl:h-full xl:min-h-0",
        isAssignedDetail && "border-blue-500 ring-2 ring-blue-100"
      )}
    >
      {detailGroup ? (
        <AssignmentDetail
          key={detailGroup.id}
          group={detailGroup}
          employees={employees}
          assigned={isAssignedDetail}
          onBack={() => {
            if (isAssignedDetail) setSelectedAssignment(null);
            else setSelectedId(null);
          }}
        />
      ) : (
        <>
          <div className="border-b px-5 pb-4 pt-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Da assegnare</h2>
                <p className="mt-1 text-xs text-muted-foreground">Questa settimana</p>
              </div>
              <span className="grid min-w-7 place-items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold tabular-nums text-amber-700">
                {groups.reduce((total, group) => total + group.occurrences.length, 0)}
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {groups.length === 0 ? (
              <div className="flex h-full min-h-64 flex-col items-center justify-center px-6 text-center">
                <span className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                  <Check className="h-5 w-5" />
                </span>
                <p className="text-sm font-semibold">Settimana coperta</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Non ci sono attività in attesa di assegnazione.
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    setSelectedAssignment(null);
                    setSelectedId(group.id);
                  }}
                  className="group w-full rounded-lg border border-transparent bg-muted/45 p-3 text-left transition-all duration-200 hover:border-border hover:bg-background hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{group.customerName}</p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" /> {group.address}
                      </p>
                    </div>
                    <span className="shrink-0 rounded bg-background px-1.5 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-border">
                      {group.occurrences.length} {group.occurrences.length === 1 ? "data" : "date"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 border-t pt-2.5 text-xs">
                    <span className="max-w-[11rem] truncate font-medium text-blue-700">
                      {group.serviceName}
                    </span>
                    <span className="ml-auto flex shrink-0 items-center gap-1 text-muted-foreground">
                      <Clock3 className="h-3 w-3" /> {group.durationMinutes} min
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </aside>
  );
}

function AssignmentDetail({
  group,
  employees,
  assigned,
  onBack,
}: {
  group: UnassignedPlanningGroup;
  employees: EmployeeOption[];
  assigned: boolean;
  onBack: () => void;
}) {
  const [employeeValues, setEmployeeValues] = useState<Record<string, string | undefined>>(() =>
    Object.fromEntries(
      group.occurrences.map((occurrence) => [occurrence.id, occurrence.employeeId])
    )
  );
  const [dateValues, setDateValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(group.occurrences.map((occurrence) => [occurrence.id, occurrence.date]))
  );
  const [requiresConfirmationValues, setRequiresConfirmationValues] = useState<
    Record<string, boolean>
  >(() =>
    Object.fromEntries(
      group.occurrences.map((occurrence) => [
        occurrence.id,
        occurrence.requiresConfirmation ?? false,
      ])
    )
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = group.occurrences.some(
    (occurrence) =>
      employeeValues[occurrence.id] !== occurrence.employeeId ||
      dateValues[occurrence.id] !== occurrence.date ||
      requiresConfirmationValues[occurrence.id] !== (occurrence.requiresConfirmation ?? false)
  );

  async function save() {
    setError(null);
    setIsSaving(true);
    try {
      for (const occurrence of group.occurrences) {
        const employeeId = employeeValues[occurrence.id];
        const date = dateValues[occurrence.id] ?? occurrence.date;
        const requiresConfirmation = requiresConfirmationValues[occurrence.id] ?? false;
        if (
          employeeId === occurrence.employeeId &&
          date === occurrence.date &&
          requiresConfirmation === (occurrence.requiresConfirmation ?? false)
        ) {
          continue;
        }
        const result = await updateAssignment(occurrence.id, {
          date,
          durationMinutes: occurrence.durationMinutes,
          employeeId,
          requiresConfirmation,
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
      }
    } finally {
      setIsSaving(false);
    }
    onBack();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-4 pb-5 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft className="h-4 w-4" /> Tutte le attività
        </button>
        <h2 className="text-xl font-semibold tracking-tight">{group.customerName}</h2>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> {group.address}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
            {group.serviceName}
          </span>
          <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            {group.durationMinutes} min
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {assigned ? "Modifica assegnazione" : "Assegna per occorrenza"}
        </p>
        <div className="space-y-3">
          {group.occurrences.map((occurrence) => (
            <article
              key={occurrence.id}
              className="relative rounded-lg border bg-background p-3 shadow-sm"
            >
              <span className="absolute right-3 top-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {formatWeekday(dateValues[occurrence.id] ?? occurrence.date)}
              </span>
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor={`occurrence-date-${occurrence.id}`}
                    className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                  >
                    <CalendarDays className="h-3.5 w-3.5" /> Data
                  </label>
                  <Input
                    id={`occurrence-date-${occurrence.id}`}
                    type="date"
                    value={dateValues[occurrence.id] ?? occurrence.date}
                    onChange={(event) =>
                      setDateValues((current) => ({
                        ...current,
                        [occurrence.id]: event.target.value,
                      }))
                    }
                    className="h-10 bg-muted/25 text-sm font-medium shadow-none transition-colors hover:border-foreground/30 focus:bg-background"
                  />
                </div>

                <div>
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <UserRound className="h-3.5 w-3.5" /> Assegnatario
                  </span>
                  <EmployeeSelector
                    employees={employees}
                    value={employeeValues[occurrence.id]}
                    onChange={(value) =>
                      setEmployeeValues((current) => ({
                        ...current,
                        [occurrence.id]: value,
                      }))
                    }
                    date={dateValues[occurrence.id] ?? occurrence.date}
                    aria-label={`Assegnatario per ${occurrence.displayDate}`}
                    className="h-10 border-border bg-muted/25 text-sm font-medium shadow-none transition-colors hover:border-foreground/30 focus:bg-background focus:ring-2"
                  />
                </div>

                <label
                  className={cn(
                    "flex items-center gap-2 text-xs text-muted-foreground",
                    employeeValues[occurrence.id] ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                  )}
                >
                  <Checkbox
                    checked={requiresConfirmationValues[occurrence.id] ?? false}
                    disabled={!employeeValues[occurrence.id]}
                    onCheckedChange={(checked) =>
                      setRequiresConfirmationValues((current) => ({
                        ...current,
                        [occurrence.id]: checked,
                      }))
                    }
                  />
                  Richiede conferma
                </label>
              </div>
            </article>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </div>

      <div className="grid grid-cols-[0.8fr_1.2fr] gap-2 border-t bg-background p-4">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSaving}>
          Annulla
        </Button>
        <Button type="button" onClick={save} disabled={!hasChanges || isSaving}>
          {isSaving ? "Salvataggio…" : "Salva assegnazioni"}
        </Button>
      </div>
    </div>
  );
}
