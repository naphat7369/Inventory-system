'use client';

import { useEffect } from 'react';

/**
 * ExtensionCleaner
 * Continuously detects and purges unwanted third-party browser extension overlays,
 * specifically ad-skipper badges like "Ad-skipping activated", floating skip buttons,
 * and extension modals across all pages and print previews.
 */
export function ExtensionCleaner() {
  useEffect(() => {
    const purgeExtensions = () => {
      if (typeof document === 'undefined') return;

      const checkAndRemove = (el: Element) => {
        try {
          // Never touch internal app structures or memo documents
          if (
            el.closest?.('.memo-document-container') ||
            el.closest?.('.memo-page-sheet') ||
            el.closest?.('.memo-document') ||
            el.closest?.('aside') ||
            el.closest?.('nav') ||
            el.closest?.('table') ||
            el.classList?.contains('memo-page-sheet') ||
            el.classList?.contains('memo-document')
          ) {
            return;
          }

          const tagName = (el.tagName || '').toLowerCase();
          if (
            tagName === 'html' ||
            tagName === 'head' ||
            tagName === 'body' ||
            tagName === 'main'
          ) {
            return;
          }

          // Text content inspection
          const text = (el.textContent || '').toLowerCase().trim();
          const hasAdSkipText =
            text === 'ad-skipping' ||
            text === 'ad skipping' ||
            text === 'ad-skipper' ||
            text === 'adskipper' ||
            text === 'adskip' ||
            text === 'ad-skipping activated' ||
            text === 'ad skipping activated';

          // ID and class inspection
          const id = (el.id || '').toLowerCase();
          const className = (typeof el.className === 'string' ? el.className : '').toLowerCase();
          const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
          const title = (el.getAttribute('title') || '').toLowerCase();

          const hasAdSkipAttr =
            id.includes('ad-skip') ||
            id.includes('adskip') ||
            id.includes('ad_skip') ||
            className.includes('ad-skip') ||
            className.includes('adskip') ||
            className.includes('ad_skip') ||
            ariaLabel === 'ad-skip' ||
            ariaLabel === 'ad skip' ||
            ariaLabel === 'adskip' ||
            ariaLabel === 'skip ad' ||
            title === 'ad-skip' ||
            title === 'ad skip';

          // Check shadow root if present
          let hasShadowMatch = false;
          if (el.shadowRoot) {
            const shadowText = (el.shadowRoot.textContent || '').toLowerCase();
            if (
              shadowText === 'ad-skipping' ||
              shadowText === 'ad skipping' ||
              shadowText === 'ad-skip' ||
              shadowText === 'adskip' ||
              shadowText === 'ad-skipping activated'
            ) {
              hasShadowMatch = true;
            }
          }

          if (hasAdSkipText || hasAdSkipAttr || hasShadowMatch) {
            // Apply defensive hiding instead of el.remove() to prevent React NotFoundError
            const htmlEl = el as HTMLElement;
            if (htmlEl.style) {
              htmlEl.style.setProperty('display', 'none', 'important');
              htmlEl.style.setProperty('visibility', 'hidden', 'important');
              htmlEl.style.setProperty('opacity', '0', 'important');
              htmlEl.style.setProperty('pointer-events', 'none', 'important');
              htmlEl.style.setProperty('position', 'absolute', 'important');
              htmlEl.style.setProperty('width', '0', 'important');
              htmlEl.style.setProperty('height', '0', 'important');
              htmlEl.style.setProperty('z-index', '-9999', 'important');
            }
            return;
          }
        } catch {
          // Ignore errors
        }
      };

      try {
        // Scan all elements in body and direct children of documentElement
        document.querySelectorAll('body *').forEach(checkAndRemove);
        document.documentElement.childNodes.forEach((node) => {
          if (node instanceof Element && node.tagName.toLowerCase() !== 'body' && node.tagName.toLowerCase() !== 'head') {
            checkAndRemove(node);
          }
        });
      } catch {
        // Ignore errors
      }
    };

    // Initial purge
    purgeExtensions();

    // Set up MutationObserver to catch dynamically injected extension elements
    let observer: MutationObserver | null = null;
    try {
      observer = new MutationObserver((mutations) => {
        let shouldPurge = false;
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            shouldPurge = true;
            break;
          }
        }
        if (shouldPurge) {
          purgeExtensions();
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    } catch {
      // MutationObserver fallback
    }

    // Periodic check for late-loading extension scripts
    const intervalId = setInterval(purgeExtensions, 1000);

    // Also run immediately before printing
    const handleBeforePrint = () => {
      purgeExtensions();
    };

    window.addEventListener('beforeprint', handleBeforePrint);

    return () => {
      if (observer) observer.disconnect();
      clearInterval(intervalId);
      window.removeEventListener('beforeprint', handleBeforePrint);
    };
  }, []);

  return null;
}
