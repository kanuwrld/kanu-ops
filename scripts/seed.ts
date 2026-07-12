import { getWorkspaceSnapshot, seedDemoWorkspace } from "../src/lib/db";

seedDemoWorkspace();

const snapshot = getWorkspaceSnapshot();
console.log(
  `Seeded ${snapshot.totals.projects} project, ${snapshot.totals.branches} branches, ${snapshot.totals.tasks} tasks.`,
);
