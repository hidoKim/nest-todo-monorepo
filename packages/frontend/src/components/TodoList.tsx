import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { useMemo, useState } from "react";
import { Tag } from "../types/Tag";
import { ReorderItem, Todo, TodoListType } from "../types/Todo";
import SubTodoItem from "./SubTodoItem";
import TodoItem from "./TodoItem";

interface TodoListProps {
  title: string;
  subtitle?: string;
  listType?: TodoListType;
  enableReorder?: boolean;
  todos: Todo[];
  tags: Tag[];
  loading: boolean;
  error: string | null;
  onAdd: (payload: {
    title: string;
    content?: string;
    dueDate?: string;
    tag?: string;
  }) => Promise<void>;
  onToggleComplete: (todo: Todo) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onEdit: (
    id: number,
    payload: Partial<{ title: string; tag: string }>,
  ) => Promise<void>;
  onDefer?: (id: number) => Promise<void>;
  onReorder: (items: ReorderItem[]) => Promise<void>;
}

const TodoList = ({
  title,
  subtitle,
  listType,
  enableReorder,
  todos,
  tags,
  loading,
  error,
  onAdd,
  onToggleComplete,
  onDelete,
  onEdit,
  onDefer,
  onReorder,
}: TodoListProps) => {
  const [form, setForm] = useState({
    title: "",
    content: "",
    dueDate: "",
    tag: "",
  });

  const parents = useMemo(
    () =>
      todos.filter((todo) => !todo.parentId).sort((a, b) => a.order - b.order),
    [todos],
  );

  const childrenMap = useMemo(() => {
    const map = new Map<number, Todo[]>();
    todos
      .filter((todo) => Boolean(todo.parentId))
      .sort((a, b) => a.order - b.order)
      .forEach((child) => {
        const parentId = child.parentId as number;
        const arr = map.get(parentId) ?? [];
        arr.push(child);
        map.set(parentId, arr);
      });
    return map;
  }, [todos]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.title.trim()) {
      return;
    }
    await onAdd({
      title: form.title.trim(),
      content: form.content.trim() || undefined,
      dueDate: form.dueDate.trim() || undefined,
      tag: form.tag || undefined,
    });
    setForm({ title: "", content: "", dueDate: "", tag: "" });
  };

  const onDragEnd = (sourceIndex: number, destinationIndex: number) => {
    if (sourceIndex === destinationIndex) {
      return;
    }

    const ordered = [...parents];
    const fromIndex = sourceIndex;
    const toIndex = destinationIndex;
    const [dragged] = ordered.splice(fromIndex, 1);
    ordered.splice(toIndex, 0, dragged);

    const reorderItems: ReorderItem[] = ordered.map((item, index) => ({
      id: item.id,
      order: index,
    }));

    void onReorder(reorderItems);
  };

  return (
    <section>
      <div className="mb-5 border-b border-muji-line pb-4">
        <p className="text-xs uppercase tracking-[0.18em] text-muji-muted">
          {subtitle ?? "Simple Todo List"}
        </p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-muji-text">
          {title}
        </h2>
      </div>

      <form
        className="mb-5 grid grid-cols-1 gap-2 md:grid-cols-[1.4fr_1.2fr_1fr_1fr_auto]"
        onSubmit={submit}
      >
        <input
          className="rounded-md border border-muji-line bg-muji-panel px-3 py-2 text-sm outline-none transition focus:border-muji-accent"
          placeholder="새 할 일"
          value={form.title}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, title: e.target.value }))
          }
        />
        <input
          className="rounded-md border border-muji-line bg-muji-panel px-3 py-2 text-sm outline-none transition focus:border-muji-accent"
          placeholder="메모 (선택)"
          value={form.content}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, content: e.target.value }))
          }
        />
        <input
          className="rounded-md border border-muji-line bg-muji-panel px-3 py-2 text-sm outline-none transition focus:border-muji-accent"
          placeholder="기한 (예: 03/25 (수))"
          value={form.dueDate}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, dueDate: e.target.value }))
          }
        />
        <select
          className="rounded-md border border-muji-line bg-muji-panel px-3 py-2 text-sm outline-none transition focus:border-muji-accent"
          value={form.tag}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, tag: e.target.value }))
          }
        >
          <option value="">태그 없음</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.name}>
              {tag.name}
            </option>
          ))}
        </select>
        <button
          className="rounded-md border border-muji-accent bg-muji-accent px-4 py-2 text-sm text-muji-panel transition hover:opacity-90"
          type="submit"
        >
          추가
        </button>
      </form>

      {loading ? <p className="text-sm text-muji-muted">로딩 중...</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {enableReorder ? (
        <DragDropContext
          onDragEnd={(result) => {
            if (!result.destination) {
              return;
            }
            onDragEnd(result.source.index, result.destination.index);
          }}
        >
          <Droppable droppableId="todo-parents">
            {(provided) => (
              <div
                className="grid gap-2"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {parents.map((todo, index) => (
                  <Draggable
                    key={todo.id}
                    draggableId={String(todo.id)}
                    index={index}
                  >
                    {(dragProvided) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                      >
                        <TodoItem
                          todo={todo}
                          tags={tags}
                          deferLabel={
                            listType === "today"
                              ? "미루기 (내일로)"
                              : listType === "this-week"
                                ? "미루기 (다음주로)"
                                : undefined
                          }
                          onDefer={onDefer}
                          onToggleComplete={onToggleComplete}
                          onDelete={onDelete}
                          onEdit={onEdit}
                        />
                        {(childrenMap.get(todo.id) ?? []).map((child) => (
                          <SubTodoItem
                            key={child.id}
                            todo={child}
                            onToggleComplete={onToggleComplete}
                          />
                        ))}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <div className="grid gap-2">
          {parents.map((todo) => (
            <div key={todo.id}>
              <TodoItem
                todo={todo}
                tags={tags}
                deferLabel={
                  listType === "today"
                    ? "미루기 (내일로)"
                    : listType === "this-week"
                      ? "미루기 (다음주로)"
                      : undefined
                }
                onDefer={onDefer}
                onToggleComplete={onToggleComplete}
                onDelete={onDelete}
                onEdit={onEdit}
              />
              {(childrenMap.get(todo.id) ?? []).map((child) => (
                <SubTodoItem
                  key={child.id}
                  todo={child}
                  onToggleComplete={onToggleComplete}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default TodoList;
