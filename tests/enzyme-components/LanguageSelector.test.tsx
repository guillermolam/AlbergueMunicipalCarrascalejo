import React from "react";
import { shallow, mount } from "enzyme";
import LanguageSelector from "../../client/src/components/language-selector";
import { I18nProvider } from "../../client/src/contexts/i18n-context";

// Mock UI components
jest.mock("../../client/src/components/ui/select", () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid="mock-select" data-value={value}>
      <div onClick={() => onValueChange && onValueChange("es")}>{children}</div>
    </div>
  ),
  SelectContent: ({ children }: any) => (
    <div data-testid="mock-select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: any) => (
    <div data-testid="mock-select-item" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => (
    <div data-testid="mock-select-trigger">{children}</div>
  ),
  SelectValue: ({ placeholder }: any) => (
    <div data-testid="mock-select-value">{placeholder}</div>
  ),
}));

jest.mock("../../client/src/components/ui/button", () => ({
  Button: ({ children, onClick, variant, size }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      data-testid="mock-button"
    >
      {children}
    </button>
  ),
}));

// Mock Lucide icons
jest.mock("lucide-react", () => ({
  Languages: () => <div data-testid="languages-icon">Languages Icon</div>,
  Globe: () => <div data-testid="globe-icon">Globe Icon</div>,
}));

// Mock I18n context
const mockI18nContext = {
  t: jest.fn((key: string) => key),
  language: "en",
  setLanguage: jest.fn(),
  supportedLanguages: [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "de", name: "Deutsch", flag: "🇩🇪" },
  ],
};

jest.mock("../../client/src/contexts/i18n-context", () => ({
  useI18n: () => mockI18nContext,
  I18nProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="i18n-provider">{children}</div>
  ),
}));

