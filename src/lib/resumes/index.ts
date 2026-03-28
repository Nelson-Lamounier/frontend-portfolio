/**
 * Resumes domain barrel — re-exports resume data models,
 * DynamoDB persistence, and DOM builder utilities.
 */

export type { ResumeData } from './resume-data'
export { resumeData } from './resume-data'
export { resumeDataEsc } from './resume-data-esc'
export { resumeDataFullstack } from './resume-data-fullstack'
export {
  A4_WIDTH,
  A4_HEIGHT,
  PDF_BG,
  PAGE_PADDING_TOP,
  PAGE_PADDING_BOTTOM,
  PAGE_PADDING_X,
  buildResumeDomForPdf,
} from './resume-dom-builder'
