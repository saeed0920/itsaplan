import { useAccountPreferences } from '@/services/preferences.service';
import { calendarLib } from '@/lib/calendar';

export function useCalendar() {
  const { calendar } = useAccountPreferences();
  return { calendar, dateLib: calendarLib(calendar) };
}
