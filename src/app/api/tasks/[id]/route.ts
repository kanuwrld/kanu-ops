import { getWorkspaceSnapshot, updateTask } from "@/lib/db";
import { taskUpdateSchema } from "@/lib/validators";

export const runtime = "nodejs";

type TaskRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: TaskRouteContext) {
  const { id } = await context.params;
  const payload = taskUpdateSchema.parse(await request.json());
  updateTask(id, payload);
  return Response.json(getWorkspaceSnapshot());
}
