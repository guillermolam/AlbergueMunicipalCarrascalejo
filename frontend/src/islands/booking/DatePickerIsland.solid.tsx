/**
 * DatePickerIsland — SolidJS calendar date picker
 *
 * Pure controlled component: all state flows in/out via props.
 * No direct nanostore access — the parent coordinates with the booking store.
 *
 * Usage (Astro, requires @astrojs/solid-js integration):
 *   <DatePickerIsland
 *     client:load
 *     initialDate={new Date()}
 *     minDate={new Date()}
 *     onDateSelect={(d) => bookingStore.setKey('checkInDate', d.toISOString())}
 *   />
 *
 * NOTE: To enable this island in production, add @astrojs/solid-js to
 *       astro.config.mjs integrations array.
 */

import { createSignal, For, Show } from 'solid-js';

export interface DatePickerIslandProps {
  readonly class?: string;
  /** Pre-selected date */
  readonly initialDate?: Date;
  readonly minDate?: Date;
  readonly maxDate?: Date;
  readonly onDateSelect?: (date: Date) => void;
}

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

export default function DatePickerIsland(props: DatePickerIslandProps) {
  const [selectedDate, setSelectedDate] = createSignal<Date | null>(
    props.initialDate ?? null
  );
  const [currentMonth, setCurrentMonth] = createSignal(
    props.initialDate ?? new Date()
  );

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    props.onDateSelect?.(date);
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setCurrentMonth((current) => {
      const next = new Date(current);
      next.setMonth(current.getMonth() + (direction === 'next' ? 1 : -1));
      return next;
    });
  };

  /** Returns an array of (Date | null) — nulls fill leading empty day cells */
  const getDaysInMonth = (): Array<Date | null> => {
    const date = currentMonth();
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<Date | null> = Array.from({ length: firstDay }, () => null);
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const isDisabled = (date: Date) =>
    (props.minDate != null && date < props.minDate) ||
    (props.maxDate != null && date > props.maxDate);

  const isSelected = (date: Date) => {
    const sel = selectedDate();
    return date.toDateString() === sel?.toDateString();
  };

  const formatMonthYear = (date: Date) =>
    date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div class={`rounded-lg bg-white p-6 shadow-lg ${props.class ?? ''}`}>
      {/* Month navigation */}
      <div class="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => handleMonthChange('prev')}
          class="rounded-full p-2 transition-colors hover:bg-gray-100"
          aria-label="Mes anterior"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h3 class="text-lg font-semibold text-gray-800 capitalize">
          {formatMonthYear(currentMonth())}
        </h3>

        <button
          type="button"
          onClick={() => handleMonthChange('next')}
          class="rounded-full p-2 transition-colors hover:bg-gray-100"
          aria-label="Mes siguiente"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div class="mb-2 grid grid-cols-7 gap-1">
        <For each={WEEKDAYS}>
          {(day) => (
            <div class="py-2 text-center text-sm font-medium text-gray-500">{day}</div>
          )}
        </For>
      </div>

      {/* Day grid */}
      <div class="grid grid-cols-7 gap-1">
        <For each={getDaysInMonth()}>
          {(date) => {
            if (date === null) {
              return <div aria-hidden="true" class="col-span-1" />;
            }

            const disabled = isDisabled(date);
            const selected = isSelected(date);

            const disabledClass = 'cursor-not-allowed bg-gray-50 text-gray-300 focus:ring-transparent';
            const enabledClass = 'text-gray-700 hover:bg-green-50 hover:text-green-800 focus:bg-green-100 focus:ring-green-500';
            const selectedClass = 'scale-105 transform bg-green-700 text-white shadow-md focus:ring-green-600';

            let buttonClass: string;
            if (selected) {
              buttonClass = selectedClass;
            } else if (disabled) {
              buttonClass = disabledClass;
            } else {
              buttonClass = enabledClass;
            }

            return (
              <button
                type="button"
                onClick={() => !disabled && handleDateSelect(date)}
                disabled={disabled}
                class={[
                  'h-10 w-full rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1',
                  buttonClass,
                ].join(' ')}
                aria-label={`Seleccionar ${date.toLocaleDateString('es-ES')}`}
              >
                {date.getDate()}
              </button>
            );
          }}
        </For>
      </div>

      {/* Selected date summary */}
      <Show when={selectedDate()}>
        {(date) => (
          <div class="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
            <p class="text-sm text-green-800">
              <span class="font-medium">Fecha seleccionada:</span>
              <br />
              {date().toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        )}
      </Show>
    </div>
  );
}
