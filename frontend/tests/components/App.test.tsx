import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "../../src/App";

// Mock wouter router
jest.mock("wouter", () => ({
  Switch: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="switch">{children}</div>
  ),
  Route: ({
    component: Component,
    path,
  }: {
    component: React.ComponentType;
    path: string;
  }) => (
    <div data-testid={`route-${path}`}>
      <Component />
    </div>
  ),
}));

// Mock pages
jest.mock("../../src/pages/home", () => {
  return function Home() {
    return <div data-testid="home-page">Home Page</div>;
  };
});

jest.mock("../../src/pages/admin", () => {
  return function Admin() {
    return <div data-testid="admin-page">Admin Page</div>;
  };
});

jest.mock("../../src/pages/not-found", () => {
  return function NotFound() {
    return <div data-testid="not-found-page">Not Found Page</div>;
  };
});

// Mock UI components
jest.mock("../../src/components/ui/toaster", () => ({
  Toaster: () => <div data-testid="toaster">Toaster</div>,
}));

jest.mock("../../src/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-provider">{children}</div>
  ),
}));

// Mock I18n context
jest.mock("../../src/contexts/i18n-context", () => ({
  I18nProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="i18n-provider">{children}</div>
  ),
  useI18n: () => ({
    t: (key: string) => key,
    language: "en",
    setLanguage: jest.fn(),
  }),
}));

describe("App Component", () => {
  it("should render without crashing", () => {
    const { container } = render(<App />);
    expect(container).toBeInTheDocument();
  });

  it("should contain all required providers", () => {
    render(<App />);
    
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip-provider")).toBeInTheDocument();
    expect(screen.getByTestId("i18n-provider")).toBeInTheDocument();
  });

  it("should render router with correct structure", () => {
    render(<App />);
    expect(screen.getByTestId("switch")).toBeInTheDocument();
  });
});