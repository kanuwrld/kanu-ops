import { createBranch, getWorkspaceSnapshot } from "@/lib/db";
import { branchCreateSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = branchCreateSchema.parse(await request.json());
  createBranch(payload);
  return Response.json(getWorkspaceSnapshot(), { status: 201 });
}
