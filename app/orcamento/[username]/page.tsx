import { InteractiveQuotePage } from "@/components/quote/interactive-quote-page"

export default async function OrcamentoPage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params

  return <InteractiveQuotePage username={username} />
}
