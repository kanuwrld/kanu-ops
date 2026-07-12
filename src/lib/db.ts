import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type {
  ActivityLog,
  Branch,
  BranchStatus,
  Project,
  ProjectStatus,
  Task,
  TaskComment,
  TaskPriority,
  TaskStatus,
  TaskType,
  WorkspaceSnapshot,
} from "@/lib/types";

type ProjectRow = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  status: ProjectStatus;
  health_score: number;
  created_at: string;
  updated_at: string;
};

type BranchRow = {
  id: string;
  project_id: string;
  name: string;
  goal: string;
  status: BranchStatus;
  progress: number;
  order_index: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

type TaskRow = {
  id: string;
  project_id: string;
  branch_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  progress: number;
  order_index: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

type CommentRow = {
  id: string;
  task_id: string;
  body: string;
  is_private: 0 | 1;
  created_at: string;
};

type LogRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  message: string;
  metadata: string | null;
  project_id: string | null;
  branch_id: string | null;
  task_id: string | null;
  created_at: string;
};

const schema = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  health_score INTEGER NOT NULL DEFAULT 80,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  progress INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'OPEN',
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  type TEXT NOT NULL DEFAULT 'FEATURE',
  progress INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_private INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS branches_project_order_idx ON branches(project_id, order_index);
CREATE INDEX IF NOT EXISTS tasks_branch_status_order_idx ON tasks(branch_id, status, order_index);
CREATE INDEX IF NOT EXISTS tasks_project_idx ON tasks(project_id);
CREATE INDEX IF NOT EXISTS task_comments_task_created_idx ON task_comments(task_id, created_at);
CREATE INDEX IF NOT EXISTS activity_project_created_idx ON activity_logs(project_id, created_at);
CREATE INDEX IF NOT EXISTS activity_branch_created_idx ON activity_logs(branch_id, created_at);
CREATE INDEX IF NOT EXISTS activity_task_created_idx ON activity_logs(task_id, created_at);
`;

const now = () => new Date().toISOString();

function databasePath() {
  return path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "kanu-ops.db");
}

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
}

function getDatabase() {
  const dbPath = databasePath();
  mkdirSync(path.dirname(dbPath), { recursive: true });

  const globalForDb = globalThis as unknown as { kanuOpsDb?: Database.Database };
  if (!globalForDb.kanuOpsDb) {
    globalForDb.kanuOpsDb = new Database(dbPath);
    globalForDb.kanuOpsDb.pragma("journal_mode = WAL");
    globalForDb.kanuOpsDb.pragma("foreign_keys = ON");
    globalForDb.kanuOpsDb.exec(schema);
  }

  return globalForDb.kanuOpsDb;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export function nextTaskProgress(status: string, currentProgress?: number) {
  if (status === "DONE") return 100;
  if (status === "REVIEW") return Math.max(currentProgress ?? 65, 75);
  if (status === "IN_PROGRESS") return Math.max(currentProgress ?? 25, 35);
  return Math.min(currentProgress ?? 0, 20);
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    summary: row.summary,
    status: row.status,
    healthScore: row.health_score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    branches: [],
    logs: [],
  };
}

function mapBranch(row: BranchRow): Branch {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    goal: row.goal,
    status: row.status,
    progress: row.progress,
    order: row.order_index,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tasks: [],
  };
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    branchId: row.branch_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    type: row.type,
    progress: row.progress,
    order: row.order_index,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    comments: [],
  };
}

function mapComment(row: CommentRow): TaskComment {
  return {
    id: row.id,
    taskId: row.task_id,
    body: row.body,
    isPrivate: Boolean(row.is_private),
    createdAt: row.created_at,
  };
}

function mapLog(row: LogRow): ActivityLog {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    message: row.message,
    metadata: row.metadata,
    projectId: row.project_id,
    branchId: row.branch_id,
    taskId: row.task_id,
    createdAt: row.created_at,
  };
}

function logActivity(input: {
  action: string;
  entityType: string;
  entityId: string;
  message: string;
  projectId?: string | null;
  branchId?: string | null;
  taskId?: string | null;
  metadata?: unknown;
}) {
  getDatabase()
    .prepare(
      `INSERT INTO activity_logs (
        id, action, entity_type, entity_id, message, metadata,
        project_id, branch_id, task_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id("log"),
      input.action,
      input.entityType,
      input.entityId,
      input.message,
      input.metadata ? JSON.stringify(input.metadata) : null,
      input.projectId ?? null,
      input.branchId ?? null,
      input.taskId ?? null,
      now(),
    );
}

