import TodoList from "../components/TodoList";
import { useTags } from "../hooks/useTags";
import { useTodos } from "../hooks/useTodos";

const TodayPage = () => {
  const tags = useTags();
  const todos = useTodos({ list: "today" });
  const now = new Date();
  const subtitle = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} · 오늘의 노트`;

  return (
    <TodoList
      title="오늘 할 일"
      subtitle={subtitle}
      listType="today"
      enableReorder
      todos={todos.todos}
      tags={tags.tags}
      loading={todos.loading || tags.loading}
      error={todos.error || tags.error}
      onAdd={todos.addTodo}
      onToggleComplete={todos.toggleComplete}
      onDelete={todos.toTrash}
      onEdit={todos.editTodo}
      onDefer={todos.deferTomorrow}
      onReorder={todos.reorder}
    />
  );
};

export default TodayPage;
