export type ScheduleWindow = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  intervalMinutes: number;
  active: boolean;
};

export type ExistingAppointment = {
  startsAt: Date;
  endsAt: Date;
  status: string;
};

export type ScheduleBlockWindow = {
  startTime: string | null;
  endTime: string | null;
  active: boolean;
};

export type AvailableSlot = {
  startsAt: Date;
  endsAt: Date;
  time: string;
};

type CalculateAvailableSlotsInput = {
  date: string;
  serviceDurationMinutes: number;
  schedules: ScheduleWindow[];
  appointments: ExistingAppointment[];
  scheduleBlocks?: ScheduleBlockWindow[];
  now?: Date;
};

export function calculateAvailableSlots(input: CalculateAvailableSlotsInput) {
  const now = input.now ?? new Date();
  const dateStart = new Date(`${input.date}T00:00:00.000`);
  const dayOfWeek = dateStart.getDay();
  const activeSchedules = input.schedules.filter(
    (schedule) => schedule.active && schedule.dayOfWeek === dayOfWeek
  );

  return activeSchedules.flatMap((schedule) => {
    const slots: AvailableSlot[] = [];
    const interval = schedule.intervalMinutes || input.serviceDurationMinutes;
    let cursor = parseLocalDateTime(input.date, schedule.startTime);
    const end = parseLocalDateTime(input.date, schedule.endTime);

    while (cursor.getTime() + input.serviceDurationMinutes * 60000 <= end.getTime()) {
      const startsAt = new Date(cursor);
      const endsAt = new Date(cursor.getTime() + input.serviceDurationMinutes * 60000);
      const blocked = input.appointments.some((appointment) => {
        if (appointment.status === "CANCELLED") return false;
        return startsAt < appointment.endsAt && endsAt > appointment.startsAt;
      }) || (input.scheduleBlocks ?? []).some((block) => isBlockedByScheduleBlock(input.date, startsAt, endsAt, block));

      if (!blocked && startsAt > now) {
        slots.push({ startsAt, endsAt, time: toTime(startsAt) });
      }

      cursor = new Date(cursor.getTime() + interval * 60000);
    }

    return slots;
  });
}

export function parseLocalDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

function isBlockedByScheduleBlock(date: string, startsAt: Date, endsAt: Date, block: ScheduleBlockWindow) {
  if (!block.active) return false;
  if (!block.startTime || !block.endTime) return true;

  const blockStartsAt = parseLocalDateTime(date, block.startTime);
  const blockEndsAt = parseLocalDateTime(date, block.endTime);
  return startsAt < blockEndsAt && endsAt > blockStartsAt;
}

function toTime(date: Date) {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}
