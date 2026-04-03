/**
 * Observability domain barrel — re-exports analytics, metrics,
 * Faro instrumentation, and request tracking modules.
 */

export {
  trackEvent,
  trackArticleView,
  trackProjectView,
  trackFormSubmission,
  trackOutboundLink,
  trackResumeDownload,
  trackSocialClick,
  trackCtaClick,
} from './analytics'

export { initialiseFaro } from './faro'

export {
  trackArticleRequest,
  trackDynamoDBCache,
  trackDynamoDB,
  httpRequestSize,
  httpResponseSize,
} from './metrics'

export { metricsConfig, isFeatureEnabled } from './metrics-config'

export { trackRequestSize, estimateBodySize } from './request-tracker'
