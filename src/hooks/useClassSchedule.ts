import { trpc } from "@/lib/trpc";

export function useClassSchedule(filters?: { from?: string; to?: string }) {
  const { data, isLoading, error, refetch } = trpc.classes.list.useQuery(
    filters ?? {}
  );

  const bookMutation = trpc.bookings.book.useMutation();

  return {
    classes: data ?? [],
    isLoading,
    error,
    refetch,
    bookClass: bookMutation.mutateAsync,
    isBooking: bookMutation.isPending,
  };
}