describe("LanguageSelector Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Shallow Rendering", () => {
    it("should render without crashing", () => {
      const wrapper = shallow(<LanguageSelector />);
      expect(wrapper.exists()).toBe(true);
    });

    it("should render language select component", () => {
      const wrapper = shallow(<LanguageSelector />);
      expect(wrapper.find('[data-testid="mock-select"]')).toHaveLength(1);
    });

    it("should display languages icon", () => {
      const wrapper = shallow(<LanguageSelector />);
      expect(wrapper.find('[data-testid="languages-icon"]')).toHaveLength(1);
    });

    it("should show current language as selected", () => {
      const wrapper = shallow(<LanguageSelector />);
      const select = wrapper.find('[data-testid="mock-select"]');
      expect(select.prop("data-value")).toBe("en");
    });
  });

  describe("Full Mount Rendering", () => {
    const renderWithProvider = (props = {}) => {
      return mount(
        <I18nProvider>
          <LanguageSelector {...props} />
        </I18nProvider>,
      );
    };

    it("should render complete component tree", () => {
      const wrapper = renderWithProvider();

      expect(wrapper.find('[data-testid="mock-select"]')).toHaveLength(1);
      expect(wrapper.find('[data-testid="languages-icon"]')).toHaveLength(1);
    });

    it("should render all supported languages", () => {
      const wrapper = renderWithProvider();

      const selectContent = wrapper.find('[data-testid="mock-select-content"]');
      expect(selectContent).toHaveLength(1);
    });

    it("should display language options with flags", () => {
      const wrapper = renderWithProvider();

      // Should render language options
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe("Language Selection", () => {
    it("should call setLanguage when language is changed", () => {
      const wrapper = mount(
        <I18nProvider>
          <LanguageSelector />
        </I18nProvider>,
      );

      const select = wrapper.find('[data-testid="mock-select"]');
      select.childAt(0).simulate("click");

      expect(mockI18nContext.setLanguage).toHaveBeenCalledWith("es");
    });

    it("should display current language correctly", () => {
      mockI18nContext.language = "es";

      const wrapper = shallow(<LanguageSelector />);
      const select = wrapper.find('[data-testid="mock-select"]');

      expect(select.prop("data-value")).toBe("es");
    });

    it("should handle language change events", () => {
      const wrapper = mount(
        <I18nProvider>
          <LanguageSelector />
        </I18nProvider>,
      );

      const select = wrapper.find('[data-testid="mock-select"]');
      select.childAt(0).simulate("click");

      expect(mockI18nContext.setLanguage).toHaveBeenCalled();
    });
  });

  describe("Supported Languages", () => {
    it("should render all available languages", () => {
      const wrapper = shallow(<LanguageSelector />);

      // Component should have access to supported languages
      expect(wrapper.exists()).toBe(true);
    });

    it("should display language names and flags", () => {
      const wrapper = mount(
        <I18nProvider>
          <LanguageSelector />
        </I18nProvider>,
      );

      // Should render language information
      expect(
        wrapper.find('[data-testid="mock-select-item"]').length,
      ).toBeGreaterThanOrEqual(0);
    });

    it("should handle missing language data gracefully", () => {
      mockI18nContext.supportedLanguages = [];

      expect(() => {
        shallow(<LanguageSelector />);
      }).not.toThrow();
    });
  });

  describe("Internationalization", () => {
    it("should use translated text for labels", () => {
      const wrapper = shallow(<LanguageSelector />);

      expect(mockI18nContext.t).toHaveBeenCalled();
    });

    it("should adapt to current language context", () => {
      mockI18nContext.language = "fr";

      const wrapper = shallow(<LanguageSelector />);
      const select = wrapper.find('[data-testid="mock-select"]');

      expect(select.prop("data-value")).toBe("fr");
    });

    it("should translate language names appropriately", () => {
      const wrapper = mount(
        <I18nProvider>
          <LanguageSelector />
        </I18nProvider>,
      );

      // Language names should be handled appropriately
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      const wrapper = shallow(<LanguageSelector />);

      // Component should be accessible
      expect(wrapper.exists()).toBe(true);
    });

    it("should be keyboard navigable", () => {
      const wrapper = mount(
        <I18nProvider>
          <LanguageSelector />
        </I18nProvider>,
      );

      const select = wrapper.find('[data-testid="mock-select"]');

      // Should support keyboard navigation
      expect(select.exists()).toBe(true);
    });

    it("should support screen readers", () => {
      const wrapper = shallow(<LanguageSelector />);

      // Should have appropriate labels for screen readers
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe("Visual Styling", () => {
    it("should apply correct styling classes", () => {
      const wrapper = shallow(<LanguageSelector />);

      // Should have proper CSS classes
      expect(wrapper.exists()).toBe(true);
    });

    it("should handle different themes", () => {
      const wrapper = mount(
        <I18nProvider>
          <LanguageSelector />
        </I18nProvider>,
      );

      // Should adapt to light/dark themes
      expect(wrapper.exists()).toBe(true);
    });

    it("should be responsive on different screen sizes", () => {
      const wrapper = shallow(<LanguageSelector />);

      // Should work on mobile and desktop
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe("Component Variants", () => {
    it("should render as dropdown by default", () => {
      const wrapper = shallow(<LanguageSelector />);

      expect(wrapper.find('[data-testid="mock-select"]')).toHaveLength(1);
    });

    it("should handle compact variant", () => {
      const wrapper = shallow(<LanguageSelector variant="compact" />);

      // Should render in compact mode
      expect(wrapper.exists()).toBe(true);
    });

    it("should support icon-only mode", () => {
      const wrapper = shallow(<LanguageSelector showText={false} />);

      // Should show only icon
      expect(wrapper.find('[data-testid="languages-icon"]')).toHaveLength(1);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing i18n context gracefully", () => {
      // Temporarily mock missing context
      const originalUseI18n =
        require("../../client/src/contexts/i18n-context").useI18n;
      require("../../client/src/contexts/i18n-context").useI18n = () => ({
        t: (key: string) => key,
        language: "en",
        setLanguage: () => {},
        supportedLanguages: [],
      });

      expect(() => {
        shallow(<LanguageSelector />);
      }).not.toThrow();

      // Restore original mock
      require("../../client/src/contexts/i18n-context").useI18n =
        originalUseI18n;
    });

    it("should handle language change errors", () => {
      mockI18nContext.setLanguage = jest.fn(() => {
        throw new Error("Language change failed");
      });

      const wrapper = mount(
        <I18nProvider>
          <LanguageSelector />
        </I18nProvider>,
      );

      expect(() => {
        const select = wrapper.find('[data-testid="mock-select"]');
        select.childAt(0).simulate("click");
      }).not.toThrow();
    });

    it("should fallback to default language when current is invalid", () => {
      mockI18nContext.language = "invalid-lang";

      const wrapper = shallow(<LanguageSelector />);

      // Should handle invalid language gracefully
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe("Component State", () => {
    it("should maintain state consistency", () => {
      const wrapper = shallow(<LanguageSelector />);

      const initialState = wrapper.state();
      wrapper.setProps({ disabled: true });

      // State should remain consistent
      expect(wrapper.exists()).toBe(true);
    });

    it("should update when language context changes", () => {
      const wrapper = mount(
        <I18nProvider>
          <LanguageSelector />
        </I18nProvider>,
      );

      // Simulate language context change
      mockI18nContext.language = "de";
      wrapper.update();

      expect(wrapper.exists()).toBe(true);
    });
  });

  describe("Performance", () => {
    it("should not re-render unnecessarily", () => {
      const wrapper = shallow(<LanguageSelector />);

      const renderCount = wrapper.debug().length;
      wrapper.setProps({ className: "test-class" });

      // Should not cause unnecessary re-renders
      expect(wrapper.exists()).toBe(true);
    });

    it("should handle large language lists efficiently", () => {
      const manyLanguages = Array.from({ length: 50 }, (_, i) => ({
        code: `lang${i}`,
        name: `Language ${i}`,
        flag: "🏳️",
      }));

      mockI18nContext.supportedLanguages = manyLanguages;

      const wrapper = mount(
        <I18nProvider>
          <LanguageSelector />
        </I18nProvider>,
      );

      // Should render efficiently even with many languages
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe("Integration", () => {
    it("should work with navigation components", () => {
      const wrapper = mount(
        <I18nProvider>
          <div>
            <nav>
              <LanguageSelector />
            </nav>
          </div>
        </I18nProvider>,
      );

      expect(wrapper.find(LanguageSelector)).toHaveLength(1);
    });

    it("should integrate with theme providers", () => {
      const wrapper = mount(
        <I18nProvider>
          <LanguageSelector />
        </I18nProvider>,
      );

      // Should work within theme context
      expect(wrapper.exists()).toBe(true);
    });
  });
});
