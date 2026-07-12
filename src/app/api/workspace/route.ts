import { getWorkspaceSnapshot } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(getWorkspaceSnapshot());
}
