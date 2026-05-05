/**
 * Service Worker Update Handler
 * Handles registration, update detection, and auto-reload on new versions
 * This script works with component-based pages and regular HTML pages
 */

class ServiceWorkerUpdateHandler {
  constructor() {
    this.registration = null;
    this.hasUpdate = false;
  }

  /**
   * Initialize the service worker
   */
  async init() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[SW Update] Service Workers not supported');
      return false;
    }

    try {
      // Register the service worker
      this.registration = await navigator.serviceWorker.register('sw.js', {
        scope: '/'
      });

      console.log('[SW Update] Service worker registered successfully');

      // Listen for updates
      this.setupUpdateListeners();

      // Check for updates on page load
      this.checkForUpdates();

      return true;
    } catch (error) {
      console.error('[SW Update] Registration failed:', error);
      return false;
    }
  }

  /**
   * Set up listeners for service worker updates
   */
  setupUpdateListeners() {
    // Listen for updatefound event
    this.registration.addEventListener('updatefound', () => {
      console.log('[SW Update] New service worker version found');
      const newWorker = this.registration.installing;

      newWorker.addEventListener('statechange', () => {
        this.handleStateChange(newWorker);
      });
    });

    // Listen for messages from active service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        console.log(`[SW Update] Service worker notified of update: v${event.data.version}`);
        this.hasUpdate = true;
        this.reloadPage();
      }
    });
  }

  /**
   * Handle service worker state changes
   */
  handleStateChange(newWorker) {
    const state = newWorker.state;
    console.log(`[SW Update] New worker state: ${state}`);

    if (state === 'installed' && navigator.serviceWorker.controller) {
      // New SW is installed and there's an old controller
      console.log('[SW Update] New version installed. Reloading application...');
      this.hasUpdate = true;
      this.reloadPage();
    }
  }

  /**
   * Check for updates periodically
   */
  checkForUpdates() {
    if (!this.registration) {
      console.warn('[SW Update] No registration available');
      return;
    }

    // Check immediately
    this.registration
      .update()
      .catch((error) => console.error('[SW Update] Error checking for updates:', error));

    // Check every 5 minutes
    setInterval(() => {
      console.log('[SW Update] Checking for updates...');
      this.registration
        .update()
        .catch((error) => console.error('[SW Update] Error checking for updates:', error));
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Reload the page to get the new worker
   */
  reloadPage() {
    if (this.hasUpdate) {
      console.log('[SW Update] Reloading page to activate new version...');
      // Add a small delay to ensure all connections are closed
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  }

  /**
   * Manual update check (can be called from user actions)
   */
  async checkNow() {
    console.log('[SW Update] User requested update check');
    if (this.registration) {
      try {
        await this.registration.update();
        if (this.hasUpdate) {
          console.log('[SW Update] Update available, reloading...');
          this.reloadPage();
        } else {
          console.log('[SW Update] Already up to date');
        }
      } catch (error) {
        console.error('[SW Update] Error checking for updates:', error);
      }
    }
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const swHandler = new ServiceWorkerUpdateHandler();
    swHandler.init();
    // Expose globally for manual checks if needed
    window.swUpdateHandler = swHandler;
  });
} else {
  // DOM already loaded
  const swHandler = new ServiceWorkerUpdateHandler();
  swHandler.init();
  window.swUpdateHandler = swHandler;
}
