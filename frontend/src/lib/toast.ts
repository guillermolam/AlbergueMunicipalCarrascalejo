import { toast as sonnerToast } from 'sonner'

/**
 * Enhanced toast utilities with animations.dev principles
 * Using Sonner for better animations and UX
 */

export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
      duration: 3000,
      style: {
        '--ease': 'var(--ease-glide)',
      } as React.CSSProperties,
    })
  },

  error: (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
      duration: 4000,
      style: {
        '--ease': 'var(--ease-swift)',
      } as React.CSSProperties,
    })
  },

  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
      duration: 3000,
      style: {
        '--ease': 'var(--ease-breeze)',
      } as React.CSSProperties,
    })
  },

  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, {
      description,
      duration: 3500,
      style: {
        '--ease': 'var(--ease-nova)',
      } as React.CSSProperties,
    })
  },

  loading: (message: string) => {
    return sonnerToast.loading(message, {
      style: {
        '--ease': 'var(--ease-silk)',
      } as React.CSSProperties,
    })
  },

  promise: <T>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((err: Error) => string)
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading,
      success,
      error,
      style: {
        '--ease': 'var(--ease-glide)',
      } as React.CSSProperties,
    })
  },

  custom: (component: React.ReactNode, options?: Parameters<typeof sonnerToast>[1]) => {
    return sonnerToast(component, {
      ...options,
      style: {
        '--ease': 'var(--ease-breeze)',
        ...options?.style,
      } as React.CSSProperties,
    })
  },

  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId)
  },
}

// Re-export Sonner's toast for direct access if needed
export { toast as sonner } from 'sonner'
