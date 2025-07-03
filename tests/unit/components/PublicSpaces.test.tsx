/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PublicSpaces from '@/pages/PublicSpaces';

// Mock the hooks and components
jest.mock('@/hooks/usePublicSpacesLogic', () => ({
  usePublicSpacesLogic: () => ({
    filters: {
      category: '',
      priceRange: [0, 200],
      amenities: [],
      workEnvironment: '',
      location: '',
      coordinates: null,
      capacity: [1, 20],
      rating: 0,
      verified: false,
      superhost: false,
      instantBook: false
    },
    spaces: [],
    isLoading: false,
    error: null,
    mapCenter: { lat: 41.9028, lng: 12.4964 },
    highlightedId: null,
    handleCardClick: jest.fn(),
    handleMarkerClick: jest.fn(),
    handleFiltersChange: jest.fn()
  })
}));

jest.mock('@/hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleError: jest.fn()
  })
}));

const createWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('PublicSpaces', () => {
  it('renders without crashing', () => {
    render(<PublicSpaces />, { wrapper: createWrapper });
    expect(document.body).toBeInTheDocument();
  });

  it('displays the component when no error', () => {
    render(<PublicSpaces />, { wrapper: createWrapper });
    // Since the component is complex and uses many sub-components,
    // we just test that it renders without throwing
    expect(document.querySelector('.min-h-screen')).toBeInTheDocument();
  });

  it('matches snapshot', () => {
    const { container } = render(<PublicSpaces />, { wrapper: createWrapper });
    expect(container.firstChild).toMatchSnapshot();
  });
});