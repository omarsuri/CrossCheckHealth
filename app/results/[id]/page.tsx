import AppShell from "@/components/AppShell";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <AppShell initialPage={`/results/${id}`} initialParams={{ id }} />;
}
