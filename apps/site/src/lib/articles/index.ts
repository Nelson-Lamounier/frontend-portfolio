/**
 * Articles domain barrel — re-exports all article-related modules.
 *
 * Consumers should import from '@/lib/articles' to avoid coupling
 * to internal file structure.
 */

export {
  getAllArticles,
  getArticlesWithPagination,
  getArticleBySlug,
  getArticleMetadata,
  getArticleContent,
  getValidatedMetadata,
  getArticlesByTag,
  getArticlesByCategory,
  searchArticles,
  getAllTags,
  getAllCategories,
  getArticleSlugs,
  prefetchArticle,
  calculateReadingTime,
  getDataSource,
  ArticleServiceError,
} from './article-service'

export { generateArticleJsonLd, generateArticleMetadata } from './article-structured-data'

// RDS-backed data layer (reads via the in-cluster public-api BFF).
export {
  isArticlesApiConfigured,
  queryPublishedArticles,
  getArticleMetadataBySlug,
  getArticleDetailBySlug,
  queryArticlesByTag,
} from './public-api-articles'
