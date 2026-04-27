import TodoList from "../components/TodoList";
import { useTags } from "../hooks/useTags";
import { useTodos } from "../hooks/useTodos";

const TomorrowPage = () => {
  const tags = useTags();
  const todos = useTodos({ list: "tomorrow" });
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const subtitle = `${tomorrow.getFullYear()}.${String(tomorrow.getMonth() + 1).padStart(2, "0")}.${String(tomorrow.getDate()).padStart(2, "0")} · 내일의 노트`;

  return (
    <TodoList
      title="내일 할 일"
      subtitle={subtitle}
      listType="tomorrow"
      todos={todos.todos}
      tags={tags.tags}
      loading={todos.loading || tags.loading}
      error={todos.error || tags.error}
      onAdd={todos.addTodo}
      onToggleComplete={todos.toggleComplete}
      onDelete={todos.toTrash}
      onEdit={todos.editTodo}
      onReorder={todos.reorder}
    />
  );
};

export default TomorrowPage;
