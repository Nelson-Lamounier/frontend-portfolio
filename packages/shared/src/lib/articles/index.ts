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
  isS3Article,
  ArticleServiceError,
} from './article-service'

export { generateArticleJsonLd, generateArticleMetadata } from './article-structured-data'

export {
  isDynamoDBConfigured,
  queryPublishedArticles,
  getArticleMetadataBySlug,
  getArticleDetailBySlug,
  queryArticlesByTag,
  queryDraftArticles,
  publishArticle,
  unpublishArticle,
  deleteArticle,
  updateArticleMetadata,
} from './dynamodb-articles'

export type { UpdatableArticleMetadata } from './dynamodb-articles'

export {
  fetchArticleContent,
  buildContentRef,
  putArticleContent,
  fetchImageSidecar,
  isS3Configured,
} from './s3-content'

export type { ImageSidecar } from './s3-content'
