import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BookingPage from '../../src/pages/BookingPage';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

describe('BookingPage', () => {
  it('displays room cards when loaded', async () => {
    const queryClient = createTestQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <BookingPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Dormitorio A')).toBeInTheDocument();
      expect(screen.getByText('Dormitorio B')).toBeInTheDocument();
      expect(screen.getByText('Habitación Privada 1')).toBeInTheDocument();
      expect(screen.getByText('Habitación Privada 2')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    const queryClient = createTestQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <BookingPage />
      </QueryClientProvider>
    );

    expect(screen.getByText('Cargando habitaciones...')).toBeInTheDocument();
  });
});