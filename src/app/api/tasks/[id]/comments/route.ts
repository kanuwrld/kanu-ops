import { createTaskComment, getWorkspaceSnapshot } from "@/lib/db";
import { commentCreateSchema } from "@/lib/validators";

export const runtime = "nodejs";

type CommentRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: CommentRouteContext) {
  const { id } = await context.params;
  const payload = commentCreateSchema.parse(await request.json());
  createTaskComment(id, payload);
  return Response.json(getWorkspaceSnapshot(), { status: 201 });
}
