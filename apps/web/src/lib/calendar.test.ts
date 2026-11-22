import assert from 'node:assert/strict';
import { afterEach, it } from 'node:test';
import { calendarLib } from './calendar';
import { visibleDays } from '@/features/work-items/utils/calendar';
import { buildDayTrack } from '@/utils/timelineTrack';
import {
  formatDate,
  parseDate,
  setDisplayCalendar,
  setDisplayLocale,
  setDisplayTimezone,
  toDateStr,
} from '@/utils/dates';

afterEach(() => {
  setDisplayCalendar();
  setDisplayLocale('en');
  setDisplayTimezone('');
});

it('uses Persian month arithmetic at Nowruz and leap-year Esfand without changing ISO dates', () => {
  const lib = calendarLib('persian');
  const nowruz = parseDate('2025-03-21')!;
  assert.equal(lib.format(nowruz, 'yyyy-MM-dd'), '1404-01-01');
  assert.equal(toDateStr(lib.startOfMonth(nowruz)), '2025-03-21');
  assert.equal(toDateStr(lib.addMonths(nowruz, 1)), '2025-04-21');
  assert.equal(toDateStr(lib.addMonths(nowruz, -1)), '2025-02-19');
  assert.equal(lib.format(parseDate('2025-03-20')!, 'yyyy-MM-dd'), '1403-12-30');
  assert.equal(lib.format(parseDate('2026-03-20')!, 'yyyy-MM-dd'), '1404-12-29');
  assert.equal(toDateStr(lib.addDays(parseDate('2026-03-20')!, 1)), '2026-03-21');
});

it('builds a Saturday-first Persian month grid, not a Gregorian month with Persian labels', () => {
  const cursor = parseDate('2025-03-21')!;
  const layout = {
    calendarMode: 'month' as const,
    calendarDays: 7,
    calendarWeeks: 4,
    weekStart: 6 as const,
  };
  setDisplayCalendar('persian');
  const days = visibleDays(cursor, layout);
  assert.equal(days[0].getDay(), 6);
  assert.equal(days.length, 42);
  assert.equal(toDateStr(days[0]), '2025-03-15');
  const inMonth = days.filter((day) => calendarLib('persian').isSameMonth(day, cursor));
  assert.equal(inMonth.length, 31);
  assert.equal(toDateStr(inMonth[0]), '2025-03-21');
  assert.equal(toDateStr(inMonth.at(-1)!), '2025-04-20');
  setDisplayCalendar('gregory');
  const gregorian = visibleDays(cursor, { ...layout, weekStart: 1 });
  assert.equal(gregorian[0].getDay(), 1);
  assert.equal(toDateStr(calendarLib('gregory').startOfMonth(cursor)), '2025-03-01');
});

it('formats Persian independently of language and keeps date-only values out of timezone conversion', () => {
  setDisplayLocale('en');
  setDisplayCalendar('persian');
  setDisplayTimezone('Pacific/Honolulu');
  const expected = new Date(2025, 2, 21).toLocaleDateString('en', {
    calendar: 'persian',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  assert.equal(formatDate('2025-03-21'), expected);
  assert.equal(toDateStr(parseDate('2025-03-21')!), '2025-03-21');
  setDisplayLocale('fa');
  setDisplayCalendar('gregory');
  assert.equal(
    formatDate('2025-03-21'),
    new Date(2025, 2, 21).toLocaleDateString('fa', {
      calendar: 'gregory',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
  );
});

it('splits timeline month bands at Persian month boundaries', () => {
  setDisplayCalendar('persian');
  const track = buildDayTrack({
    min: parseDate('2025-03-20'),
    max: parseDate('2025-03-22'),
    viewportW: 0,
    labelW: 0,
    dayW: 10,
  });
  assert.equal(track.months.length, 2);
  const nowruz = track.days.findIndex((day) => toDateStr(day) === '2025-03-21');
  assert.ok(nowruz > 0);
  assert.equal(track.months[0].width, nowruz * 10);
  assert.equal(track.months[1].left, nowruz * 10);
  assert.match(track.months[0].label, /Esfand/);
  assert.match(track.months[1].label, /Farvardin/);
});
