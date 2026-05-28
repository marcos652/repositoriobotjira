'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Filters, DateRange, Priority } from '@/types';

interface FilterContextType {
  filters: Filters;
  setDateRange: (range: DateRange) => void;
  setCustomDates: (start: string, end: string) => void;
  toggleProject: (project: string) => void;
  toggleUser: (user: string) => void;
  toggleStatus: (status: string) => void;
  toggleCategory: (category: string) => void;
  togglePriority: (priority: Priority) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

const defaultFilters: Filters = {
  dateRange: '30d',
  projects: [],
  squads: [],
  users: [],
  statuses: [],
  categories: [],
  priorities: [],
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const setDateRange = useCallback((range: DateRange) => {
    setFilters(prev => ({ ...prev, dateRange: range, customStartDate: undefined, customEndDate: undefined }));
  }, []);

  const setCustomDates = useCallback((start: string, end: string) => {
    setFilters(prev => ({ ...prev, dateRange: 'custom' as DateRange, customStartDate: start, customEndDate: end }));
  }, []);

  const toggleArrayFilter = useCallback((key: keyof Filters, value: string) => {
    setFilters(prev => {
      const arr = prev[key] as string[];
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
      };
    });
  }, []);

  const toggleProject = useCallback((p: string) => toggleArrayFilter('projects', p), [toggleArrayFilter]);
  const toggleUser = useCallback((u: string) => toggleArrayFilter('users', u), [toggleArrayFilter]);
  const toggleStatus = useCallback((s: string) => toggleArrayFilter('statuses', s), [toggleArrayFilter]);
  const toggleCategory = useCallback((c: string) => toggleArrayFilter('categories', c), [toggleArrayFilter]);
  const togglePriority = useCallback((p: Priority) => toggleArrayFilter('priorities', p), [toggleArrayFilter]);

  const clearFilters = useCallback(() => setFilters(defaultFilters), []);

  const hasActiveFilters = useMemo(() => {
    return filters.projects.length > 0 || filters.users.length > 0 ||
      filters.statuses.length > 0 || filters.categories.length > 0 ||
      filters.priorities.length > 0 || filters.dateRange !== '30d';
  }, [filters]);

  return (
    <FilterContext.Provider value={{
      filters, setDateRange, setCustomDates, toggleProject,
      toggleUser, toggleStatus, toggleCategory, togglePriority,
      clearFilters, hasActiveFilters,
    }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) throw new Error('useFilters must be used within FilterProvider');
  return context;
}
