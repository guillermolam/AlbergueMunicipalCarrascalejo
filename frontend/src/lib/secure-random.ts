/**
 * Secure random number generation utilities
 * Replaces Math.random with crypto.getRandomValues for security-sensitive contexts
 */

/**
 * Generate a cryptographically secure random number between 0 and 1
 * @returns Random number between 0 and 1
 */
export function secureRandom(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / (0xffffffff + 1);
}

/**
 * Generate a cryptographically secure random integer between min and max
 * @param min Minimum value (inclusive)
 * @param max Maximum value (exclusive)
 * @returns Random integer
 */
export function secureRandomInt(min: number, max: number): number {
  const range = max - min;
  const randomValue = secureRandom();
  return Math.floor(min + randomValue * range);
}

/**
 * Generate a cryptographically secure random boolean with given probability
 * @param probability Probability of returning true (0-1)
 * @returns Random boolean
 */
export function secureRandomBool(probability: number = 0.5): boolean {
  if (probability < 0 || probability > 1) {
    throw new RangeError('Probability must be between 0 and 1');
  }
  return secureRandom() < probability;
}

/**
 * Pick a random element from an array using secure random
 * @param array Array to pick from
 * @returns Random element or undefined if array is empty
 */
export function secureRandomPick<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined;
  const index = secureRandomInt(0, array.length);
  return array[index];
}
