/** @format */

/**
 * Unit tests for /api/metrics route handler.
 *
 * Tests the Prometheus metrics endpoint including:
 * - Returns valid Prometheus text format
 * - No auth required when SSM path is unset
 * - Error handling (returns fallback metrics)
 * - Cache headers
 *
 * SSM, prom-client, and next/server are fully mocked.
 */

// ========================================
// Mocks — must be declared before imports
// ========================================

const mockMetrics = jest.fn();
const mockContentType = 'text/plain; version=0.0.4; charset=utf-8';

jest.mock('@/lib/observability/metrics', () => ({
  register: {
    metrics: (...args: unknown[]) => mockMetrics(...args),
    contentType: mockContentType,
  },
}));

// Mock next/server with simple response objects (jsdom has no Response/Request)
jest.mock('next/server', () => {
  // Minimal NextResponse mock that captures body, status, and headers
  class MockNextResponse {
    body: string;
    status: number;
    headers: Map<string, string>;

    constructor(body: string, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body;
      this.status = init?.status ?? 200;
      this.headers = new Map(Object.entries(init?.headers ?? {}));
    }

    async text() {
      return this.body;
    }

    static json(data: unknown, init?: { status?: number }) {
      const resp = new MockNextResponse(JSON.stringify(data), init);
      resp.headers.set('Content-Type', 'application/json');
      return resp;
    }
  }

  return { NextResponse: MockNextResponse };
});

// ========================================
// Environment setup
// ========================================

const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  process.env = { ...originalEnv };
  // Default: no SSM auth (METRICS_TOKEN_SSM_PATH is empty)
  delete process.env.METRICS_TOKEN_SSM_PATH;
});

afterAll(() => {
  process.env = originalEnv;
});

// ========================================
// Helpers
// ========================================

/** Create a minimal request-like object for the GET handler */
function createRequest(headers: Record<string, string> = {}) {
  return {
    headers: {
      get(name: string) {
        return headers[name.toLowerCase()] ?? null;
      },
    },
  } as unknown as Request;
}

// ========================================
// Tests
// ========================================

describe('/api/metrics', () => {
  describe('without auth (METRICS_TOKEN_SSM_PATH unset)', () => {
    it('returns Prometheus metrics with 200', async () => {
      const sampleMetrics = [
        '# HELP nextjs_up Application is up',
        '# TYPE nextjs_up gauge',
        'nextjs_up 1',
      ].join('\n');

      mockMetrics.mockResolvedValue(sampleMetrics);

      const { GET } = require('@/app/api/metrics/route');
      const response = await GET(createRequest());

      expect(response.status).toBe(200);

      const body = await response.text();
      expect(body).toContain('nextjs_up 1');
      expect(body).toContain('# HELP');
      expect(body).toContain('# TYPE');
    });

    it('sets correct Content-Type header', async () => {
      mockMetrics.mockResolvedValue('nextjs_up 1');

      const { GET } = require('@/app/api/metrics/route');
      const response = await GET(createRequest());

      expect(response.headers.get('Content-Type')).toBe(mockContentType);
    });

    it('sets Cache-Control to no-store', async () => {
      mockMetrics.mockResolvedValue('nextjs_up 1');

      const { GET } = require('@/app/api/metrics/route');
      const response = await GET(createRequest());

      expect(response.headers.get('Cache-Control')).toContain('no-store');
    });

    it('does not require Authorization header when SSM path is empty', async () => {
      mockMetrics.mockResolvedValue('nextjs_up 1');

      const { GET } = require('@/app/api/metrics/route');
      const response = await GET(createRequest()); // no auth header

      expect(response.status).toBe(200);
    });
  });

  describe('error handling', () => {
    it('returns 500 with fallback metrics when register.metrics() throws', async () => {
      mockMetrics.mockRejectedValue(new Error('Metric collection failed'));

      const { GET } = require('@/app/api/metrics/route');
      const response = await GET(createRequest());

      expect(response.status).toBe(500);

      const body = await response.text();
      expect(body).toContain('nextjs_up 0');
      expect(body).toContain('Error generating metrics');
    });
  });

  describe('response format', () => {
    it('returns non-empty Prometheus-formatted body', async () => {
      mockMetrics.mockResolvedValue(
        '# HELP nextjs_up App status\n# TYPE nextjs_up gauge\nnextjs_up 1\n',
      );

      const { GET } = require('@/app/api/metrics/route');
      const response = await GET(createRequest());

      const body = await response.text();
      expect(body.length).toBeGreaterThan(0);
      expect(body).toMatch(/^#/); // Prometheus format starts with #
    });

    it('includes DynamoDB metrics when present', async () => {
      const metricsWithDynamo = [
        '# HELP nextjs_dynamodb_query_duration_seconds DynamoDB call duration',
        '# TYPE nextjs_dynamodb_query_duration_seconds histogram',
        'nextjs_dynamodb_cache_hits_total{cache_key_prefix="published-articles"} 42',
      ].join('\n');

      mockMetrics.mockResolvedValue(metricsWithDynamo);

      const { GET } = require('@/app/api/metrics/route');
      const response = await GET(createRequest());
      const body = await response.text();

      expect(body).toContain('nextjs_dynamodb_query_duration_seconds');
      expect(body).toContain('nextjs_dynamodb_cache_hits_total');
    });

    it('includes article service metrics when present', async () => {
      const metricsWithArticles = [
        '# HELP nextjs_article_service_requests_total Total requests',
        '# TYPE nextjs_article_service_requests_total counter',
        'nextjs_article_service_requests_total{operation="getAllArticles"} 10',
      ].join('\n');

      mockMetrics.mockResolvedValue(metricsWithArticles);

      const { GET } = require('@/app/api/metrics/route');
      const response = await GET(createRequest());
      const body = await response.text();

      expect(body).toContain('nextjs_article_service_requests_total');
    });
  });

  describe('module exports', () => {
    it('exports dynamic = force-dynamic', () => {
      const mod = require('@/app/api/metrics/route');
      expect(mod.dynamic).toBe('force-dynamic');
    });

    it('exports revalidate = 0', () => {
      const mod = require('@/app/api/metrics/route');
      expect(mod.revalidate).toBe(0);
    });
  });
});
