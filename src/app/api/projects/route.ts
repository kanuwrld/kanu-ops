import { createProject, getWorkspaceSnapshot } from "@/lib/db";
import { projectCreateSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = projectCreateSchema.parse(await request.json());
  createProject(payload);
  return Response.json(getWorkspaceSnapshot(), { status: 201 });
}
