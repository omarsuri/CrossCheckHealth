import { readFile } from "node:fs/promises";
import path from "node:path";
import { FullLegalDocumentPage } from "@/components/legal/FullLegalDocumentPage";

export const metadata = {
  title: "Terms of Use | CrossCheckHealth",
};

export default async function Page() {
  const markdown = await readFile(path.join(process.cwd(), "docs", "legal", "02_Terms_of_Use.md"), "utf8");
  return <FullLegalDocumentPage markdown={markdown} />;
}

