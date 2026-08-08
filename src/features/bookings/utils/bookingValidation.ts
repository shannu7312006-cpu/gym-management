import { TRPCError } from '@trpc/server';
import { hoursUntil } from '@/lib/date';

export function assertClassBookable(
  cls: { id: number; cancelled: boolean; startsAt: string } | null | undefined
) {
  if (!cls) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Class not found.' });
  }
  if (cls.cancelled) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'This class has been cancelled.',
    });
  }
  if (hoursUntil(cls.startsAt) <= 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'This class has already started.',
    });
  }
}
