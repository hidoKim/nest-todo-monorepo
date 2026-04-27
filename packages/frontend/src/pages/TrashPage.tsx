import { useTodos } from "../hooks/useTodos";

const TrashPage = () => {
  const trash = useTodos({ trash: true });

  return (
    <section>
      <div className="mb-5 border-b border-muji-line pb-4">
        <p className="text-xs uppercase tracking-[0.18em] text-muji-muted">
          30일 보관 후 자동 삭제
        </p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-muji-text">
          휴지통
        </h2>
      </div>
      {trash.loading ? (
        <p className="text-sm text-muji-muted">로딩 중...</p>
      ) : null}
      {trash.error ? (
        <p className="text-sm text-red-700">{trash.error}</p>
      ) : null}
      <ul className="grid gap-2">
        {trash.todos.map((todo) => (
          <li
            key={todo.id}
            className="flex items-center justify-between rounded-md border border-muji-line bg-muji-panel px-3 py-2"
          >
            <div>
              <strong className="text-sm text-muji-text">{todo.title}</strong>
              {todo.tag ? (
                <span className="ml-2 rounded-full border border-muji-accent bg-muji-bg px-2 py-0.5 text-xs text-muji-accent">
                  {todo.tag}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md border border-muji-line bg-muji-panel px-2 py-1 text-xs text-muji-muted transition hover:bg-muji-bg hover:text-muji-text"
                type="button"
                onClick={() => void trash.restore(todo.id)}
              >
                복원
              </button>
              <button
                className="rounded-md border border-muji-accent bg-muji-bg px-2 py-1 text-xs text-muji-accent transition hover:opacity-90"
                type="button"
                onClick={() => void trash.permanentDelete(todo.id)}
              >
                완전 삭제
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default TrashPage;
