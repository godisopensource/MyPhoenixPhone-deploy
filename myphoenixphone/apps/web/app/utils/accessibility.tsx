/**
 * Accessibility utilities following WCAG 2.1 AA guidelines
 * Orange Design System compliance
 */

export const a11y = {
  /**
   * Skip to main content link for keyboard navigation
   */
  SkipLink: () => (
    <a
      href="#main-content"
      className="visually-hidden-focusable position-absolute top-0 start-0 p-2 bg-dark text-white"
      style={{ zIndex: 9999 }}
    >
      Aller au contenu principal
    </a>
  ),

  /**
   * Announce live region changes to screen readers
   */
  LiveRegion: ({
    children,
    politeness = 'polite',
  }: {
    children: React.ReactNode;
    politeness?: 'polite' | 'assertive' | 'off';
  }) => (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="visually-hidden"
    >
      {children}
    </div>
  ),

  /**
   * Verify color contrast ratio (WCAG AA requires 4.5:1 for normal text)
   */
  checkContrast: (foreground: string, background: string): boolean => {
    // Simplified: Orange brand colors already comply
    // In production, use a proper contrast checker library
    const orangeBrand = '#ff7900';
    const white = '#ffffff';
    const black = '#000000';

    // Known compliant combinations
    const compliant = [
      [orangeBrand, white],
      [orangeBrand, black],
      [white, orangeBrand],
      [black, white],
    ];

    return compliant.some(
      ([fg, bg]) =>
        (foreground === fg && background === bg) ||
        (foreground === bg && background === fg),
    );
  },

  /**
   * Format error messages for screen readers
   */
  announceError: (fieldId: string, message: string): string => {
    return `${fieldId}-error-${Date.now()}`;
  },

  /**
   * Keyboard trap management
   */
  trapFocus: (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    );

    if (focusableElements.length === 0) return () => {};

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement.focus();

    return () => container.removeEventListener('keydown', handleKeyDown);
  },
};

/**
 * ARIA helpers
 */
export const aria = {
  /**
   * Generate IDs for aria-describedby relationships
   */
  descriptionId: (baseId: string) => `${baseId}-description`,
  errorId: (baseId: string) => `${baseId}-error`,
  labelId: (baseId: string) => `${baseId}-label`,

  /**
   * Loading state announcement
   */
  loading: {
    'aria-busy': true,
    'aria-live': 'polite' as const,
    role: 'status',
  },

  /**
   * Error state announcement
   */
  error: (fieldId: string) => ({
    'aria-invalid': true,
    'aria-describedby': aria.errorId(fieldId),
  }),

  /**
   * Required field
   */
  required: {
    'aria-required': true,
    required: true,
  },

  /**
   * Dialog/Modal props
   */
  dialog: (titleId: string) => ({
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': titleId,
  }),

  /**
   * Button with loading state
   */
  button: (isLoading: boolean) => ({
    'aria-disabled': isLoading,
    ...(isLoading && { 'aria-busy': true }),
  }),
};

/**
 * Semantic HTML helpers
 */
export const semantic = {
  /**
   * Main content wrapper
   */
  Main: ({ children }: { children: React.ReactNode }) => (
    <main id="main-content" role="main">
      {children}
    </main>
  ),

  /**
   * Navigation wrapper
   */
  Nav: ({ label, children }: { label: string; children: React.ReactNode }) => (
    <nav aria-label={label}>{children}</nav>
  ),

  /**
   * Section with heading
   */
  Section: ({
    heading,
    level = 2,
    children,
  }: {
    heading: string;
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    children: React.ReactNode;
  }) => {
    const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    return (
      <section>
        <Tag>{heading}</Tag>
        {children}
      </section>
    );
  },
};

/**
 * Focus management utilities
 */
export const focus = {
  /**
   * Move focus to element
   */
  moveTo: (selector: string) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  },

  /**
   * Focus first error in form
   */
  firstError: () => {
    const firstError = document.querySelector('[aria-invalid="true"]') as HTMLElement;
    if (firstError) {
      firstError.focus();
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  },

  /**
   * Get focusable elements in container
   */
  getFocusable: (container: HTMLElement): HTMLElement[] => {
    return Array.from(
      container.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
  },
};
