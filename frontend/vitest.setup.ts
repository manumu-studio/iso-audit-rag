// Global test setup: extends Vitest matchers with DOM-specific assertions.
import "@testing-library/jest-dom/vitest";

// jsdom does not implement scrollIntoView
Element.prototype.scrollIntoView = () => {};