function updateBranchProgress(branchId: string) {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT COALESCE(ROUND(AVG(progress)), 0) AS progress
       FROM tasks
       WHERE branch_id = ?`,
    )
    .get(branchId) as { progress: number };

  db.prepare("UPDATE branches SET progress = ?, updated_at = ? WHERE id = ?").run(
    row.progress,
    now(),
    branchId,
  );
}

function nextOrderForStatus(branchId: string, status: TaskStatus, excludeTaskId?: string) {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order
       FROM tasks
       WHERE branch_id = ? AND status = ? AND id != ?`,
    )
    .get(branchId, status, excludeTaskId ?? "") as { next_order: number };
  return row.next_order;
}

export function getWorkspaceSnapshot(): WorkspaceSnapshot {
  const db = getDatabase();
  const projects = db
    .prepare("SELECT * FROM projects ORDER BY updated_at DESC")
    .all() as ProjectRow[];
  const branches = db
    .prepare("SELECT * FROM branches ORDER BY order_index ASC, created_at ASC")
    .all() as BranchRow[];
  const tasks = db
    .prepare("SELECT * FROM tasks ORDER BY order_index ASC, created_at ASC")
    .all() as TaskRow[];
  const comments = db
    .prepare("SELECT * FROM task_comments ORDER BY created_at DESC")
    .all() as CommentRow[];
  const logs = db
    .prepare("SELECT * FROM activity_logs ORDER BY created_at DESC")
    .all() as LogRow[];

  const mappedProjects = projects.map(mapProject);
  const projectById = new Map(mappedProjects.map((project) => [project.id, project]));
  const branchById = new Map<string, Branch>();
  const taskById = new Map<string, Task>();

  for (const branchRow of branches) {
    const branch = mapBranch(branchRow);
    branchById.set(branch.id, branch);
    projectById.get(branch.projectId)?.branches.push(branch);
  }

  for (const taskRow of tasks) {
    const task = mapTask(taskRow);
    taskById.set(task.id, task);
    branchById.get(task.branchId)?.tasks.push(task);
  }

  for (const commentRow of comments) {
    taskById.get(commentRow.task_id)?.comments.push(mapComment(commentRow));
  }

  for (const logRow of logs) {
    const project = logRow.project_id ? projectById.get(logRow.project_id) : null;
    if (project && project.logs.length < 12) project.logs.push(mapLog(logRow));
  }

  const totals = mappedProjects.reduce(
    (acc, project) => {
      const projectTasks = project.branches.flatMap((branch) => branch.tasks);
      acc.projects += 1;
      acc.branches += project.branches.length;
      acc.tasks += projectTasks.length;
      acc.done += projectTasks.filter((task) => task.status === "DONE").length;
      return acc;
    },
    { projects: 0, branches: 0, tasks: 0, done: 0 },
  );

  return {
    projects: mappedProjects,
    totals,
    generatedAt: now(),
  };
}

