"use client";

import { createContext, useContext, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

export interface SelectedPlanningAssignment {
  id: string;
  date: string;
  durationMinutes: number;
  serviceName: string;
  address: string;
  customerName: string;
  employeeId?: string;
  requiresConfirmation?: boolean;
  confirmedAt?: string;
}

interface PlanningContextValue {
  query: string;
  setQuery: (value: string) => void;
  selectedAssignment: SelectedPlanningAssignment | null;
  setSelectedAssignment: (assignment: SelectedPlanningAssignment | null) => void;
}

const PlanningSearchContext = createContext<PlanningContextValue>({
  query: "",
  setQuery: () => {},
  selectedAssignment: null,
  setSelectedAssignment: () => {},
});

export function PlanningSearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const [selectedAssignment, setSelectedAssignment] =
    useState<SelectedPlanningAssignment | null>(null);
  return (
    <PlanningSearchContext.Provider
      value={{ query, setQuery, selectedAssignment, setSelectedAssignment }}
    >
      {children}
    </PlanningSearchContext.Provider>
  );
}

export function PlanningSearchInput() {
  const { query, setQuery } = useContext(PlanningSearchContext);

  return (
    <div className="relative w-52 2xl:w-60">
      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Cerca dipendente…"
        aria-label="Cerca dipendente"
        className="h-9 rounded-md bg-muted/35 pl-8 text-[13px] shadow-none"
      />
    </div>
  );
}

export function usePlanningSearch() {
  return useContext(PlanningSearchContext);
}
