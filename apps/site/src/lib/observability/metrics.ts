/** @format */

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { metricsConfig, isFeatureEnabled } from './metrics-config';

// Create a custom registry
export const register = new Registry();

// Set default labels
register.setDefaultLabels(metricsConfig.defaultLabels);

// Collect default Node.js metrics (memory, CPU, event loop, etc.)
if (isFeatureEnabled('collectDefaultMetrics')) {
  collectDefaultMetrics({
    register,
    prefix: metricsConfig.prefix,
    gcDurationBuckets: metricsConfig.buckets.gcDurationBuckets,
  });
}

// ============================================
// Application Health Metrics
// ============================================

export const appUp = new Gauge({
  name: 'nextjs_up',
  help: 'Application is up and running (1 = up, 0 = down)',
  registers: [register],
});
appUp.set(1);

export const appInfo = new Gauge({
  name: 'nextjs_app_info',
  help: 'Application information',
  labelNames: ['version', 'environment', 'node_version'],
  registers: [register],
});
appInfo.set(
  {
    version: process.env.npm_package_version || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    node_version: process.version,
  },
  1
);



// ============================================
// API Metrics
// ============================================

export const apiCalls = new Counter({
  name: 'nextjs_api_calls_total',
  help: 'Total number of API calls',
  labelNames: ['endpoint', 'method', 'status'],
  registers: [register],
});

export const apiErrors = new Counter({
  name: 'nextjs_api_errors_total',
  help: 'Total number of API errors',
  labelNames: ['endpoint', 'method', 'error_type'],
  registers: [register],
});

// ============================================
// Performance Metrics
// ============================================

export const httpRequestDuration = new Histogram({
  name: 'nextjs_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: metricsConfig.buckets.httpDuration,
  registers: [register],
});

export const httpRequestSize = new Histogram({
  name: 'nextjs_http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: metricsConfig.buckets.size,
  registers: [register],
});

export const httpResponseSize = new Histogram({
  name: 'nextjs_http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route', 'status'],
  buckets: metricsConfig.buckets.size,
  registers: [register],
});



// ============================================
// Error Tracking
// ============================================

export const clientErrors = new Counter({
  name: 'nextjs_client_errors_total',
  help: 'Total number of client-side errors',
  labelNames: ['error_type', 'page'],
  registers: [register],
});

export const serverErrors = new Counter({
  name: 'nextjs_server_errors_total',
  help: 'Total number of server-side errors',
  labelNames: ['error_type', 'route'],
  registers: [register],
});

// ============================================
// Cache Metrics
// ============================================

export const cacheHits = new Counter({
  name: 'nextjs_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
  registers: [register],
});

export const cacheMisses = new Counter({
  name: 'nextjs_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
  registers: [register],
});

// ============================================
// External Dependencies
// ============================================

export const externalApiCalls = new Counter({
  name: 'nextjs_external_api_calls_total',
  help: 'Total number of external API calls',
  labelNames: ['service', 'status'],
  registers: [register],
});

export const externalApiDuration = new Histogram({
  name: 'nextjs_external_api_duration_seconds',
  help: 'Duration of external API calls in seconds',
  labelNames: ['service'],
  buckets: metricsConfig.buckets.externalApiDuration,
  registers: [register],
});

// ============================================
// Helper Functions
// ============================================

/**
 * Track API call
 */
export function trackApiCall(
  endpoint: string,
  method: string,
  status: number
) {
  apiCalls.inc({
    endpoint,
    method,
    status: status.toString(),
  });

  if (status >= 400) {
    apiErrors.inc({
      endpoint,
      method,
      error_type: status >= 500 ? 'server_error' : 'client_error',
    });
  }
}

/**
 * Track HTTP request duration
 */
export function trackRequestDuration(
  method: string,
  route: string,
  status: number,
  durationSeconds: number
) {
  httpRequestDuration.observe(
    {
      method,
      route,
      status: status.toString(),
    },
    durationSeconds
  );
}

/**
 * Track error
 */
export function trackError(
  errorType: string,
  location: string,
  isClient: boolean = false
) {
  if (isClient) {
    clientErrors.inc({
      error_type: errorType,
      page: location,
    });
  } else {
    serverErrors.inc({
      error_type: errorType,
      route: location,
    });
  }
}

