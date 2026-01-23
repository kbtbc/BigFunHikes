import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  entriesApi,
  statsApi,
  type JournalEntry,
  type CreateJournalEntryInput,
  type UpdateJournalEntryInput,
} from "@/lib/api";

// Query keys
export const queryKeys = {
  entries: ["entries"] as const,
  entry: (id: string) => ["entries", id] as const,
  stats: ["stats"] as const,
};

// Fetch all entries
export function useEntries(page = 1, pageSize = 50, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...queryKeys.entries, page, pageSize],
    queryFn: () => entriesApi.list(page, pageSize),
    enabled: options?.enabled !== false,
  });
}

// Fetch single entry
export function useEntry(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.entry(id),
    queryFn: () => entriesApi.get(id),
    enabled: (options?.enabled !== false) && !!id,
  });
}

// Fetch stats
export function useStats(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => statsApi.get(),
    enabled: options?.enabled !== false,
  });
}

// Create entry mutation
export function useCreateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateJournalEntryInput) => entriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entries });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}

// Update entry mutation
export function useUpdateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJournalEntryInput }) =>
      entriesApi.update(id, data),
    onSuccess: (updatedEntry) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entries });
      queryClient.setQueryData(queryKeys.entry(updatedEntry.id), updatedEntry);
    },
  });
}

// Delete entry mutation
export function useDeleteEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => entriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entries });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}
