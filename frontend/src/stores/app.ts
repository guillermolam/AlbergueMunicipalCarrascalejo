import { atom, computed } from 'nanostores'
import { persistentAtom } from '@nanostores/persistent'

export const dailyGoalKm = persistentAtom<number>('camino:dailyGoalKm', 25, {
  encode: String,
  decode: (v) => Number(v),
})

export const currentStageProgress = persistentAtom<number>('camino:stageProgress', 68, {
  encode: String,
  decode: (v) => Number(v),
})

export const isBusy = atom(false)
export const lastError = atom<string | null>(null)

export const remainingDays = computed([dailyGoalKm], (goal) => {
  const remainingDistance = 720
  return Math.ceil(remainingDistance / goal)
})

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

export async function setDailyGoal(delta: number) {
  dailyGoalKm.set(clamp(dailyGoalKm.get() + delta, 15, 35))
}

export async function setStageProgress(delta: number) {
  currentStageProgress.set(clamp(currentStageProgress.get() + delta, 0, 100))
}

export async function syncProgressToServer() {
  isBusy.set(true)
  lastError.set(null)
  try {
    const payload = {
      dailyGoalKm: dailyGoalKm.get(),
      currentStageProgress: currentStageProgress.get(),
      ts: Date.now(),
    }
    const res = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  } catch (e) {
    lastError.set(e instanceof Error ? e.message : 'Unknown error')
  } finally {
    isBusy.set(false)
  }
}
