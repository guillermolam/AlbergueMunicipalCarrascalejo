export interface InfoOnArrival {
  pilgrimId: string;
  arrivalTime: string;
  eta: string; // Estimated Time of Arrival
  transportation: 'walking' | 'cycling' | 'bus' | 'train' | 'car' | 'other';
  startingPoint?: string;
  routeNotes?: string;
  specialNeeds?: string;
  contactPerson?: string;
  emergencyContact?: string;
  groupSize?: number;
}

export interface ArrivalUpdateRequest {
  pilgrimId: string;
  arrivalTime?: string;
  status: 'on_my_way' | 'delayed' | 'arrived' | 'cancelled';
  notes?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export async function submitArrivalInfo(info: InfoOnArrival): Promise<void> {
  const response = await fetch('/api/arrival/info', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(info),
  });

  if (!response.ok) {
    throw new Error('Failed to submit arrival information');
  }
}

export async function updateArrivalStatus(request: ArrivalUpdateRequest): Promise<void> {
  const response = await fetch('/api/arrival/status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Failed to update arrival status');
  }
}

export async function getArrivalInfo(pilgrimId: string): Promise<InfoOnArrival | null> {
  const response = await fetch(`/api/arrival/info/${pilgrimId}`);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error('Failed to get arrival information');
  }

  return response.json();
}

export async function getETAUpdates(pilgrimId: string): Promise<ArrivalUpdateRequest[]> {
  const response = await fetch(`/api/arrival/updates/${pilgrimId}`);

  if (!response.ok) {
    throw new Error('Failed to get ETA updates');
  }

  return response.json();
}
