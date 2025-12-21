export interface NotificationPreferences {
  email: boolean
  sms: boolean
  push: boolean
  whatsapp: boolean
}

export interface NotificationRequest {
  pilgrimId: string
  type: 'booking_confirmation' | 'booking_reminder' | 'booking_cancellation' | 'check_in_reminder' | 'check_out_reminder'
  channel: 'email' | 'sms' | 'push' | 'whatsapp'
  message: string
  data?: Record<string, any>
}

export interface NotificationResponse {
  notificationId: string
  status: 'sent' | 'failed' | 'pending'
  sentAt?: string
  error?: string
}

export async function sendNotification(request: NotificationRequest): Promise<NotificationResponse> {
  const response = await fetch('/api/notifications/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error('Notification sending failed')
  }

  return response.json()
}

export async function getNotificationPreferences(pilgrimId: string): Promise<NotificationPreferences> {
  const response = await fetch(`/api/notifications/preferences/${pilgrimId}`)

  if (!response.ok) {
    throw new Error('Failed to get notification preferences')
  }

  return response.json()
}

export async function updateNotificationPreferences(
  pilgrimId: string, 
  preferences: NotificationPreferences
): Promise<void> {
  const response = await fetch(`/api/notifications/preferences/${pilgrimId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(preferences),
  })

  if (!response.ok) {
    throw new Error('Failed to update notification preferences')
  }
}

export async function getNotificationHistory(pilgrimId: string, limit: number = 10): Promise<NotificationResponse[]> {
  const response = await fetch(`/api/notifications/history/${pilgrimId}?limit=${limit}`)

  if (!response.ok) {
    throw new Error('Failed to get notification history')
  }

  return response.json()
}