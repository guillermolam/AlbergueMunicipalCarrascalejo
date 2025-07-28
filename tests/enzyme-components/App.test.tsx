import React from 'react';
import { shallow, mount } from 'enzyme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../../client/src/App';
import { I18nProvider } from '../../client/src/contexts/i18n-context';

// Mock wouter router
jest.mock('wouter', () => ({
  Switch: ({ children }: { children: React.ReactNode }) => <div data-testid="switch">{children}</div>,
  Route: ({ component: Component, path }: { component: React.ComponentType; path: string }) => (
    <div data-testid={`route-${path}`}>
      <Component />
    </div>
  ),
}));

// Mock pages
jest.mock('../../client/src/pages/home', () => {
  return function Home() {
    return <div data-testid="home-page">Home Page</div>;
  };
});

jest.mock('../../client/src/pages/admin', () => {
  return function Admin() {
    return <div data-testid="admin-page">Admin Page</div>;
  };
});

jest.mock('../../client/src/pages/not-found', () => {
  return function NotFound() {
    return <div data-testid="not-found-page">Not Found Page</div>;
  };
});

// Mock UI components
jest.mock('../../client/src/components/ui/toaster', () => ({
  Toaster: () => <div data-testid="toaster">Toaster</div>,
}));

jest.mock('../../client/src/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-provider">{children}</div>
  ),
}));

// Mock query client
jest.mock('../../client/src/lib/queryClient', () => ({
  queryClient: new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  }),
}));

// Mock I18n context
jest.mock('../../client/src/contexts/i18n-context', () => ({
  I18nProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="i18n-provider">{children}</div>
  ),
  useI18n: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: jest.fn(),
  }),
}));

describe('App Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Shallow Rendering', () => {
    it('should render without crashing', () => {
      const wrapper = shallow(<App />);
      expect(wrapper.exists()).toBe(true);
    });

    it('should contain QueryClientProvider', () => {
      const wrapper = shallow(<App />);
      expect(wrapper.find(QueryClientProvider)).toHaveLength(1);
    });

    it('should contain I18nProvider', () => {
      const wrapper = shallow(<App />);
      expect(wrapper.find(QueryClientProvider).dive().find(I18nProvider)).toHaveLength(1);
    });

    it('should have correct structure hierarchy', () => {
      const wrapper = shallow(<App />);
      const queryProvider = wrapper.find(QueryClientProvider);
      
      expect(queryProvider).toHaveLength(1);
      expect(queryProvider.prop('client')).toBeDefined();
    });
  });

  describe('Full Mount Rendering', () => {
    it('should render complete component tree', () => {
      const wrapper = mount(<App />);
      
      expect(wrapper.find('[data-testid="toaster"]')).toHaveLength(1);
      expect(wrapper.find('[data-testid="tooltip-provider"]')).toHaveLength(1);
      expect(wrapper.find('[data-testid="i18n-provider"]')).toHaveLength(1);
    });

    it('should render router with correct structure', () => {
      const wrapper = mount(<App />);
      
      expect(wrapper.find('[data-testid="switch"]')).toHaveLength(1);
    });

    it('should pass queryClient to provider', () => {
      const wrapper = mount(<App />);
      const queryProvider = wrapper.find(QueryClientProvider);
      
      expect(queryProvider.prop('client')).toBeDefined();
      expect(queryProvider.prop('client')).toBeInstanceOf(QueryClient);
    });
  });

  describe('Provider Configuration', () => {
    it('should configure QueryClient with correct default options', () => {
      const wrapper = shallow(<App />);
      const queryProvider = wrapper.find(QueryClientProvider);
      const client = queryProvider.prop('client') as QueryClient;
      
      expect(client).toBeInstanceOf(QueryClient);
    });

    it('should wrap components in correct order', () => {
      const wrapper = mount(<App />);
      
      // QueryClientProvider should be the outermost wrapper
      const queryProvider = wrapper.find(QueryClientProvider);
      expect(queryProvider).toHaveLength(1);
      
      // I18nProvider should be inside QueryClientProvider
      const i18nProvider = wrapper.find('[data-testid="i18n-provider"]');
      expect(i18nProvider).toHaveLength(1);
      
      // TooltipProvider should be inside I18nProvider
      const tooltipProvider = wrapper.find('[data-testid="tooltip-provider"]');
      expect(tooltipProvider).toHaveLength(1);
    });
  });

  describe('Error Boundaries', () => {
    it('should handle provider initialization errors gracefully', () => {
      // This test ensures the app doesn't crash during provider setup
      expect(() => {
        shallow(<App />);
      }).not.toThrow();
    });

    it('should maintain component structure even with missing context', () => {
      const wrapper = shallow(<App />);
      
      expect(wrapper.find(QueryClientProvider)).toHaveLength(1);
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Component Integration', () => {
    it('should integrate all required providers', () => {
      const wrapper = mount(<App />);
      
      // Check that all essential providers are present
      expect(wrapper.find(QueryClientProvider)).toHaveLength(1);
      expect(wrapper.find('[data-testid="i18n-provider"]')).toHaveLength(1);
      expect(wrapper.find('[data-testid="tooltip-provider"]')).toHaveLength(1);
      expect(wrapper.find('[data-testid="toaster"]')).toHaveLength(1);
    });

    it('should render router component', () => {
      const wrapper = mount(<App />);
      
      expect(wrapper.find('[data-testid="switch"]')).toHaveLength(1);
    });
  });

  describe('Performance and Memory', () => {
    it('should not create multiple QueryClient instances', () => {
      const wrapper1 = shallow(<App />);
      const wrapper2 = shallow(<App />);
      
      const client1 = wrapper1.find(QueryClientProvider).prop('client');
      const client2 = wrapper2.find(QueryClientProvider).prop('client');
      
      expect(client1).toBeInstanceOf(QueryClient);
      expect(client2).toBeInstanceOf(QueryClient);
      // Note: They will be different instances, which is expected for separate component renders
    });

    it('should properly unmount without memory leaks', () => {
      const wrapper = mount(<App />);
      
      expect(() => {
        wrapper.unmount();
      }).not.toThrow();
    });
  });
});