"use client";

import {
  Activity,
  ArrowRight,
  Check,
  Clock3,
  GitBranch,
  GripVertical,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Target,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  Project,
  Task,
  TaskPriority,
  TaskStatus,
  TaskType,
  WorkspaceSnapshot,
} from "@/lib/types";

type OpsConsoleProps = {
  initialWorkspace: WorkspaceSnapshot;
};

const columns: Array<{ status: TaskStatus; label: string; hint: string }> = [
  { status: "OPEN", label: "Open", hint: "ready" },
  { status: "IN_PROGRESS", label: "In work", hint: "active" },
  { status: "REVIEW", label: "Review", hint: "verify" },
  { status: "DONE", label: "Done", hint: "shipped" },
];

const priorityStyles: Record<TaskPriority, string> = {
  LOW: "border-neutral-700 text-neutral-400",
  MEDIUM: "border-neutral-600 text-neutral-200",
  HIGH: "border-amber-500/50 text-amber-200",
  CRITICAL: "border-red-500/60 text-red-200",
};

const typeLabels: Record<TaskType, string> = {
  FEATURE: "Feature",
  BUG: "Bug",
  CHORE: "Chore",
  RESEARCH: "Research",
  RELEASE: "Release",
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(value: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function projectProgress(project: Project) {
  const tasks = project.branches.flatMap((branch) => branch.tasks);
  if (tasks.length === 0) return 0;
  return Math.round(
    tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length,
  );
}

export function OpsConsole({ initialWorkspace }: OpsConsoleProps) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [selectedProjectId, setSelectedProjectId] = useState(
    initialWorkspace.projects[0]?.id ?? "",
  );
  const [selectedBranchId, setSelectedBranchId] = useState(
    initialWorkspace.projects[0]?.branches[0]?.id ?? "",
  );
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | TaskPriority>("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | TaskType>("ALL");
  const [draggedTaskId, setDraggedTaskId] = useState("");
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | "">("");
  const [projectDraft, setProjectDraft] = useState({
    name: "",
    summary: "",
  });
  const [branchDraft, setBranchDraft] = useState({
    name: "",
    goal: "",
  });
  const [taskDraft, setTaskDraft] = useState<{
    title: string;
    description: string;
    priority: TaskPriority;
    type: TaskType;
  }>({
    title: "",
    description: "",
    priority: "MEDIUM",
    type: "FEATURE",
  });
  const [noteDraft, setNoteDraft] = useState("");

  const selectedProject = useMemo(
    () =>
      workspace.projects.find((project) => project.id === selectedProjectId) ??
      workspace.projects[0],
    [workspace.projects, selectedProjectId],
  );

  const selectedBranch = useMemo(
    () =>
      selectedProject?.branches.find((branch) => branch.id === selectedBranchId) ??
      selectedProject?.branches[0],
    [selectedProject, selectedBranchId],
  );

  const selectedTask = useMemo(() => {
    const tasks = selectedProject?.branches.flatMap((branch) => branch.tasks) ?? [];
    return tasks.find((task) => task.id === selectedTaskId) ?? null;
  }, [selectedProject, selectedTaskId]);

  const branchTasks = useMemo(() => selectedBranch?.tasks ?? [], [selectedBranch]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return branchTasks.filter((task) => {
      const matchesQuery =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query);
      const matchesPriority =
        priorityFilter === "ALL" || task.priority === priorityFilter;
      const matchesType = typeFilter === "ALL" || task.type === typeFilter;

      return matchesQuery && matchesPriority && matchesType;
    });
  }, [branchTasks, priorityFilter, searchQuery, typeFilter]);

  const branchStats = useMemo(() => {
    const done = branchTasks.filter((task) => task.status === "DONE").length;
    const active = branchTasks.filter((task) => task.status === "IN_PROGRESS").length;
    const review = branchTasks.filter((task) => task.status === "REVIEW").length;
    const notes = branchTasks.reduce((sum, task) => sum + task.comments.length, 0);
    const highSignal = branchTasks.filter(
      (task) => task.priority === "HIGH" || task.priority === "CRITICAL",
    ).length;

    return {
      total: branchTasks.length,
      done,
      active,
      review,
      notes,
      highSignal,
    };
  }, [branchTasks]);

  async function mutate(path: string, body: unknown, method = "POST") {
    setIsMutating(true);
    setError("");
    try {
      const response = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const nextWorkspace = (await response.json()) as WorkspaceSnapshot;
      setWorkspace(nextWorkspace);
      return nextWorkspace;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setIsMutating(false);
    }
  }

  async function createProjectFromDraft() {
    if (!projectDraft.name.trim() || !projectDraft.summary.trim()) return;
    const nextWorkspace = await mutate("/api/projects", projectDraft);
    if (nextWorkspace) {
      setProjectDraft({ name: "", summary: "" });
      setSelectedProjectId(nextWorkspace.projects[0]?.id ?? "");
      setSelectedBranchId(nextWorkspace.projects[0]?.branches[0]?.id ?? "");
    }
  }

  async function createBranchFromDraft() {
    if (!selectedProject || !branchDraft.name.trim() || !branchDraft.goal.trim()) {
      return;
    }
    const nextWorkspace = await mutate("/api/branches", {
      projectId: selectedProject.id,
      ...branchDraft,
    });
    if (nextWorkspace) {
      const nextProject = nextWorkspace.projects.find(
        (project) => project.id === selectedProject.id,
      );
      setBranchDraft({ name: "", goal: "" });
      setSelectedBranchId(nextProject?.branches.at(-1)?.id ?? selectedBranchId);
    }
  }

  async function createTaskFromDraft() {
    if (!selectedProject || !selectedBranch || !taskDraft.title.trim()) return;
    const nextWorkspace = await mutate("/api/tasks", {
      projectId: selectedProject.id,
      branchId: selectedBranch.id,
      ...taskDraft,
    });
    if (nextWorkspace) {
      setTaskDraft({
        title: "",
        description: "",
        priority: "MEDIUM",
        type: "FEATURE",
      });
      const nextProject = nextWorkspace.projects.find(
        (project) => project.id === selectedProject.id,
      );
      const nextBranch = nextProject?.branches.find(
        (branch) => branch.id === selectedBranch.id,
      );
      setSelectedTaskId(nextBranch?.tasks.at(-1)?.id ?? selectedTaskId);
    }
  }

  async function moveTask(task: Task, status: TaskStatus) {
    await mutate(`/api/tasks/${task.id}`, { status }, "PATCH");
  }

  async function saveTaskDetails(
    task: Task,
    input: {
      title: string;
      description: string;
      priority: TaskPriority;
      type: TaskType;
      progress: number;
    },
  ) {
    await mutate(`/api/tasks/${task.id}`, input, "PATCH");
  }

  async function dropTaskInto(status: TaskStatus, droppedTaskId: string) {
    const task = branchTasks.find((candidate) => candidate.id === droppedTaskId);
    setDragOverStatus("");
    setDraggedTaskId("");

    if (!task || task.status === status) return;
    await moveTask(task, status);
  }

  async function addNote() {
    if (!selectedTask || !noteDraft.trim()) return;
    const nextWorkspace = await mutate(
      `/api/tasks/${selectedTask.id}/comments`,
      {
        body: noteDraft,
        isPrivate: true,
      },
    );
    if (nextWorkspace) setNoteDraft("");
  }

  const empty = workspace.projects.length === 0;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-neutral-800 bg-neutral-950/95 p-4 lg:border-b-0 lg:border-r">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center border border-neutral-700 bg-neutral-900">
              <LayoutDashboard className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-neutral-400">
                Kanu Ops
              </p>
              <h1 className="text-xl font-semibold">Command center</h1>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-3 gap-2">
            <Metric label="Projects" value={workspace.totals.projects} />
            <Metric label="Branches" value={workspace.totals.branches} />
            <Metric label="Done" value={workspace.totals.done} />
          </div>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">
                Projects
              </h2>
              <span className="text-xs text-neutral-500">{workspace.totals.tasks} tasks</span>
            </div>
            <div className="max-h-[34vh] space-y-2 overflow-y-auto pr-1 lg:max-h-[42vh]">
              {workspace.projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    setSelectedProjectId(project.id);
                    setSelectedBranchId(project.branches[0]?.id ?? "");
                    setSelectedTaskId("");
                  }}
                  className={cx(
                    "w-full border p-3 text-left transition",
                    selectedProjectId === project.id
                      ? "border-neutral-200 bg-neutral-100 text-neutral-950"
                      : "border-neutral-800 bg-neutral-900/50 text-neutral-200 hover:border-neutral-500",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{project.name}</span>
                    <span className="text-xs">{projectProgress(project)}%</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs opacity-70">{project.summary}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-5 border border-neutral-800 p-3">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">
              <Plus className="size-3.5" /> New project
            </h2>
            <div className="space-y-2">
              <input
                value={projectDraft.name}
                onChange={(event) =>
                  setProjectDraft((draft) => ({ ...draft, name: event.target.value }))
                }
                placeholder="Project name"
                className="h-9 w-full border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none focus:border-neutral-500"
              />
              <textarea
                value={projectDraft.summary}
                onChange={(event) =>
                  setProjectDraft((draft) => ({
                    ...draft,
                    summary: event.target.value,
                  }))
                }
                placeholder="Short purpose"
                rows={3}
                className="w-full resize-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              />
              <button
                type="button"
                onClick={createProjectFromDraft}
                disabled={isMutating}
                className="flex h-9 w-full items-center justify-center gap-2 bg-neutral-100 px-3 text-sm font-semibold text-neutral-950 disabled:opacity-40"
              >
                <Plus className="size-4" /> Create
              </button>
            </div>
          </section>
        </aside>

        <section className="min-w-0">
          {empty ? (
            <div className="flex min-h-screen items-center justify-center p-6 text-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
                  Empty workspace
                </p>
                <h2 className="mt-3 text-3xl font-semibold">Create first project</h2>
              </div>
            </div>
          ) : (
            <div className="flex min-h-screen flex-col">
              <header className="border-b border-neutral-800 p-4 xl:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.26em] text-neutral-500">
                      {selectedProject?.slug}
                    </p>
                    <h2 className="text-3xl font-semibold tracking-tight">
                      {selectedProject?.name}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm text-neutral-400">
                      {selectedProject?.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 xl:w-[360px]">
                    <Metric label="Health" value={`${selectedProject?.healthScore ?? 0}%`} />
                    <Metric label="Progress" value={`${selectedProject ? projectProgress(selectedProject) : 0}%`} />
                    <Metric label="Logs" value={selectedProject?.logs.length ?? 0} />
                  </div>
                </div>

                <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
                  {selectedProject?.branches.map((branch) => (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => {
                        setSelectedBranchId(branch.id);
                        setSelectedTaskId("");
                      }}
                      className={cx(
                        "flex h-10 shrink-0 items-center gap-2 border px-3 text-sm transition",
                        selectedBranch?.id === branch.id
                          ? "border-neutral-100 bg-neutral-100 text-neutral-950"
                          : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-500",
                      )}
                    >
                      <GitBranch className="size-4" />
                      {branch.name}
                      <span className="text-xs opacity-60">{branch.progress}%</span>
                    </button>
                  ))}
                </div>
              </header>

              <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="min-w-0 p-4 xl:p-5">
                  <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <div className="border border-neutral-800 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="flex items-center gap-2 text-lg font-semibold">
                            <Target className="size-5" />
                            {selectedBranch?.name}
                          </h3>
                          <p className="mt-2 max-w-3xl text-sm text-neutral-400">
                            {selectedBranch?.goal}
                          </p>
                          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                            <MiniStat label="Tasks" value={branchStats.total} />
                            <MiniStat label="Active" value={branchStats.active} />
                            <MiniStat label="Review" value={branchStats.review} />
                            <MiniStat label="Done" value={branchStats.done} />
                            <MiniStat label="Notes" value={branchStats.notes} />
                            <MiniStat label="High" value={branchStats.highSignal} />
                          </div>
                        </div>
                        <div className="min-w-20 text-right">
                          <p className="text-2xl font-semibold">{selectedBranch?.progress ?? 0}%</p>
                          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                            progress
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border border-neutral-800 p-3">
                      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                        <GitBranch className="size-3.5" /> Branch
                      </h3>
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <input
                          value={branchDraft.name}
                          onChange={(event) =>
                            setBranchDraft((draft) => ({
                              ...draft,
                              name: event.target.value,
                            }))
                          }
                          placeholder="branch name"
                          className="h-9 border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none focus:border-neutral-500"
                        />
                        <button
                          type="button"
                          onClick={createBranchFromDraft}
                          disabled={isMutating}
                          className="flex size-9 items-center justify-center bg-neutral-100 text-neutral-950 disabled:opacity-40"
                          title="Create branch"
                        >
                          <Plus className="size-4" />
                        </button>
                        <input
                          value={branchDraft.goal}
                          onChange={(event) =>
                            setBranchDraft((draft) => ({
                              ...draft,
                              goal: event.target.value,
                            }))
                          }
                          placeholder="goal"
                          className="col-span-2 h-9 border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none focus:border-neutral-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 border border-neutral-800 p-3">
                    <div className="grid gap-2 lg:grid-cols-[1fr_180px_150px_auto]">
                      <input
                        value={taskDraft.title}
                        onChange={(event) =>
                          setTaskDraft((draft) => ({
                            ...draft,
                            title: event.target.value,
                          }))
                        }
                        placeholder="Create task without leaving board"
                        className="h-10 border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none focus:border-neutral-500"
                      />
                      <select
                        value={taskDraft.type}
                        onChange={(event) =>
                          setTaskDraft((draft) => ({
                            ...draft,
                            type: event.target.value as TaskType,
                          }))
                        }
                        className="h-10 border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none focus:border-neutral-500"
                      >
                        {Object.keys(typeLabels).map((type) => (
                          <option key={type} value={type}>
                            {typeLabels[type as TaskType]}
                          </option>
                        ))}
                      </select>
                      <select
                        value={taskDraft.priority}
                        onChange={(event) =>
                          setTaskDraft((draft) => ({
                            ...draft,
                            priority: event.target.value as TaskPriority,
                          }))
                        }
                        className="h-10 border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none focus:border-neutral-500"
                      >
                        {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as TaskPriority[]).map(
                          (priority) => (
                            <option key={priority} value={priority}>
                              {priority}
                            </option>
                          ),
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={createTaskFromDraft}
                        disabled={isMutating}
                        className="flex h-10 items-center justify-center gap-2 bg-neutral-100 px-4 text-sm font-semibold text-neutral-950 disabled:opacity-40"
                      >
                        <Plus className="size-4" /> Add
                      </button>
                      <input
                        value={taskDraft.description}
                        onChange={(event) =>
                          setTaskDraft((draft) => ({
                            ...draft,
                            description: event.target.value,
                          }))
                        }
                        placeholder="Optional context"
                        className="h-10 border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none focus:border-neutral-500 lg:col-span-4"
                      />
                    </div>
                    {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
                  </div>

                  <div className="mb-4 grid gap-2 border border-neutral-800 p-3 lg:grid-cols-[1fr_170px_170px]">
                    <label className="relative block">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
                      <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search task title or context"
                        className="h-10 w-full border border-neutral-800 bg-neutral-950 px-9 text-sm outline-none focus:border-neutral-500"
                      />
                    </label>
                    <select
                      value={priorityFilter}
                      onChange={(event) =>
                        setPriorityFilter(event.target.value as "ALL" | TaskPriority)
                      }
                      className="h-10 border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none focus:border-neutral-500"
                    >
                      <option value="ALL">All priorities</option>
                      {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as TaskPriority[]).map(
                        (priority) => (
                          <option key={priority} value={priority}>
                            {priority}
                          </option>
                        ),
                      )}
                    </select>
                    <select
                      value={typeFilter}
                      onChange={(event) =>
                        setTypeFilter(event.target.value as "ALL" | TaskType)
                      }
                      className="h-10 border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none focus:border-neutral-500"
                    >
                      <option value="ALL">All types</option>
                      {Object.entries(typeLabels).map(([type, label]) => (
                        <option key={type} value={type}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid min-h-[500px] gap-3 xl:grid-cols-4">
                    {columns.map((column) => {
                      const tasks = filteredTasks.filter(
                        (task) => task.status === column.status,
                      );

                      return (
                        <section
                          key={column.status}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDragOverStatus(column.status);
                          }}
                          onDragLeave={() => setDragOverStatus("")}
                          onDrop={(event) => {
                            event.preventDefault();
                            dropTaskInto(
                              column.status,
                              event.dataTransfer.getData("text/plain") || draggedTaskId,
                            );
                          }}
                          onPointerUp={() => {
                            if (draggedTaskId) dropTaskInto(column.status, draggedTaskId);
                          }}
                          data-kanban-column={column.status}
                          className={cx(
                            "min-h-[300px] border bg-neutral-950 transition",
                            dragOverStatus === column.status
                              ? "border-neutral-300"
                              : "border-neutral-800",
                          )}
                        >
                          <div className="flex h-12 items-center justify-between border-b border-neutral-800 px-3">
                            <div>
                              <h3 className="text-sm font-semibold">{column.label}</h3>
                              <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                                {column.hint}
                              </p>
                            </div>
                            <span className="text-sm text-neutral-400">{tasks.length}</span>
                          </div>
                          <div className="max-h-[58vh] space-y-2 overflow-y-auto p-2">
                            {tasks.map((task) => (
                              <TaskCard
                                key={task.id}
                                task={task}
                                selected={selectedTask?.id === task.id}
                                onSelect={() => setSelectedTaskId(task.id)}
                                onMove={moveTask}
                                onDragStart={(taskId) => setDraggedTaskId(taskId)}
                                onDragEnd={() => {
                                  setDraggedTaskId("");
                                  setDragOverStatus("");
                                }}
                              />
                            ))}
                            {tasks.length === 0 ? (
                              <div className="border border-dashed border-neutral-800 p-4 text-center text-xs text-neutral-500">
                                Drop task here
                              </div>
                            ) : null}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </div>

                <aside className="border-t border-neutral-800 bg-neutral-950 p-4 xl:border-l xl:border-t-0 xl:p-5">
                  {selectedTask ? (
                    <TaskDrawer
                      task={selectedTask}
                      noteDraft={noteDraft}
                      setNoteDraft={setNoteDraft}
                      addNote={addNote}
                      moveTask={moveTask}
                      onSave={saveTaskDetails}
                      disabled={isMutating}
                    />
                  ) : (
                    <div className="border border-neutral-800 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.26em] text-neutral-500">
                        Task detail
                      </p>
                      <h3 className="mt-3 text-xl font-semibold">Select task</h3>
                      <p className="mt-2 text-sm text-neutral-400">
                        Open card to inspect notes, status, progress, and activity context.
                      </p>
                    </div>
                  )}

                  <section className="mt-4 border border-neutral-800 p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">
                      <Activity className="size-3.5" /> Activity
                    </h3>
                    <div className="max-h-60 space-y-3 overflow-y-auto">
                      {selectedProject?.logs.map((log) => (
                        <div key={log.id} className="border-l border-neutral-700 pl-3">
                          <p className="text-sm text-neutral-200">{log.message}</p>
                          <p className="mt-1 text-xs text-neutral-500">
                            {log.action} · {formatDate(log.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                </aside>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-neutral-800 bg-neutral-900/50 p-2">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">{label}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-neutral-800 px-2 py-1.5">
      <p className="font-semibold">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase text-neutral-500">
        {label}
      </p>
    </div>
  );
}

function TaskCard({
  task,
  selected,
  onSelect,
  onMove,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  selected: boolean;
  onSelect: () => void;
  onMove: (task: Task, status: TaskStatus) => void;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
}) {
  const nextStatus =
    task.status === "OPEN"
      ? "IN_PROGRESS"
      : task.status === "IN_PROGRESS"
        ? "REVIEW"
        : task.status === "REVIEW"
          ? "DONE"
          : "DONE";

  return (
    <article
      draggable
      data-task-id={task.id}
      data-task-status={task.status}
      onPointerDown={() => onDragStart(task.id)}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", task.id);
        onDragStart(task.id);
      }}
      onDragEnd={onDragEnd}
      className={cx(
        "cursor-grab border p-3 transition active:cursor-grabbing",
        selected
          ? "border-neutral-100 bg-neutral-900"
          : "border-neutral-800 bg-neutral-900/40 hover:border-neutral-500",
      )}
    >
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <GripVertical className="mt-0.5 size-4 shrink-0 text-neutral-600" />
            <h4 className="text-sm font-semibold leading-5">{task.title}</h4>
          </div>
          <span
            className={cx(
              "shrink-0 border px-1.5 py-0.5 text-[10px] font-semibold",
              priorityStyles[task.priority],
            )}
          >
            {task.priority}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-xs text-neutral-400">{task.description}</p>
        <div className="mt-3 h-1.5 bg-neutral-800">
          <div className="h-full bg-neutral-100" style={{ width: `${task.progress}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
          <span>{typeLabels[task.type]}</span>
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3" /> {task.comments.length}
          </span>
        </div>
      </button>
      {task.status !== "DONE" ? (
        <button
          type="button"
          onClick={() => onMove(task, nextStatus)}
          className="mt-3 flex h-8 w-full items-center justify-center gap-2 border border-neutral-700 text-xs font-semibold text-neutral-200 hover:border-neutral-300"
        >
          Move <ArrowRight className="size-3.5" />
        </button>
      ) : null}
    </article>
  );
}

function TaskDrawer({
  task,
  noteDraft,
  setNoteDraft,
  addNote,
  moveTask,
  onSave,
  disabled,
}: {
  task: Task;
  noteDraft: string;
  setNoteDraft: (value: string) => void;
  addNote: () => void;
  moveTask: (task: Task, status: TaskStatus) => void;
  onSave: (
    task: Task,
    input: {
      title: string;
      description: string;
      priority: TaskPriority;
      type: TaskType;
      progress: number;
    },
  ) => void;
  disabled: boolean;
}) {
  function saveTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave(task, {
      title: String(form.get("title") ?? task.title),
      description: String(form.get("description") ?? task.description),
      priority: String(form.get("priority") ?? task.priority) as TaskPriority,
      type: String(form.get("type") ?? task.type) as TaskType,
      progress: Number(form.get("progress") ?? task.progress),
    });
  }

  return (
    <section className="border border-neutral-800">
      <div className="border-b border-neutral-800 p-4">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
          <ShieldCheck className="size-3.5" /> Private task
        </p>
        <form className="space-y-3" onSubmit={saveTask}>
          <input
            key={`${task.id}-title`}
            name="title"
            defaultValue={task.title}
            className="h-10 w-full border border-neutral-800 bg-neutral-950 px-3 text-lg font-semibold outline-none focus:border-neutral-500"
          />
          <textarea
            key={`${task.id}-description`}
            name="description"
            defaultValue={task.description}
            rows={3}
            placeholder="No description."
            className="w-full resize-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-300 outline-none focus:border-neutral-500"
          />
          <div className="grid grid-cols-[1fr_1fr_90px] gap-2">
            <select
              key={`${task.id}-priority`}
              name="priority"
              defaultValue={task.priority}
              className="h-9 border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none focus:border-neutral-500"
            >
              {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as TaskPriority[]).map(
                (priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ),
              )}
            </select>
            <select
              key={`${task.id}-type`}
              name="type"
              defaultValue={task.type}
              className="h-9 border border-neutral-800 bg-neutral-950 px-3 text-sm outline-none focus:border-neutral-500"
            >
              {Object.entries(typeLabels).map(([type, label]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={disabled}
              className="flex h-9 items-center justify-center gap-2 bg-neutral-100 px-3 text-sm font-semibold text-neutral-950 disabled:opacity-40"
            >
              <Save className="size-4" /> Save
            </button>
          </div>
          <label className="block">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-neutral-500">
              <span>Manual progress</span>
              <span>{task.progress}%</span>
            </div>
            <input
              key={`${task.id}-progress`}
              name="progress"
              type="range"
              min="0"
              max="100"
              defaultValue={task.progress}
              className="w-full accent-neutral-100"
            />
          </label>
        </form>
      </div>

      <div className="grid grid-cols-2 border-b border-neutral-800 text-sm">
        <DetailCell label="Status" value={task.status.replace("_", " ")} />
        <DetailCell label="Priority" value={task.priority} />
        <DetailCell label="Type" value={typeLabels[task.type]} />
        <DetailCell label="Updated" value={formatDate(task.updatedAt)} />
      </div>

      <div className="border-b border-neutral-800 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">Progress</span>
          <span className="text-sm font-semibold">{task.progress}%</span>
        </div>
        <div className="h-2 bg-neutral-800">
          <div className="h-full bg-neutral-100" style={{ width: `${task.progress}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {columns.map((column) => (
            <button
              key={column.status}
              type="button"
              disabled={disabled || task.status === column.status}
              onClick={() => moveTask(task, column.status)}
              className="flex h-9 items-center justify-center gap-2 border border-neutral-800 text-xs font-semibold text-neutral-300 disabled:bg-neutral-900 disabled:text-neutral-600"
            >
              {column.status === "DONE" ? <Check className="size-3.5" /> : <Clock3 className="size-3.5" />}
              {column.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
          <MessageSquare className="size-3.5" /> Notes
        </h4>
        <textarea
          value={noteDraft}
          onChange={(event) => setNoteDraft(event.target.value)}
          placeholder="Private implementation note"
          rows={4}
          className="w-full resize-none border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <button
          type="button"
          onClick={addNote}
          disabled={disabled}
          className="mt-2 flex h-9 w-full items-center justify-center gap-2 bg-neutral-100 px-3 text-sm font-semibold text-neutral-950 disabled:opacity-40"
        >
          <Plus className="size-4" /> Add note
        </button>

        <div className="mt-4 max-h-72 space-y-3 overflow-y-auto">
          {task.comments.map((comment) => (
            <div key={comment.id} className="border border-neutral-800 p-3">
              <p className="text-sm text-neutral-200">{comment.body}</p>
              <p className="mt-2 text-xs text-neutral-500">
                {comment.isPrivate ? "private" : "public"} · {formatDate(comment.createdAt)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-t border-neutral-800 p-3 even:border-r-0">
      <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
