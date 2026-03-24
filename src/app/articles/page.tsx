import { type Metadata } from 'next'

import { Card } from '@/components/ui'
import { SimpleLayout } from '@/components/layout'
import { formatDate } from '@/lib/formatDate'

// Use hybrid article service with fallback to file-based articles
import { getAllArticles, getDataSource } from '@/lib/article-service'
import type { ArticleWithSlug } from '@/lib/types/article.types'

// ISR: revalidate every hour so runtime env vars (DYNAMODB_TABLE_NAME)
// are picked up after the Docker build, which has no DynamoDB access.
export const revalidate = 3600

function Article({ article }: { article: ArticleWithSlug }) {
  return (
    <article className="md:grid md:grid-cols-4 md:items-baseline">
      <Card className="md:col-span-3">
        <Card.Title href={`/articles/${article.slug}`}>
          {article.title}
        </Card.Title>
        <Card.Eyebrow
          as="time"
          dateTime={article.date}
          className="md:hidden"
          decorate
        >
          {formatDate(article.date)}
        </Card.Eyebrow>
        <Card.Description>{article.description}</Card.Description>
        <Card.Cta>Read article</Card.Cta>
      </Card>
      <Card.Eyebrow
        as="time"
        dateTime={article.date}
        className="mt-1 max-md:hidden"
      >
        {formatDate(article.date)}
      </Card.Eyebrow>
    </article>
  )
}

export const metadata: Metadata = {
  title: 'Articles | Nelson Lamounier, Cloud & DevOps Engineer',
  description:
    'Practical articles on self-managed Kubernetes, CDK infrastructure-as-code, ArgoCD GitOps, AI-powered operations, and the real problems behind production AWS systems.',
}

export default async function ArticlesIndex() {
  const articles = await getAllArticles()

  // Determine article source for observability
  const source = getDataSource()

  return (
    <SimpleLayout
      title="Writing on Kubernetes, GitOps, AI-powered infrastructure, and the architecture decisions behind production AWS systems."
      intro="Practical guides on self-managed Kubernetes, CDK infrastructure-as-code, ArgoCD deployments, observability, and Bedrock AI tooling. Every article comes from a real problem I had to solve, not a tutorial I followed."
    >
      <div
        className="md:border-l md:border-zinc-100 md:pl-6 md:dark:border-zinc-700/40"
        data-article-source={source}
        data-article-count={articles.length}
      >
        <div className="flex max-w-3xl flex-col space-y-16">
          {articles.length > 0 ? (
            articles.map((article) => (
              <Article key={article.slug} article={article} />
            ))
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No articles published yet. Check back soon — new content is on the way.
            </p>
          )}
        </div>
      </div>
    </SimpleLayout>
  )
}
