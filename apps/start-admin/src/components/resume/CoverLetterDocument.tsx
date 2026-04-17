import type { ResumeProfile } from '@/lib/resumes/resume-data'
import { toHref } from '@/lib/resumes/resume-dom-builder'

interface CoverLetterDocumentProps {
  content: string
  profile?: ResumeProfile
  targetCompany?: string
  targetRole?: string
}

const CLOSING_RE = /^(sincerely|best regards|warm regards|kind regards|yours truly|yours faithfully|respectfully|with regards|regards)/i

interface ParsedLetter {
  date: string
  recipientBlock: string[]
  salutation: string
  body: string[]
  closing: string
  signature: string
}

function parseCoverLetter(raw: string, targetCompany?: string): ParsedLetter {
  const paragraphs = raw
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  const now = new Date()
  const date = now.toLocaleDateString('en-IE', { year: 'numeric', month: 'long', day: 'numeric' })

  let salutation = ''
  let closing = ''
  let signature = ''
  const bodyParagraphs: string[] = []

  let salutationIdx = -1
  let closingIdx = -1

  for (let i = 0; i < paragraphs.length; i++) {
    if (!salutation && paragraphs[i].match(/^dear\b/i)) {
      salutation = paragraphs[i]
      salutationIdx = i
    }
    if (paragraphs[i].split('\n')[0].match(CLOSING_RE)) {
      closingIdx = i
      const parts = paragraphs[i].split('\n')
      closing = parts[0]
      signature = parts.slice(1).join('\n').trim()
    }
  }

  for (let i = salutationIdx + 1; i < paragraphs.length; i++) {
    if (i === closingIdx) break
    bodyParagraphs.push(paragraphs[i])
  }

  // Fallback: no salutation found — treat everything as body
  if (salutationIdx === -1) {
    for (let i = 0; i < paragraphs.length; i++) {
      if (i === closingIdx) break
      bodyParagraphs.push(paragraphs[i])
    }
  }

  const recipientBlock = targetCompany ? ['Hiring Manager', targetCompany] : ['Hiring Manager']

  return { date, recipientBlock, salutation, body: bodyParagraphs, closing, signature }
}

export function CoverLetterDocument({
  content,
  profile,
  targetCompany,
  targetRole,
}: CoverLetterDocumentProps) {
  const parsed = parseCoverLetter(content, targetCompany)

  return (
    <div className="mx-auto w-[794px] font-['Helvetica_Neue',_Helvetica,_Arial,_sans-serif] leading-snug">
      <div className="w-[794px] min-h-[1123px] bg-white text-zinc-900 relative">

        {/* ──── LETTERHEAD ──── */}
        {profile ? (
          <header className="px-10 pt-10 pb-6 border-b-[1.5px] border-zinc-800">
            <h1 className="text-[24px] font-bold tracking-tight text-zinc-900">
              {profile.name}
            </h1>
            <p className="mt-1 text-[13px] font-medium text-zinc-600 tracking-wide uppercase">
              {profile.title}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-2 text-[10px] text-zinc-600">
              <span>{profile.location}</span>
              <span className="text-zinc-300">|</span>
              <a href={toHref(profile.email)} className="hover:underline">{profile.email}</a>
              <span className="text-zinc-300">|</span>
              <a href={toHref(profile.linkedin)} className="hover:underline">{profile.linkedin}</a>
              <span className="text-zinc-300">|</span>
              <a href={toHref(profile.github)} className="hover:underline">{profile.github}</a>
              <span className="text-zinc-300">|</span>
              <a href={toHref(profile.website)} className="hover:underline">{profile.website}</a>
            </div>
          </header>
        ) : (
          <header className="px-10 pt-10 pb-6 border-b-[1.5px] border-zinc-800">
            <p className="text-[13px] font-semibold text-zinc-500 uppercase tracking-widest">
              Cover Letter
            </p>
          </header>
        )}

        <div className="px-10 py-8 space-y-5">

          {/* ──── DATE ──── */}
          <p className="text-[10.5px] text-zinc-600">{parsed.date}</p>

          {/* ──── RECIPIENT BLOCK ──── */}
          <div className="space-y-0.5">
            {parsed.recipientBlock.map((line, i) => (
              <p key={i} className="text-[10.5px] text-zinc-800 leading-[1.6]">
                {line}
              </p>
            ))}
            {targetRole && (
              <p className="text-[10.5px] text-zinc-800 leading-[1.6]">
                Re: <span className="font-medium">{targetRole}</span>
              </p>
            )}
          </div>

          {/* ──── SALUTATION ──── */}
          {parsed.salutation && (
            <p className="text-[10.5px] text-zinc-900 font-medium pt-1">
              {parsed.salutation}
            </p>
          )}

          {/* ──── BODY PARAGRAPHS ──── */}
          <div className="space-y-4">
            {parsed.body.map((paragraph, i) => (
              <p key={i} className="text-[10.5px] leading-[1.75] text-zinc-800">
                {paragraph}
              </p>
            ))}
          </div>

          {/* ──── CLOSING ──── */}
          {(parsed.closing || parsed.signature) && (
            <div className="pt-2 space-y-6">
              {parsed.closing && (
                <p className="text-[10.5px] text-zinc-900">{parsed.closing}</p>
              )}
              {parsed.signature ? (
                <div>
                  <p className="text-[10.5px] font-semibold text-zinc-900">{parsed.signature}</p>
                  {targetRole && (
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {profile?.title ?? ''}
                    </p>
                  )}
                </div>
              ) : profile ? (
                <div>
                  <p className="text-[10.5px] font-semibold text-zinc-900">{profile.name}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{profile.title}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
