import { createSignal, createEffect, onMount } from 'solid-js';
//import { useStore } from '@nanostores/solid';
//import { bookingStore } from '@/stores/bookingStore';

export interface DatePickerIslandProps {
  class?: string;
  minDate?: Date;
  maxDate?: Date;
  onDateSelect?: (date: Date) => void;
}

export default function DatePickerIsland(props: DatePickerIslandProps) {
  const [selectedDate, setSelectedDate] = createSignal<Date | null>(null);
  const [currentMonth, setCurrentMonth] = createSignal(new Date());
  //Use FSR for now, we will later TODO: Implement FSR
  //const $booking = useStore(bookingStore);

  onMount(() => {
    // Initialize with existing booking data if available
    const existingDate = $booking().checkInDate;
    if (existingDate) {
      setSelectedDate(new Date(existingDate));
    }
  });

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    bookingStore.setKey('checkInDate', date.toISOString());
    props.onDateSelect?.(date);
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const current = currentMonth();
    const newMonth = new Date(current);

    if (direction === 'prev') {
      newMonth.setMonth(current.getMonth() - 1);
    } else {
      newMonth.setMonth(current.getMonth() + 1);
    }

    setCurrentMonth(newMonth);
  };

  const getDaysInMonth = () => {
    const date = currentMonth();
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isDateDisabled = (date: Date) => {
    if (props.minDate && date < props.minDate) return true;
    if (props.maxDate && date > props.maxDate) return true;
    return false;
  };

  const isDateSelected = (date: Date) => {
    const selected = selectedDate();
    return selected && date.toDateString() === selected.toDateString();
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div class={`rounded-lg bg-white p-6 shadow-lg ${props.class || ''}`}>
      <div class="mb-4 flex items-center justify-between">
        <button
          onClick={() => handleMonthChange('prev')}
          class="rounded-full p-2 transition-colors hover:bg-gray-100"
          aria-label="Mes anterior"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <h3 class="text-lg font-semibold text-gray-800">{formatMonthYear(currentMonth())}</h3>

        <button
          onClick={() => handleMonthChange('next')}
          class="rounded-full p-2 transition-colors hover:bg-gray-100"
          aria-label="Mes siguiente"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      <div class="mb-2 grid grid-cols-7 gap-1">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
          <div key={day} class="py-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      <div class="grid grid-cols-7 gap-1">
        {getDaysInMonth().map((date, index) => {
          if (!date) {
            return <div key={index} class="h-10" />;
          }

          const isDisabled = isDateDisabled(date);
          const isSelected = isDateSelected(date);

          return (
            <button
              key={date.toISOString()}
              onClick={() => !isDisabled && handleDateSelect(date)}
              disabled={isDisabled}
              class={`h-10 w-full rounded-lg text-sm font-medium transition-all duration-200 ${
                isSelected
                  ? 'scale-105 transform bg-primary-600 text-white shadow-md'
                  : isDisabled
                    ? 'cursor-not-allowed bg-gray-50 text-gray-300'
                    : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600 focus:bg-primary-100'
              } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1`}
              aria-label={`Seleccionar ${date.toLocaleDateString('es-ES')}`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {selectedDate() && (
        <div class="mt-4 rounded-lg border border-primary-200 bg-primary-50 p-3">
          <p class="text-sm text-primary-800">
            <span class="font-medium">Fecha seleccionada:</span>
            <br />
            {selectedDate()?.toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      )}
    </div>
  );
}
