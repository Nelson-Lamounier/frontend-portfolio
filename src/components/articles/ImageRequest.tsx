/**
 * ImageRequest — Dual-mode image component for Bedrock-generated MDX
 *
 * In development: renders a yellow placeholder showing the AI instruction
 * and screenshot ID so content authors can see what image is expected.
 *
 * In production: renders the real S3-hosted image, falling back gracefully
 * if the screenshot hasn't been captured yet.
 *
 * Usage in MDX:
 *   <ImageRequest id="eks-dashboard-overview" instruction="Screenshot of the EKS dashboard showing running pods" />
 */

interface ImageRequestProps {
  /** Unique screenshot identifier — maps to assets/screenshots/{id}.png in S3 */
  id: string
  /** AI-generated instruction describing the desired screenshot */
  instruction: string
}

export function ImageRequest({ id, instruction }: ImageRequestProps) {
  const bucketName = process.env.NEXT_PUBLIC_ASSETS_BUCKET_NAME
  const region = process.env.AWS_REGION ?? 'eu-west-1'
  const imageUrl = bucketName
    ? `https://${bucketName}.s3.${region}.amazonaws.com/assets/screenshots/${id}.png`
    : ''

  // Development mode — show a styled placeholder with the instruction
  if (process.env.NODE_ENV === 'development' || !bucketName) {
    return (
      <figure className="my-8">
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/60 p-6 dark:border-amber-600 dark:bg-amber-950/20">
          <div className="text-center">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
                />
              </svg>
              Screenshot Needed
            </span>
            <p className="mt-3 max-w-md text-sm font-medium text-amber-800 dark:text-amber-200">
              {instruction}
            </p>
            <code className="mt-2 inline-block rounded bg-amber-100/80 px-2 py-0.5 text-xs text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              ID: {id}
            </code>
          </div>
        </div>
      </figure>
    )
  }

  // Production mode — render the real S3 image with lazy loading
  return (
    <figure className="my-8">
      <div className="overflow-hidden rounded-xl border border-zinc-200 shadow-sm dark:border-zinc-700/50">
        <img
          src={imageUrl}
          alt={instruction}
          loading="lazy"
          className="h-auto w-full"
          onError={(e) => {
            // Hide broken image, show fallback
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            const fallback = target.nextElementSibling as HTMLElement | null
            if (fallback) fallback.style.display = 'flex'
          }}
        />
        {/* Fallback shown if image fails to load */}
        <div
          className="hidden min-h-[120px] items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-800/50"
          style={{ display: 'none' }}
        >
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            Image not yet available
          </p>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {instruction}
      </figcaption>
    </figure>
  )
}
