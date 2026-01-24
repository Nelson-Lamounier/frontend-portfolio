/**
 * File-based Article Loading
 * 
 * This module loads articles from MDX files in the filesystem.
 * It serves as the fallback data source during migration to DynamoDB.
 * 
 * After migration is complete, this file can be removed and
 * article-service.ts will handle all article fetching.
 */

import glob from 'fast-glob'

// Re-export types from the canonical source for backwards compatibility
export type { ArticleWithSlug } from './types/article.types'

interface Article {
  title: string
  description: string
  author: string
  date: string
}

interface ArticleWithSlugInternal extends Article {
  slug: string
}

async function importArticle(
  articleFilename: string,
): Promise<ArticleWithSlugInternal> {
  const { article } = (await import(`../app/articles/${articleFilename}`)) as {
    default: React.ComponentType
    article: Article
  }

  return {
    slug: articleFilename.replace(/(\/page)?\.mdx$/, ''),
    ...article,
  }
}

/**
 * Gets all articles from the filesystem (MDX files)
 * 
 * This is the file-based fallback for the article service.
 * During migration, both DynamoDB and file-based articles may be used.
 * 
 * @returns Array of articles sorted by date (newest first)
 */
export async function getAllArticles(): Promise<ArticleWithSlugInternal[]> {
  const articleFilenames = await glob('*/page.mdx', {
    cwd: './src/app/articles',
  })

  const articles = await Promise.all(articleFilenames.map(importArticle))

  return articles.sort((a, z) => +new Date(z.date) - +new Date(a.date))
}
