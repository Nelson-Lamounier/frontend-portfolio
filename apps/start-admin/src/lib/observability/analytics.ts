/** @format */

/**
 * Google Analytics Event Tracking Utilities
 *
 * Typed helpers for sending custom GA4 events.
 * All functions are safe to call when GA is not loaded
 * (they guard on window.gtag existence).
 *
 * User-behavior metrics (page views, article views, project views,
 * form submissions) live here instead of Prometheus, which focuses
 * on infrastructure and application health metrics.
 */

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type GtagEventParams = Record<string, string | number | boolean>;

/**
 * Send a custom event to Google Analytics
 */
function sendEvent(action: string, params?: GtagEventParams): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', action, params);
}

// ============================================
// Page & Content Events
// ============================================

/**
 * Track an article view
 * Call this when a user navigates to an article page
 */
export function trackArticleView(slug: string, title?: string): void {
  sendEvent('article_view', {
    article_slug: slug,
    article_title: title || slug,
    content_type: 'article',
  });
}

/**
 * Track a project view
 * Call this when a user views a project detail
 */
export function trackProjectView(projectName: string): void {
  sendEvent('project_view', {
    project_name: projectName,
    content_type: 'project',
  });
}

// ============================================
// Form Events
// ============================================

/**
 * Track a form submission
 * Call this when a user submits a form (e.g., contact form)
 */
export function trackFormSubmission(
  formName: string,
  status: 'success' | 'error'
): void {
  sendEvent('form_submission', {
    form_name: formName,
    submission_status: status,
  });
}

// ============================================
// Navigation Events
// ============================================

/**
 * Track an outbound link click
 * Call this when a user clicks an external link
 */
export function trackOutboundLink(url: string): void {
  sendEvent('outbound_link', {
    link_url: url,
    transport_type: 'beacon',
  });
}

// ============================================
// Download Events
// ============================================

/**
 * Track a resume download
 * Call this when a user clicks the resume download link.
 * The resume is served from an S3 bucket, so GA4's automatic
 * file_download enhanced measurement may not fire for cross-origin
 * S3 URLs — this custom event ensures reliable tracking.
 */
export function trackResumeDownload(resumeUrl?: string): void {
  sendEvent('resume_download', {
    content_type: 'resume',
    file_name: 'resume.pdf',
    link_url: resumeUrl || '',
  });
}

// ============================================
// Engagement Events
// ============================================

/**
 * Track a social media link click
 * Call this when a user clicks a social profile link (GitHub, LinkedIn, etc.)
 */
export function trackSocialClick(
  platform: string,
  url: string
): void {
  sendEvent('social_click', {
    social_platform: platform,
    link_url: url,
  });
}

/**
 * Track a CTA button click
 * Call this for primary call-to-action buttons (e.g., "Hire me", "Get in touch")
 */
export function trackCtaClick(
  ctaName: string,
  location: string
): void {
  sendEvent('cta_click', {
    cta_name: ctaName,
    cta_location: location,
  });
}

/**
 * Track a generic custom event
 * Use this for any event not covered by the specific helpers
 */
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
): void {
  sendEvent(action, {
    event_category: category,
    ...(label && { event_label: label }),
    ...(value !== undefined && { value }),
  });
}

