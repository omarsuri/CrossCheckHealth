import type { Metadata } from "next";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Privacy Policy | CrossCheckHealth",
};

export default function Page() {
  return <AppShell initialPage="/privacy-policy" />;
}
