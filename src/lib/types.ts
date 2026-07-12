export type ProjectStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";
export type BranchStatus = "PLANNING" | "ACTIVE" | "REVIEW" | "SHIPPED" | "PARKED";
export type TaskStatus = "OPEN" | "IN_PROGRESS" | "REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TaskType = "FEATURE" | "BUG" | "CHORE" | "RESEARCH" | "RELEASE";

export type TaskComment = {
  id: string;
  taskId: string;
  body: string;
  isPrivate: boolean;
  createdAt: string;
};

export type Task = {
  id: string;
  projectId: string;
  branchId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  progress: number;
  order: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  comments: TaskComment[];
};

export type Branch = {
  id: string;
  projectId: string;
  name: string;
  goal: string;
  status: BranchStatus;
  progress: number;
  order: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  tasks: Task[];
};

export type ActivityLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  message: string;
  metadata: string | null;
  projectId: string | null;
  branchId: string | null;
  taskId: string | null;
  createdAt: string;
};

export type Project = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  status: ProjectStatus;
  healthScore: number;
  createdAt: string;
  updatedAt: string;
  branches: Branch[];
  logs: ActivityLog[];
};

export type WorkspaceSnapshot = {
  projects: Project[];
  totals: {
    projects: number;
    branches: number;
    tasks: number;
    done: number;
  };
  generatedAt: string;
};
