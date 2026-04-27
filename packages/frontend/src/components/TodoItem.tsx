import { KeyboardEvent, MouseEvent, useState } from "react";
import { Tag } from "../types/Tag";
import { Todo } from "../types/Todo";
import TagInput from "./TagInput";

interface TodoItemProps {
  todo: Todo;
  tags: Tag[];
  deferLabel?: string;
  onDefer?: (id: number) => Promise<void>;
  onToggleComplete: (todo: Todo) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onEdit: (
    id: number,
    payload: Partial<{ title: string; tag: string }>,
  ) => Promise<void>;
}

const TodoItem = ({
  todo,
  tags,
  deferLabel,
  onDefer,
  onToggleComplete,
  onDelete,
  onEdit,
}: TodoItemProps) => {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(todo.title);

  const handleContextMenu = (e: MouseEvent<HTMLDivElement>) => {
    if (!deferLabel || !onDefer) {
      return;
    }
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  };

  const startEdit = () => {
    setDraftTitle(todo.title);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setDraftTitle(todo.title);
  };

  const saveEdit = async () => {
    const next = draftTitle.trim();
    if (next === "" || next === todo.title) {
      cancelEdit();
      return;
    }
    await onEdit(todo.id, { title: next });
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void saveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  return (
    <div
      className="relative rounded-lg border border-muji-line bg-muji-panel px-3 py-3"
      onContextMenu={handleContextMenu}
      onMouseLeave={() => setMenu(null)}
    >
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
        <label className="inline-flex flex-1 items-center gap-2 text-sm leading-6">
          <input
            className="h-4 w-4 rounded border-muji-line text-muji-accent focus:ring-muji-accent"
            type="checkbox"
            checked={Boolean(todo.completedAt)}
            onChange={() => void onToggleComplete(todo)}
          />
          {isEditing ? (
            <input
              className="flex-1 rounded-md border border-muji-line bg-muji-bg px-2 py-1 text-base text-muji-text focus:outline-none focus:ring-1 focus:ring-muji-accent"
              type="text"
              value={draftTitle}
              autoFocus
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={handleEditKeyDown}
              aria-label="할 일 제목 수정"
            />
          ) : (
            <span
              className={[
                "text-base",
                todo.completedAt
                  ? "text-muji-muted line-through"
                  : "text-muji-text",
              ].join(" ")}
            >
              {todo.title}
            </span>
          )}
          {!isEditing && todo.tag ? (
            <span className="rounded-full border border-muji-accent bg-muji-bg px-2 py-0.5 text-xs text-muji-accent">
              {todo.tag}
            </span>
          ) : null}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {isEditing ? (
            <>
              <button
                className="rounded-md border border-muji-accent bg-muji-bg px-2 py-1 text-xs text-muji-accent transition hover:bg-muji-panel"
                type="button"
                onClick={() => void saveEdit()}
              >
                저장
              </button>
              <button
                className="rounded-md border border-muji-line bg-muji-panel px-2 py-1 text-xs text-muji-muted transition hover:bg-muji-bg hover:text-muji-text"
                type="button"
                onClick={cancelEdit}
              >
                취소
              </button>
            </>
          ) : (
            <>
              <TagInput
                value={todo.tag}
                tags={tags}
                onChange={(tag) => void onEdit(todo.id, { tag: tag ?? "" })}
              />
              <button
                className="rounded-md border border-muji-line bg-muji-panel px-2 py-1 text-xs text-muji-muted transition hover:bg-muji-bg hover:text-muji-text"
                type="button"
                onClick={startEdit}
              >
                수정
              </button>
              <button
                className="rounded-md border border-muji-line bg-muji-panel px-2 py-1 text-xs text-muji-muted transition hover:bg-muji-bg hover:text-muji-text"
                type="button"
                onClick={() => void onDelete(todo.id)}
              >
                삭제
              </button>
            </>
          )}
        </div>
      </div>
      {todo.content ? (
        <p className="mt-2 text-sm text-muji-muted">{todo.content}</p>
      ) : null}
      {todo.dueDate ? (
        <p className="mt-1 text-xs text-muji-muted">기한: {todo.dueDate}</p>
      ) : null}

      {menu && deferLabel && onDefer ? (
        <button
          className="fixed z-50 rounded-md border border-muji-accent bg-muji-bg px-3 py-2 text-xs text-muji-accent shadow"
          style={{ top: `${menu.y}px`, left: `${menu.x}px` }}
          type="button"
          onClick={() => {
            void onDefer(todo.id);
            setMenu(null);
          }}
        >
          {deferLabel}
        </button>
      ) : null}
    </div>
  );
};

export default TodoItem;
