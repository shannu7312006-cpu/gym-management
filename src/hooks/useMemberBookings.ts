import { trpc } from "@/lib/trpc";

export function useMemberBookings(includePast = false) {
  const { data, isLoading, error, refetch } = trpc.bookings.mine.useQuery({
    includePast,
  });

  const cancelMutation = trpc.bookings.cancel.useMutation();

  return {
    bookings: data ?? [],
    isLoading,
    error,
    refetch,
    cancelBooking: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
  };
}
