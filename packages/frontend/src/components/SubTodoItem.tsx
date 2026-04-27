import { Todo } from "../types/Todo";

interface SubTodoItemProps {
  todo: Todo;
  onToggleComplete: (todo: Todo) => Promise<void>;
}

const SubTodoItem = ({ todo, onToggleComplete }: SubTodoItemProps) => {
  return (
    <div className="ml-6 mt-2 rounded-md border border-muji-line bg-muji-panel px-3 py-2">
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          className="h-4 w-4 rounded border-muji-line text-muji-accent focus:ring-muji-accent"
          type="checkbox"
          checked={Boolean(todo.completedAt)}
          onChange={() => void onToggleComplete(todo)}
        />
        <span
          className={
            todo.completedAt ? "text-muji-muted line-through" : "text-muji-text"
          }
        >
          {todo.title}
        </span>
      </label>
      {todo.tag ? (
        <span className="ml-2 rounded-full border border-muji-accent bg-muji-bg px-2 py-0.5 text-xs text-muji-accent">
          {todo.tag}
        </span>
      ) : null}
    </div>
  );
};

export default SubTodoItem;
