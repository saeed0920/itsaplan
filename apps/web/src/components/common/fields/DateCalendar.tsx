'use client';

import type { ComponentProps } from 'react';
import { useLocale } from 'next-intl';
import { getDateLib, enUS, faIR } from '@daypicker/persian';
import { Calendar } from '@/components/ui/calendar';
import { useCalendar } from '@/hooks/useCalendar';
import { useWeekStart } from '@/hooks/useWeekStart';

export function DateCalendar(props: ComponentProps<typeof Calendar>) {
  const locale = useLocale();
  const { calendar } = useCalendar();
  const weekStart = useWeekStart();
  const dateLib =
    calendar === 'persian'
      ? getDateLib({ locale: locale === 'fa' ? faIR : enUS, weekStartsOn: weekStart })
      : undefined;

  return (
    <Calendar
      weekStartsOn={weekStart}
      {...(dateLib && {
        dateLib,
        locale: locale === 'fa' ? faIR : enUS,
        numerals: locale === 'fa' ? 'arabext' : 'latn',
        formatters: {
          formatMonthDropdown: (date: Date) => dateLib.format(date, 'LLLL'),
        },
      })}
      {...props}
    />
  );
}
