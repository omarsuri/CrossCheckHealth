import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { FullLegalDocumentPage } from "@/components/legal/FullLegalDocumentPage";

export const metadata: Metadata = {
  title: "Privacy Policy | CrossCheckHealth",
};

export default async function Page() {
  const markdown = await readFile(path.join(process.cwd(), "docs", "legal", "01_Privacy_Policy.md"), "utf8");
  return <FullLegalDocumentPage markdown={markdown} />;
}
