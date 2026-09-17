import { db } from "@/lib/feltdb";

export interface KanbanColumn {
  id: string;
  title: string;
  position: number;
}

export interface KanbanTask {
  id: string;
  title: string;
  description: string;
  columnId: string;
  position: number;
  assignee?: string;
}

const columns = db.collection<KanbanColumn>("Column");
const tasks = db.collection<KanbanTask>("Task");

const initialColumns: KanbanColumn[] = [
  { id: "backlog", title: "Backlog", position: 0 },
  { id: "in-progress", title: "In progress", position: 1 },
  { id: "review", title: "Review", position: 2 },
  { id: "done", title: "Done", position: 3 },
];

const initialTasks: KanbanTask[] = [
  {
    id: "task-research",
    title: "Research customer needs",
    description: "Collect the top requests from recent interviews.",
    columnId: "backlog",
    position: 0,
    assignee: "Maya",
  },
  {
    id: "task-prototype",
    title: "Build interaction prototype",
    description: "Validate the new navigation and primary workflow.",
    columnId: "in-progress",
    position: 0,
    assignee: "Alex",
  },
  {
    id: "task-copy",
    title: "Review launch copy",
    description: "Polish the onboarding and release announcement.",
    columnId: "review",
    position: 0,
    assignee: "Sam",
  },
];

export async function loadBoard() {
  let savedColumns = await columns.all();
  if (savedColumns.length === 0) {
    await Promise.all(
      initialColumns.map((column) => columns.insert(column, column.id)),
    );
    await Promise.all(initialTasks.map((task) => tasks.insert(task, task.id)));
    savedColumns = initialColumns;
  }

  return {
    columns: [...savedColumns].sort((a, b) => a.position - b.position),
    tasks: [...(await tasks.all())].sort((a, b) => a.position - b.position),
  };
}

export async function createTask(columnId: string, title: string) {
  const id = crypto.randomUUID();
  const columnTasks = (await tasks.all()).filter(
    (task) => task.columnId === columnId,
  );
  await tasks.insert(
    {
      id,
      title,
      description: "",
      columnId,
      position: columnTasks.length,
    },
    id,
  );
}

export async function moveTask(taskId: string, columnId: string) {
  const columnTasks = (await tasks.all()).filter(
    (task) => task.columnId === columnId && task.id !== taskId,
  );
  await tasks.update(taskId, { columnId, position: columnTasks.length });
}

export async function deleteTask(taskId: string) {
  await tasks.delete(taskId);
}
