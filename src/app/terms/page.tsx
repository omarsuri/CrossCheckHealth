import type { Metadata } from 'next'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { LegalDocumentPage } from '@/components/legal/legal-document-page'

export const metadata: Metadata = {
  title: 'Terms of Use | CrossCheckHealth',
}

export default async function TermsPage() {
  const markdown = await readFile(
    path.join(process.cwd(), 'docs', 'legal', '02_Terms_of_Use.md'),
    'utf8'
  )

  return <LegalDocumentPage markdown={markdown} />
}
