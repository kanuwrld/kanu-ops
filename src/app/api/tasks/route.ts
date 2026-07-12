import { createTask, getWorkspaceSnapshot } from "@/lib/db";
import { taskCreateSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = taskCreateSchema.parse(await request.json());
  createTask(payload);
  return Response.json(getWorkspaceSnapshot(), { status: 201 });
}
