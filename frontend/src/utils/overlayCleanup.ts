// Utility to cleanup any leftover global overlay/fullscreen side-effects
// Safe to call repeatedly. Only removes state if no fullscreen container is present.
export function cleanupGlobalOverlays(): void {
  if (typeof document === 'undefined' || !document.body) return;

  try {
    const hasFullscreenEditor = document.querySelector('[data-fullscreen-editor="true"]');
    const body = document.body;

    // If no fullscreen editor container present but body still has classes, remove them
    if (!hasFullscreenEditor) {
      if (body.classList.contains('fullscreen-editor-active')) {
        body.classList.remove('fullscreen-editor-active');
      }
      if (body.classList.contains('fullscreen-doc-active')) {
        body.classList.remove('fullscreen-doc-active');
      }
      // Reset inline overflow if we are not in any fullscreen mode
      if (!body.classList.contains('fullscreen-editor-active') && !body.classList.contains('fullscreen-doc-active')) {
        body.style.overflow = '';
      }

      // Restore any elements hidden by fullscreen editor logic
      const hidden = document.querySelectorAll('[data-hidden-by-fullscreen="true"]');
      hidden.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.display = '';
          el.removeAttribute('data-hidden-by-fullscreen');
        }
      });
    }
  } catch (e) {
    // Swallow errors to avoid interfering with app flow
    // eslint-disable-next-line no-console
    console.warn('[overlayCleanup] cleanup skipped due to error:', e);
  }
}
