import TodoList from "../components/TodoList";
import { useTags } from "../hooks/useTags";
import { useTodos } from "../hooks/useTodos";

const ThisWeekPage = () => {
  const tags = useTags();
  const todos = useTodos({ list: "this-week" });

  return (
    <TodoList
      title="이번주 할 일"
      listType="this-week"
      todos={todos.todos}
      tags={tags.tags}
      loading={todos.loading || tags.loading}
      error={todos.error || tags.error}
      onAdd={todos.addTodo}
      onToggleComplete={todos.toggleComplete}
      onDelete={todos.toTrash}
      onEdit={todos.editTodo}
      onDefer={todos.deferNextWeek}
      onReorder={todos.reorder}
    />
  );
};

export default ThisWeekPage;
