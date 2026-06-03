import AppShell from "@/components/AppShell";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return <AppShell initialPage={`/assessment/invite/${token}`} initialParams={{ token }} />;
}