export function createProject(input: { name: string; summary: string }) {
  const db = getDatabase();
  return db.transaction(() => {
    const createdAt = now();
    const projectId = id("prj");
    const branchId = id("brn");
    const baseSlug = slugify(input.name) || "project";
    let slug = baseSlug;
    let suffix = 1;

    while (db.prepare("SELECT id FROM projects WHERE slug = ?").get(slug)) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    db.prepare(
      `INSERT INTO projects (
        id, name, slug, summary, status, health_score, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'ACTIVE', 80, ?, ?)`,
    ).run(projectId, input.name, slug, input.summary, createdAt, createdAt);

    db.prepare(
      `INSERT INTO branches (
        id, project_id, name, goal, status, progress, order_index, due_date, created_at, updated_at
      ) VALUES (?, ?, 'main', 'Define product direction and first usable release.', 'ACTIVE', 0, 0, NULL, ?, ?)`,
    ).run(branchId, projectId, createdAt, createdAt);

    logActivity({
      action: "project.created",
      entityType: "project",
      entityId: projectId,
      projectId,
      message: `Created project ${input.name}.`,
    });
  })();
}

export function createBranch(input: {
  projectId: string;
  name: string;
  goal: string;
  dueDate?: string | null;
}) {
  const db = getDatabase();
  return db.transaction(() => {
    const row = db
      .prepare("SELECT COUNT(*) AS count FROM branches WHERE project_id = ?")
      .get(input.projectId) as { count: number };
    const branchId = id("brn");
    const createdAt = now();

    db.prepare(
      `INSERT INTO branches (
        id, project_id, name, goal, status, progress, order_index, due_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'ACTIVE', 0, ?, ?, ?, ?)`,
    ).run(
      branchId,
      input.projectId,
      input.name,
      input.goal,
      row.count,
      input.dueDate ?? null,
      createdAt,
      createdAt,
    );

    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(
      createdAt,
      input.projectId,
    );

    logActivity({
      action: "branch.created",
      entityType: "branch",
      entityId: branchId,
      projectId: input.projectId,
      branchId,
      message: `Opened branch ${input.name}.`,
    });
  })();
}

export function createTask(input: {
  projectId: string;
  branchId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  type: TaskType;
}) {
  const db = getDatabase();
  return db.transaction(() => {
    const row = db
      .prepare("SELECT COUNT(*) AS count FROM tasks WHERE branch_id = ?")
      .get(input.branchId) as { count: number };
    const taskId = id("tsk");
    const createdAt = now();

    db.prepare(
      `INSERT INTO tasks (
        id, project_id, branch_id, title, description, status, priority,
        type, progress, order_index, due_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'OPEN', ?, ?, 0, ?, NULL, ?, ?)`,
    ).run(
      taskId,
      input.projectId,
      input.branchId,
      input.title,
      input.description,
      input.priority,
      input.type,
      row.count,
      createdAt,
      createdAt,
    );

    updateBranchProgress(input.branchId);
    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(
      createdAt,
      input.projectId,
    );

    logActivity({
      action: "task.created",
      entityType: "task",
      entityId: taskId,
      projectId: input.projectId,
      branchId: input.branchId,
      taskId,
      message: `Created task ${input.title}.`,
    });
  })();
}

