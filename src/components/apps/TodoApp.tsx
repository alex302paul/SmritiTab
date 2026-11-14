import { Check, CheckSquare, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useSmriti } from "../../context/SmritiContext";
import type { TodoPriority } from "../../types/smrititab";

const PRIORITY_RANK: Record<TodoPriority, number> = { high: 0, medium: 1, low: 2 };
const PRIORITY_ORDER: TodoPriority[] = ["low", "medium", "high"];

export function TodoApp() {
  const { todos, addTodo, toggleTodo, updateTodo, deleteTodo } = useSmriti();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("medium");
  const [due, setDue] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");

  const filtered = useMemo(() => {
    return [...todos]
      .filter((t) => (filter === "active" ? !t.done : filter === "done" ? t.done : true))
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) {
          return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        }
        return b.createdAt - a.createdAt;
      });
  }, [todos, filter]);

  const doneCount = todos.filter((t) => t.done).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTodo({ title: title.trim(), priority, due: due || null });
    setTitle("");
    setDue("");
    setPriority("medium");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <form
        onSubmit={handleSubmit}
        className="space-y-2 border-b border-slate-900/10 p-3 dark:border-white/10"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a task…"
            aria-label="Task title"
            className="min-w-0 flex-1 rounded-xl border border-slate-900/10 bg-white/70 px-3 py-1.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TodoPriority)}
            aria-label="Task priority"
            className="rounded-xl border border-slate-900/10 bg-white/70 px-2.5 py-1 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200"
          >
            <option value="high">High priority</option>
            <option value="medium">Medium priority</option>
            <option value="low">Low priority</option>
          </select>
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            aria-label="Due date"
            className="rounded-xl border border-slate-900/10 bg-white/70 px-2.5 py-1 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200"
          />
        </div>
      </form>

      <div className="flex items-center gap-1 border-b border-slate-900/10 px-3 py-2 dark:border-white/10">
        {(["all", "active", "done"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            aria-pressed={filter === tab}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition ${
              filter === tab
                ? "bg-indigo-600 text-white"
                : "text-slate-500 hover:bg-slate-900/5 dark:text-slate-400 dark:hover:bg-white/10"
            }`}
          >
            {tab}
          </button>
        ))}
        <span className="ml-auto text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
          {doneCount}/{todos.length} done
        </span>
        {doneCount > 0 && (
          <button
            type="button"
            onClick={() => todos.filter((t) => t.done).forEach((t) => deleteTodo(t.id))}
            aria-label="Clear completed tasks"
            title="Clear completed tasks"
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-500 dark:text-slate-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
            <CheckSquare className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {todos.length === 0 ? "No tasks yet" : "Nothing in this filter"}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {todos.length === 0
                ? "Add your first task above — saved automatically."
                : "Switch tabs to see other tasks."}
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {filtered.map((task) => {
              const pill =
                task.priority === "high"
                  ? "bg-rose-500/12 text-rose-500"
                  : task.priority === "low"
                    ? "bg-slate-500/12 text-slate-500 dark:text-slate-400"
                    : "bg-amber-500/12 text-amber-600 dark:text-amber-400";
              return (
                <li
                  key={task.id}
                  className="group flex items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-2 transition hover:border-slate-900/10 hover:bg-slate-900/5 dark:hover:border-white/10 dark:hover:bg-white/5"
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={task.done}
                    aria-label={`Mark "${task.title}" as ${task.done ? "not done" : "done"}`}
                    onClick={() => toggleTodo(task.id)}
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${
                      task.done
                        ? "border-transparent bg-indigo-600 text-white"
                        : "border-slate-400/60 text-transparent hover:border-indigo-500"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm ${
                        task.done
                          ? "text-slate-400 line-through dark:text-slate-500"
                          : "text-slate-800 dark:text-slate-100"
                      }`}
                    >
                      {task.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize ${pill}`}
                      >
                        {task.priority}
                      </span>
                      {task.due && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          due {task.due}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => {
                        const next =
                          PRIORITY_ORDER[
                            (PRIORITY_ORDER.indexOf(task.priority) + 1) % PRIORITY_ORDER.length
                          ];
                        updateTodo(task.id, { priority: next });
                      }}
                      aria-label="Cycle priority"
                      title="Cycle priority"
                      className="grid h-6 w-6 place-items-center rounded-md text-slate-500 hover:bg-slate-900/10 dark:text-slate-400 dark:hover:bg-white/10"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTodo(task.id)}
                      aria-label="Delete task"
                      title="Delete task"
                      className="grid h-6 w-6 place-items-center rounded-md text-slate-500 hover:bg-rose-500/10 hover:text-rose-500 dark:text-slate-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
