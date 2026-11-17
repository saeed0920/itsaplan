'use client';

import type { ComponentProps } from 'react';
import { useLocale } from 'next-intl';
import { getDateLib, enUS, faIR } from '@daypicker/persian';
import { DateLib } from '@daypicker/react';
import { useDateFnsLocale } from '@/hooks/useDateFnsLocale';
import { Calendar } from '@/components/ui/calendar';
import { useCalendar } from '@/hooks/useCalendar';
import { useWeekStart } from '@/hooks/useWeekStart';

export function DateCalendar(props: ComponentProps<typeof Calendar>) {
  const locale = useLocale();
  const { calendar } = useCalendar();
  const weekStart = useWeekStart();
  const gregorianLocale = useDateFnsLocale();
  const dateLib =
    calendar === 'persian'
      ? getDateLib({
          locale: locale === 'fa' ? faIR : enUS,
          weekStartsOn: weekStart,
        })
      : new DateLib({ locale: gregorianLocale, weekStartsOn: weekStart });

  return (
    <Calendar
      fixedWeeks
      weekStartsOn={weekStart}
      {...(dateLib && {
        dateLib,
        locale: calendar === 'persian' ? (locale === 'fa' ? faIR : enUS) : gregorianLocale,
        numerals: locale === 'fa' ? 'arabext' : 'latn',
        formatters: {
          formatMonthDropdown: (date: Date) => dateLib.format(date, 'LLLL'),
        },
      })}
      {...props}
    />
  );
}
