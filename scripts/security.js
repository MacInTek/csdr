/**
 * Security Utilities
 * Provides input sanitization, XSS prevention, and security helpers
 */

export class SecurityUtils {
  /**
   * Sanitize HTML to prevent XSS attacks
   * @param {string} html - HTML string to sanitize
   * @returns {string} - Sanitized HTML
   */
  static sanitizeHTML(html) {
    if (typeof html !== 'string') return '';
    
    const temp = document.createElement('div');
    temp.textContent = html;
    return temp.innerHTML;
  }
  
  /**
   * Sanitize user input (remove dangerous characters)
   * @param {string} input - User input to sanitize
   * @returns {string} - Sanitized input
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/data:text\/html/gi, '') // Remove data URIs
      .trim();
  }
  
  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} - True if valid email
   */
  static validateEmail(email) {
    if (typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {object} - Validation result with strength and message
   */
  static validatePassword(password) {
    if (typeof password !== 'string') {
      return { valid: false, strength: 'weak', message: 'Password must be a string' };
    }
    
    if (password.length < 8) {
      return { valid: false, strength: 'weak', message: 'Password must be at least 8 characters' };
    }
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const strengthScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
    
    if (strengthScore < 2) {
      return { valid: false, strength: 'weak', message: 'Password is too weak' };
    }
    
    if (strengthScore === 2) {
      return { valid: true, strength: 'medium', message: 'Password strength: Medium' };
    }
    
    if (strengthScore === 3) {
      return { valid: true, strength: 'strong', message: 'Password strength: Strong' };
    }
    
    return { valid: true, strength: 'very-strong', message: 'Password strength: Very Strong' };
  }
  
  /**
   * Escape special characters for use in HTML attributes
   * @param {string} str - String to escape
   * @returns {string} - Escaped string
   */
  static escapeHTML(str) {
    if (typeof str !== 'string') return '';
    
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    
    return str.replace(/[&<>"'/]/g, (char) => escapeMap[char]);
  }
  
  /**
   * Check if URL is safe (same origin or trusted)
   * @param {string} url - URL to check
   * @returns {boolean} - True if URL is safe
   */
  static isSafeURL(url) {
    if (typeof url !== 'string') return false;
    
    try {
      const urlObj = new URL(url, window.location.origin);
      
      // Same origin is always safe
      if (urlObj.origin === window.location.origin) {
        return true;
      }
      
      // List of trusted domains
      const trustedDomains = [
        'firebaseapp.com',
        'googleapis.com',
        'gstatic.com',
        'google.com'
      ];
      
      // Check if domain is trusted
      return trustedDomains.some(domain => urlObj.hostname.endsWith(domain));
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Generate CSRF token
   * @returns {string} - CSRF token
   */
  static generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Validate CSRF token
   * @param {string} token - Token to validate
   * @param {string} storedToken - Stored token to compare
   * @returns {boolean} - True if tokens match
   */
  static validateCSRFToken(token, storedToken) {
    if (typeof token !== 'string' || typeof storedToken !== 'string') {
      return false;
    }
    
    // Use constant-time comparison to prevent timing attacks
    if (token.length !== storedToken.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < token.length; i++) {
      result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
    }
    
    return result === 0;
  }
  
  /**
   * Rate limiting helper (using localStorage)
   * @param {string} key - Key for rate limiting
   * @param {number} maxAttempts - Maximum attempts allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {boolean} - True if rate limit exceeded
   */
  static checkRateLimit(key, maxAttempts = 5, windowMs = 60000) {
    const now = Date.now();
    const rateLimitKey = `rate_limit_${key}`;
    const attempts = JSON.parse(localStorage.getItem(rateLimitKey) || '[]');
    
    // Remove old attempts outside the time window
    const recentAttempts = attempts.filter(time => now - time < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      return true; // Rate limit exceeded
    }
    
    // Add current attempt
    recentAttempts.push(now);
    localStorage.setItem(rateLimitKey, JSON.stringify(recentAttempts));
    
    return false; // Not rate limited
  }
  
  /**
   * Clear rate limit data
   * @param {string} key - Key to clear
   */
  static clearRateLimit(key) {
    localStorage.removeItem(`rate_limit_${key}`);
  }
  
  /**
   * Secure localStorage wrapper
   */
  static secureStorage = {
    /**
     * Set item with encryption (basic encoding)
     * @param {string} key - Storage key
     * @param {any} value - Value to store
     */
    setItem(key, value) {
      try {
        const encoded = btoa(JSON.stringify(value));
        localStorage.setItem(key, encoded);
      } catch (e) {
        console.error('Error storing secure data:', e);
      }
    },
    
    /**
     * Get item with decryption
     * @param {string} key - Storage key
     * @returns {any} - Decoded value or null
     */
    getItem(key) {
      try {
        const encoded = localStorage.getItem(key);
        if (!encoded) return null;
        return JSON.parse(atob(encoded));
      } catch (e) {
        console.error('Error reading secure data:', e);
        return null;
      }
    },
    
    /**
     * Remove item
     * @param {string} key - Storage key
     */
    removeItem(key) {
      localStorage.removeItem(key);
    }
  };
}

// Export for use in other modules
export default SecurityUtils;

