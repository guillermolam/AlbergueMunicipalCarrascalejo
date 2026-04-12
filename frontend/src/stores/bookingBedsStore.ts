/**
 * Bed assignment store for the /book booking flow.
 *
 * Tracks which beds are assigned per pilgrim per night and the aggregate
 * selection state used to determine whether the user may proceed from Step 4.
 */
import { map } from 'nanostores';

/** A single bed assignment: pilgrim index + night index → bed number (1-based). */
export interface BedAssignment {
  pilgrim: number;
  night: number;
  bedNumber: number;
}

export interface BedsState {
  /**
   * Per-night assignments array. Index = night (0-based).
   * Value = bed number selected for that night, or null if unassigned.
   * When all nights share the same bed this is a single-element array that
   * the UI broadcasts to all nights.
   */
  assignments: (number | null)[];
  /** Combined schedule: personBedSchedules[person][night] = bed | null */
  personBedSchedules: Record<number, (number | null)[]>;
  /** Currently highlighted night tab (0-based). */
  activeNight: number;
  /** Total number of beds in the dorm (static cap). */
  dormCapacity: number;
}

const INITIAL: BedsState = {
  assignments: [],
  personBedSchedules: {},
  activeNight: 0,
  dormCapacity: 24,
};

export const bookingBedsStore = map<BedsState>(INITIAL);

// ── Actions ──────────────────────────────────────────────────────────────────

/** Initialise assignment arrays for the given number of persons and nights. */
export function initBedAssignments(persons: number, nights: number): void {
  const schedules: Record<number, (number | null)[]> = {};
  for (let p = 0; p < persons; p++) {
    schedules[p] = new Array(nights).fill(null) as null[];
  }
  bookingBedsStore.set({
    ...bookingBedsStore.get(),
    assignments: new Array(nights).fill(null) as null[],
    personBedSchedules: schedules,
    activeNight: 0,
  });
}

/** Assign a bed to a pilgrim for a specific night. */
export function assignBed(pilgrim: number, night: number, bedNumber: number): void {
  const { personBedSchedules, assignments } = bookingBedsStore.get();
  const updatedSchedules = { ...personBedSchedules };
  const nights = [...(updatedSchedules[pilgrim] ?? [])];
  nights[night] = bedNumber;
  updatedSchedules[pilgrim] = nights;

  const updatedAssignments = [...assignments];
  updatedAssignments[night] = bedNumber;

  bookingBedsStore.setKey('personBedSchedules', updatedSchedules);
  bookingBedsStore.setKey('assignments', updatedAssignments);
}

/** Clear a bed assignment for a pilgrim on a specific night. */
export function clearBed(pilgrim: number, night: number): void {
  const { personBedSchedules, assignments } = bookingBedsStore.get();
  const updatedSchedules = { ...personBedSchedules };
  const nights = [...(updatedSchedules[pilgrim] ?? [])];
  nights[night] = null;
  updatedSchedules[pilgrim] = nights;

  const updatedAssignments = [...assignments];
  updatedAssignments[night] = null;

  bookingBedsStore.setKey('personBedSchedules', updatedSchedules);
  bookingBedsStore.setKey('assignments', updatedAssignments);
}

/** Returns true if every night for every pilgrim has a bed assigned. */
export function allBedsAssigned(): boolean {
  const { personBedSchedules, assignments } = bookingBedsStore.get();
  if (assignments.length === 0) return false;
  return Object.values(personBedSchedules).every((nights) =>
    nights.every((b) => b !== null)
  );
}

/** Set the active night tab. */
export function setActiveNight(night: number): void {
  bookingBedsStore.setKey('activeNight', night);
}

/** Reset bed state (call when dates/persons change). */
export function resetBeds(): void {
  bookingBedsStore.set({ ...INITIAL });
}
