import { DateLib } from '@daypicker/react';
import { getDateLib, enUS } from '@daypicker/persian';
import type { CalendarSystem } from '@/lib/api/endpoints/userPreferences';

const gregorian = new DateLib();
const persian = getDateLib({ locale: enUS });

export function calendarLib(calendar: CalendarSystem) {
  return calendar === 'persian' ? persian : gregorian;
}
