// The browser's single data endpoint. Each request lets the portal's MCP scheduler take its turn
// (at most one MCP call a minute), then returns the CRM only if the data version changed.
import { getCrm } from "@/lib/load";
import { syncStatus } from "@/lib/sync";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const have = Number(new URL(req.url).searchParams.get("v") ?? "0");
  const { crm, version } = await getCrm({ tick: true });
  const sync = syncStatus();
  if (have === version) return Response.json({ same: true, version, sync });
  return Response.json({ same: false, version, crm, sync });
}
