import { FormEvent, useState } from "react";
import TagList from "../components/TagList";
import { useTags } from "../hooks/useTags";
import { useTodos } from "../hooks/useTodos";

const TagsPage = () => {
  const [newTag, setNewTag] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const tags = useTags();
  const todos = useTodos({ tag: selectedTag || undefined });

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newTag.trim()) {
      return;
    }
    await tags.addTag(newTag.trim());
    setNewTag("");
  };

  return (
    <section className="note-panel">
      <h2>태그 관리</h2>
      <form className="tag-create-form" onSubmit={submit}>
        <input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="새 태그"
        />
        <button type="submit">추가</button>
      </form>

      {tags.error ? <p className="text-sm text-red-700">{tags.error}</p> : null}

      <TagList
        tags={tags.tags}
        onEdit={tags.editTag}
        onDelete={tags.removeTag}
      />

      <h3>태그별 Todo 모아보기</h3>
      <select
        value={selectedTag}
        onChange={(e) => setSelectedTag(e.target.value)}
      >
        <option value="">전체</option>
        {tags.tags.map((tag) => (
          <option key={tag.id} value={tag.name}>
            {tag.name}
          </option>
        ))}
      </select>

      <ul className="tagged-todo-list">
        {todos.todos.map((todo) => (
          <li key={todo.id}>
            <span>{todo.title}</span>
            {todo.tag ? <span className="tag-pill">{todo.tag}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default TagsPage;
