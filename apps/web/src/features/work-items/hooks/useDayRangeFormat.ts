import { isSameDay } from 'date-fns';
import { useCalendar } from '@/hooks/useCalendar';
import { useFormatter, useTranslations } from 'next-intl';

// The month on both ends and two-digit days keep the label's width from one week
// to the next. The year goes on both ends only when the range crosses it.
export function useDayRangeFormat() {
  const t = useTranslations('workItems.calendar');
  const format = useFormatter();
  const { calendar, dateLib } = useCalendar();
  return (from: Date, to: Date, { year }: { year: boolean }) => {
    const day = (date: Date, withYear: boolean) =>
      format.dateTime(date, {
        month: 'short',
        day: '2-digit',
        year: withYear ? 'numeric' : undefined,
        calendar,
      });
    if (isSameDay(from, to)) return day(to, year);
    const crossesYear = dateLib.getYear(from) !== dateLib.getYear(to);
    return t('range', { from: day(from, year && crossesYear), to: day(to, year) });
  };
}