/**
 * Track cache operation
 */
export function trackCache(cacheType: string, hit: boolean) {
  if (hit) {
    cacheHits.inc({ cache_type: cacheType });
  } else {
    cacheMisses.inc({ cache_type: cacheType });
  }
}

/**
 * Track external API call
 */
export function trackExternalApi(
  service: string,
  status: number,
  durationSeconds: number
) {
  externalApiCalls.inc({
    service,
    status: status.toString(),
  });

  externalApiDuration.observe({ service }, durationSeconds);
}

// ============================================
// DynamoDB & Article Service Metrics
// ============================================

/**
 * DynamoDB SDK query/get duration in seconds.
 * Labels: operation (Query, GetItem), index (primary, gsi1, gsi2)
 */
export const dynamoDBDuration = new Histogram({
  name: 'nextjs_dynamodb_query_duration_seconds',
  help: 'DynamoDB SDK call duration in seconds',
  labelNames: ['operation', 'index'],
  buckets: metricsConfig.buckets.dbQueryDuration,
  registers: [register],
});

/**
 * DynamoDB SDK errors.
 * Labels: operation, error_type
 */
export const dynamoDBErrors = new Counter({
  name: 'nextjs_dynamodb_errors_total',
  help: 'DynamoDB SDK call errors',
  labelNames: ['operation', 'error_type'],
  registers: [register],
});

/**
 * Article service requests.
 * Labels: operation, source (dynamodb-sdk, file-based, file-based-fallback), status (success, error)
 */
export const articleServiceRequests = new Counter({
  name: 'nextjs_article_service_requests_total',
  help: 'Total article service requests by operation and data source',
  labelNames: ['operation', 'source', 'status'],
  registers: [register],
});

/**
 * Article service latency in seconds.
 * Labels: operation, source
 */
export const articleServiceDuration = new Histogram({
  name: 'nextjs_article_service_duration_seconds',
  help: 'Article service latency by operation and data source',
  labelNames: ['operation', 'source'],
  buckets: metricsConfig.buckets.dbQueryDuration,
  registers: [register],
});

/**
 * Current data source gauge (1 = active).
 * Labels: source (dynamodb-sdk, file-based, none)
 */
export const articleDataSource = new Gauge({
  name: 'nextjs_article_data_source',
  help: 'Currently active data source (1 = active)',
  labelNames: ['source'],
  registers: [register],
});

/**
 * In-memory TTL cache hit/miss counts for the DynamoDB data layer.
 * Labels: cache_key_prefix (published-articles, metadata, tag)
 */
export const dynamoDBCacheHits = new Counter({
  name: 'nextjs_dynamodb_cache_hits_total',
  help: 'DynamoDB TTL cache hits',
  labelNames: ['cache_key_prefix'],
  registers: [register],
});

export const dynamoDBCacheMisses = new Counter({
  name: 'nextjs_dynamodb_cache_misses_total',
  help: 'DynamoDB TTL cache misses',
  labelNames: ['cache_key_prefix'],
  registers: [register],
});

// ============================================
// DynamoDB & Article Service Helpers
// ============================================

/**
 * Track a DynamoDB SDK call
 */
export function trackDynamoDB(
  operation: string,
  index: string,
  durationSeconds: number,
  error?: string
) {
  dynamoDBDuration.observe({ operation, index }, durationSeconds);
  if (error) {
    dynamoDBErrors.inc({ operation, error_type: error });
  }
}

/**
 * Track an article service request
 */
export function trackArticleRequest(
  operation: string,
  source: string,
  status: 'success' | 'error',
  durationSeconds: number
) {
  articleServiceRequests.inc({ operation, source, status });
  articleServiceDuration.observe({ operation, source }, durationSeconds);
}

/**
 * Track DynamoDB TTL cache hit/miss
 */
export function trackDynamoDBCache(cacheKeyPrefix: string, hit: boolean) {
  if (hit) {
    dynamoDBCacheHits.inc({ cache_key_prefix: cacheKeyPrefix });
  } else {
    dynamoDBCacheMisses.inc({ cache_key_prefix: cacheKeyPrefix });
  }
}

