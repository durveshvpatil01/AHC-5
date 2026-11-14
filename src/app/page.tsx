import { getCrm } from "@/lib/load";
import { syncStatus } from "@/lib/sync";
import { LiveDesk } from "@/components/LiveDesk";

// Rendered per request; the browser then stays live through /api/crm (the portal's MCP connection).
export const dynamic = "force-dynamic";

export default async function Page() {
  const { crm, version } = await getCrm({ tick: true });
  return <LiveDesk initial={{ crm, version, sync: syncStatus() }} />;
}
