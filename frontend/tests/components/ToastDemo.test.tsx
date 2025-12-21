import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

vi.mock('@/lib/toast', () => {
  return {
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      promise: vi.fn(),
    },
  }
})

import { ToastDemo } from '@/components/ToastDemo'
import { toast } from '@/lib/toast'

describe('ToastDemo', () => {
  it('renders all toast buttons', () => {
    render(<ToastDemo />)

    expect(screen.getByText(/Success Toast/i)).toBeInTheDocument()
    expect(screen.getByText(/Error Toast/i)).toBeInTheDocument()
    expect(screen.getByText(/Info Toast/i)).toBeInTheDocument()
    expect(screen.getByText(/Warning Toast/i)).toBeInTheDocument()
    expect(screen.getByText(/Promise Toast/i)).toBeInTheDocument()
  })

  it('calls toast helpers on click', async () => {
    const user = userEvent.setup()
    render(<ToastDemo />)

    await user.click(screen.getByText(/Success Toast/i))
    expect(toast.success).toHaveBeenCalledWith(
      'Success!',
      'Your action was completed successfully.'
    )

    await user.click(screen.getByText(/Error Toast/i))
    expect(toast.error).toHaveBeenCalledWith(
      'Error!',
      'Something went wrong. Please try again.'
    )

    await user.click(screen.getByText(/Info Toast/i))
    expect(toast.info).toHaveBeenCalledWith('Info', 'Here is some useful information.')

    await user.click(screen.getByText(/Warning Toast/i))
    expect(toast.warning).toHaveBeenCalledWith(
      'Warning!',
      'Please be careful with this action.'
    )

    await user.click(screen.getByText(/Promise Toast/i))
    expect(toast.promise).toHaveBeenCalled()
    const [promiseArg, opts] = (toast.promise as any).mock.calls[0]
    expect(typeof promiseArg?.then).toBe('function')
    expect(opts).toMatchObject({
      loading: 'Loading...',
      success: 'Completed!',
      error: 'Failed!',
    })
  })
})