export function updateTask(
  taskId: string,
  input: {
    status?: TaskStatus;
    priority?: TaskPriority;
    type?: TaskType;
    progress?: number;
    order?: number;
    title?: string;
    description?: string;
  },
) {
  const db = getDatabase();
  return db.transaction(() => {
    const existing = db
      .prepare("SELECT * FROM tasks WHERE id = ?")
      .get(taskId) as TaskRow | undefined;

    if (!existing) throw new Error("Task not found");

    const status = input.status ?? existing.status;
    const movedToNewStatus = status !== existing.status;
    const progress =
      input.progress ??
      (input.status ? nextTaskProgress(input.status, existing.progress) : existing.progress);
    const order = input.order ?? (movedToNewStatus
      ? nextOrderForStatus(existing.branch_id, status, taskId)
      : existing.order_index);
    const updatedAt = now();

    db.prepare(
      `UPDATE tasks
       SET title = ?, description = ?, status = ?, priority = ?, type = ?,
           progress = ?, order_index = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      input.title ?? existing.title,
      input.description ?? existing.description,
      status,
      input.priority ?? existing.priority,
      input.type ?? existing.type,
      progress,
      order,
      updatedAt,
      taskId,
    );

    updateBranchProgress(existing.branch_id);
    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(
      updatedAt,
      existing.project_id,
    );

    logActivity({
      action: "task.updated",
      entityType: "task",
      entityId: taskId,
      projectId: existing.project_id,
      branchId: existing.branch_id,
      taskId,
      message: `Updated task ${input.title ?? existing.title}.`,
      metadata: input,
    });
  })();
}

export function createTaskComment(
  taskId: string,
  input: {
    body: string;
    isPrivate: boolean;
  },
) {
  const db = getDatabase();
  return db.transaction(() => {
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as
      | TaskRow
      | undefined;

    if (!task) throw new Error("Task not found");

    const commentId = id("cmt");
    const createdAt = now();

    db.prepare(
      `INSERT INTO task_comments (id, task_id, body, is_private, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(commentId, taskId, input.body, input.isPrivate ? 1 : 0, createdAt);

    db.prepare("UPDATE tasks SET updated_at = ? WHERE id = ?").run(createdAt, taskId);
    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(
      createdAt,
      task.project_id,
    );

    logActivity({
      action: "task.comment.created",
      entityType: "taskComment",
      entityId: commentId,
      projectId: task.project_id,
      branchId: task.branch_id,
      taskId,
      message: `Added note to ${task.title}.`,
    });
  })();
}

export function seedDemoWorkspace() {
  const db = getDatabase();
  return db.transaction(() => {
    db.prepare("DELETE FROM activity_logs").run();
    db.prepare("DELETE FROM task_comments").run();
    db.prepare("DELETE FROM tasks").run();
    db.prepare("DELETE FROM branches").run();
    db.prepare("DELETE FROM projects").run();

    createProject({
      name: "Kanu Ops",
      summary: "Solo-founder command center for branches, delivery goals, tasks, and notes.",
    });

    const project = db
      .prepare("SELECT * FROM projects WHERE slug = ?")
      .get("kanu-ops") as ProjectRow;
    const main = db
      .prepare("SELECT * FROM branches WHERE project_id = ? AND name = ?")
      .get(project.id, "main") as BranchRow;

    createBranch({
      projectId: project.id,
      name: "portfolio-mvp",
      goal: "Ship a public demo that proves product sense and backend discipline.",
    });

    const portfolio = db
      .prepare("SELECT * FROM branches WHERE project_id = ? AND name = ?")
      .get(project.id, "portfolio-mvp") as BranchRow;

    createTask({
      projectId: project.id,
      branchId: main.id,
      title: "Define project operating model",
      description: "Capture workflow: project -> branch -> task -> notes -> activity log.",
      priority: "HIGH",
      type: "RESEARCH",
    });
    createTask({
      projectId: project.id,
      branchId: main.id,
      title: "Create SQLite repository layer",
      description: "Keep DB access typed and isolated from UI code.",
      priority: "HIGH",
      type: "FEATURE",
    });
    createTask({
      projectId: project.id,
      branchId: portfolio.id,
      title: "Build dense kanban console",
      description: "Four columns, compact task drawer, quick creation flow, and visible progress.",
      priority: "CRITICAL",
      type: "FEATURE",
    });
    createTask({
      projectId: project.id,
      branchId: portfolio.id,
      title: "Write architecture documentation",
      description: "Document decisions so recruiters see technical reasoning, not only UI.",
      priority: "MEDIUM",
      type: "CHORE",
    });

    const firstTask = db
      .prepare("SELECT * FROM tasks WHERE title = ?")
      .get("Create SQLite repository layer") as TaskRow;

    updateTask(firstTask.id, { status: "IN_PROGRESS" });
    createTaskComment(firstTask.id, {
      body: "Keep migration story simple for MVP. Future version can move to Postgres without touching UI.",
      isPrivate: true,
    });
  })();
}
