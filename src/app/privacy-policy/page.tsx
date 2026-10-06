import type { Metadata } from 'next'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { LegalDocumentPage } from '@/components/legal/legal-document-page'

export const metadata: Metadata = {
  title: 'Privacy Policy | CrossCheckHealth',
}

export default async function PrivacyPolicyPage() {
  const markdown = await readFile(
    path.join(process.cwd(), 'docs', 'legal', '01_Privacy_Policy.md'),
    'utf8'
  )

  return <LegalDocumentPage markdown={markdown} />
}
