/**
 * Admin Query Key Factory
 *
 * Structured query keys for TanStack Query cache management.
 * Follows the recommended factory pattern for hierarchical invalidation:
 * - Invalidating `adminKeys.articles.all` clears all article-related queries.
 * - Invalidating `adminKeys.all` clears the entire admin cache.
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
 */

/**
 * Centralised query key factory for the admin dashboard.
 *
 * Usage:
 * ```typescript
 * // In a useQuery hook
 * useQuery({ queryKey: adminKeys.articles.list('all'), queryFn: ... })
 *
 * // Cache invalidation after a mutation
 * queryClient.invalidateQueries({ queryKey: adminKeys.articles.all })
 * ```
 */
export const adminKeys = {
  /** Root key — invalidate this to clear the entire admin cache */
  all: ['admin'] as const,

  /** Article-related query keys */
  articles: {
    /** All article queries (list + content) */
    all: ['admin', 'articles'] as const,
    /** Article listing by status filter */
    list: (status: string) => ['admin', 'articles', 'list', status] as const,
    /** Individual article content for the editor */
    content: (slug: string) => ['admin', 'articles', 'content', slug] as const,
  },

  /** Comment-related query keys */
  comments: {
    /** All comment queries */
    all: ['admin', 'comments'] as const,
    /** Comment listing (pending moderation queue) */
    list: () => ['admin', 'comments', 'list'] as const,
  },

  /** Resume-related query keys */
  resumes: {
    /** All resume queries */
    all: ['admin', 'resumes'] as const,
    /** Resume listing */
    list: () => ['admin', 'resumes', 'list'] as const,
    /** Individual resume detail */
    detail: (id: string) => ['admin', 'resumes', id] as const,
  },

  /** Pipeline-related query keys (Bedrock multi-agent pipeline) */
  pipeline: {
    /** All pipeline queries */
    all: ['admin', 'pipeline'] as const,
    /** Individual pipeline status by slug */
    status: (slug: string) => ['admin', 'pipeline', 'status', slug] as const,
  },
} as const
