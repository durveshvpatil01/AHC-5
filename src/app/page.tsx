import { getCrm } from "@/lib/load";
import { Desk } from "@/components/Desk";

// Re-render at most every 30 s; live sources refresh on their own cache timers (see src/lib/aq.ts).
export const revalidate = 30;

export default async function Page() {
  const crm = await getCrm();
  return <Desk crm={crm} />;
}
