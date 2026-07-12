import { OpsConsole } from "@/components/ops-console";
import { getWorkspaceSnapshot } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function Home() {
  return <OpsConsole initialWorkspace={getWorkspaceSnapshot()} />;
}
