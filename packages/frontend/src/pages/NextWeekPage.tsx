import TodoList from "../components/TodoList";
import { useTags } from "../hooks/useTags";
import { useTodos } from "../hooks/useTodos";

const NextWeekPage = () => {
  const tags = useTags();
  const todos = useTodos({ list: "next-week" });

  return (
    <TodoList
      title="다음주 할 일"
      listType="next-week"
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

export default NextWeekPage;
