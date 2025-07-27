import { render, screen } from "@testing-library/react";
import Navigation from "../../src/components/Navigation";

// Mock wouter router for testing
const MockRouter = ({
  children,
  initialEntries = ["/"],
}: {
  children: React.ReactNode;
  initialEntries?: string[];
}) => {
  return <div data-testid="mock-router">{children}</div>;
};

// Mock useLocation hook
jest.mock("wouter", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  useLocation: () => ["/"],
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  Home: () => <div data-testid="home-icon" />,
  Info: () => <div data-testid="info-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  User: () => <div data-testid="user-icon" />,
}));

describe("Navigation", () => {
  it("renders all navigation items", () => {
    render(<Navigation />);

    expect(screen.getByText("Albergue del Carrascalejo")).toBeInTheDocument();
    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.getByText("Información")).toBeInTheDocument();
    expect(screen.getByText("Reservar")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("renders navigation icons", () => {
    render(<Navigation />);

    expect(screen.getByTestId("home-icon")).toBeInTheDocument();
    expect(screen.getByTestId("info-icon")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-icon")).toBeInTheDocument();
    expect(screen.getByTestId("user-icon")).toBeInTheDocument();
  });
});
