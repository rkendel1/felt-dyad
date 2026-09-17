import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CircleUserRound,
  LayoutDashboard,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  createTask,
  deleteTask,
  loadBoard,
  moveTask,
  type KanbanTask,
} from "@/lib/kanban";

const boardKey = ["kanban-board"] as const;
const columnAccent: Record<string, string> = {
  backlog: "bg-slate-400",
  "in-progress": "bg-indigo-500",
  review: "bg-amber-400",
  done: "bg-emerald-500",
};

const Index = () => {
  const queryClient = useQueryClient();
  const [newTaskColumn, setNewTaskColumn] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: boardKey,
    queryFn: loadBoard,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: boardKey });
  const addTask = useMutation({
    mutationFn: ({ columnId, title }: { columnId: string; title: string }) =>
      createTask(columnId, title),
    onSuccess: () => {
      setNewTaskColumn(null);
      setNewTaskTitle("");
      refresh();
    },
  });
  const relocateTask = useMutation({
    mutationFn: ({ taskId, columnId }: { taskId: string; columnId: string }) =>
      moveTask(taskId, columnId),
    onSuccess: refresh,
  });
  const removeTask = useMutation({
    mutationFn: deleteTask,
    onSuccess: refresh,
  });
  const matchesSearch = (task: KanbanTask) =>
    `${task.title} ${task.description} ${task.assignee ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase());

  return (
    <div className="min-h-screen bg-[#f7f7fa] text-slate-900">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <LayoutDashboard className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">
              FeltDB Projects
            </p>
            <p className="mt-1 text-xs text-slate-500">Product workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
            <Search className="size-4 text-slate-400" />
            <input
              className="w-44 bg-transparent text-sm outline-none placeholder:text-slate-400"
              placeholder="Search tasks"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <CircleUserRound className="size-8 text-slate-500" />
        </div>
      </header>

      <main className="px-5 py-7 lg:px-8">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
              Product development
            </p>
            <h1 className="text-3xl font-bold tracking-tight">Launch board</h1>
            <p className="mt-2 text-sm text-slate-500">
              Drag work between columns. Every change persists on the FeltDB
              server.
            </p>
          </div>
          <button
            className="hidden items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 sm:flex"
            onClick={() => setNewTaskColumn(data?.columns[0]?.id ?? "backlog")}
          >
            <Plus className="size-4" /> New task
          </button>
        </div>

        {isLoading && <p className="text-sm text-slate-500">Loading board…</p>}
        {error && (
          <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
            The board could not connect to FeltDB. Is the Node server running?
          </p>
        )}

        <div className="grid items-start gap-4 xl:grid-cols-4">
          {data?.columns.map((column) => {
            const columnTasks = data.tasks.filter(
              (task) => task.columnId === column.id && matchesSearch(task),
            );
            return (
              <section
                key={column.id}
                className="min-h-44 rounded-2xl border border-slate-200 bg-slate-100/70 p-3"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const taskId = event.dataTransfer.getData("text/kanban-task");
                  if (taskId)
                    relocateTask.mutate({ taskId, columnId: column.id });
                }}
              >
                <div className="mb-3 flex items-center justify-between px-1 py-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-2 rounded-full ${columnAccent[column.id] ?? "bg-indigo-500"}`}
                    />
                    <h2 className="text-sm font-semibold">{column.title}</h2>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">
                      {columnTasks.length}
                    </span>
                  </div>
                  <MoreHorizontal className="size-4 text-slate-400" />
                </div>

                <div className="space-y-3">
                  {columnTasks.map((task) => (
                    <article
                      key={task.id}
                      draggable
                      onDragStart={(event) =>
                        event.dataTransfer.setData("text/kanban-task", task.id)
                      }
                      className="group cursor-grab rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-semibold leading-5">
                          {task.title}
                        </h3>
                        <button
                          aria-label={`Delete ${task.title}`}
                          className="text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                          onClick={() => removeTask.mutate(task.id)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      {task.description && (
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          {task.description}
                        </p>
                      )}
                      {task.assignee && (
                        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
                          <span className="grid size-6 place-items-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                            {task.assignee.slice(0, 2).toUpperCase()}
                          </span>
                          {task.assignee}
                        </div>
                      )}
                    </article>
                  ))}
                </div>

                {newTaskColumn === column.id ? (
                  <form
                    className="mt-3 rounded-xl border border-indigo-200 bg-white p-3 shadow-sm"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const title = newTaskTitle.trim();
                      if (title) addTask.mutate({ columnId: column.id, title });
                    }}
                  >
                    <input
                      autoFocus
                      className="w-full text-sm outline-none placeholder:text-slate-400"
                      placeholder="What needs doing?"
                      value={newTaskTitle}
                      onChange={(event) => setNewTaskTitle(event.target.value)}
                    />
                    <div className="mt-3 flex gap-2">
                      <button className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">
                        Add task
                      </button>
                      <button
                        type="button"
                        className="px-2 text-xs text-slate-500"
                        onClick={() => setNewTaskColumn(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-500 hover:bg-white hover:text-slate-900"
                    onClick={() => setNewTaskColumn(column.id)}
                  >
                    <Plus className="size-4" /> Add task
                  </button>
                )}
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Index;
