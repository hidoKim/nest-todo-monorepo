import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import {
  completeTodo,
  createTodo,
  deferTodoNextWeek,
  deferTodoTomorrow,
  getTodos,
  getTrashTodos,
  incompleteTodo,
  moveTodoToTrash,
  permanentDeleteTodo,
  reorderTodos,
  restoreTodo,
  softDeleteTodo,
  updateTodo,
} from "../api/todos";
import { ReorderItem, Todo, TodoListType } from "../types/Todo";

interface UseTodosParams {
  list?: TodoListType;
  tag?: string;
  keyword?: string;
  trash?: boolean;
}

export const useTodos = (params: UseTodosParams = {}) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = params.trash
        ? await getTrashTodos()
        : await getTodos({
            list: params.list,
            tag: params.tag,
            keyword: params.keyword,
          });
      setTodos(data);
    } catch (err) {
      setError("할 일 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [params.keyword, params.list, params.tag, params.trash]);

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (isAxiosError(err)) {
      const message = err.response?.data?.message;
      if (Array.isArray(message)) {
        return message.join(", ");
      }
      if (typeof message === "string" && message.trim().length > 0) {
        return message;
      }
      if (typeof err.message === "string" && err.message.trim().length > 0) {
        return err.message;
      }
    }
    return fallback;
  };

  const runMutation = useCallback(
    async (action: () => Promise<void>, fallbackMessage: string) => {
      setError(null);
      try {
        await action();
        await fetchTodos();
      } catch (err) {
        setError(getErrorMessage(err, fallbackMessage));
      }
    },
    [fetchTodos],
  );

  useEffect(() => {
    void fetchTodos();
  }, [fetchTodos]);

  const addTodo = useCallback(
    async (payload: {
      title: string;
      content?: string;
      tag?: string;
      dueDate?: string;
      parentId?: number;
    }) => {
      await runMutation(async () => {
        await createTodo({ ...payload, listType: params.list });
      }, "할 일을 추가하지 못했습니다.");
    },
    [params.list, runMutation],
  );

  const toggleComplete = useCallback(
    async (todo: Todo) => {
      await runMutation(async () => {
        if (todo.completedAt) {
          await incompleteTodo(todo.id);
        } else {
          await completeTodo(todo.id);
        }
      }, "완료 상태를 변경하지 못했습니다.");
    },
    [runMutation],
  );

  const deferTomorrow = useCallback(
    async (id: number) => {
      await runMutation(async () => {
        await deferTodoTomorrow(id);
      }, "내일로 미루지 못했습니다.");
    },
    [runMutation],
  );

  const deferNextWeek = useCallback(
    async (id: number) => {
      await runMutation(async () => {
        await deferTodoNextWeek(id);
      }, "다음주로 미루지 못했습니다.");
    },
    [runMutation],
  );

  const softDelete = useCallback(
    async (id: number) => {
      await runMutation(async () => {
        await softDeleteTodo(id);
      }, "할 일을 삭제하지 못했습니다.");
    },
    [runMutation],
  );

  const toTrash = useCallback(
    async (id: number) => {
      await runMutation(async () => {
        await moveTodoToTrash(id);
      }, "휴지통으로 이동하지 못했습니다.");
    },
    [runMutation],
  );

  const restore = useCallback(
    async (id: number) => {
      await runMutation(async () => {
        await restoreTodo(id);
      }, "복원하지 못했습니다.");
    },
    [runMutation],
  );

  const permanentDelete = useCallback(
    async (id: number) => {
      await runMutation(async () => {
        await permanentDeleteTodo(id);
      }, "완전 삭제하지 못했습니다.");
    },
    [runMutation],
  );

  const reorder = useCallback(
    async (items: ReorderItem[]) => {
      await runMutation(async () => {
        await reorderTodos(items);
      }, "순서를 변경하지 못했습니다.");
    },
    [runMutation],
  );

  const editTodo = useCallback(
    async (
      id: number,
      payload: Partial<{
        title: string;
        content: string;
        tag: string;
        dueDate: string;
        order: number;
      }>,
    ) => {
      await runMutation(async () => {
        await updateTodo(id, payload);
      }, "할 일을 수정하지 못했습니다.");
    },
    [runMutation],
  );

  return {
    todos,
    loading,
    error,
    addTodo,
    editTodo,
    toggleComplete,
    deferTomorrow,
    deferNextWeek,
    softDelete,
    toTrash,
    restore,
    permanentDelete,
    reorder,
    refetch: fetchTodos,
  };
};
