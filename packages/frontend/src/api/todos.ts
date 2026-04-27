import { apiClient } from "./client";
import { ReorderItem, Todo, TodoListType } from "../types/Todo";

interface GetTodosParams {
  list?: TodoListType;
  tag?: string;
  keyword?: string;
}

export const getTodos = async (params?: GetTodosParams): Promise<Todo[]> => {
  const response = await apiClient.get<Todo[]>("/todos", { params });
  return response.data;
};

export const getTrashTodos = async (): Promise<Todo[]> => {
  const response = await apiClient.get<Todo[]>("/todos/trash");
  return response.data;
};

export const createTodo = async (payload: {
  title: string;
  content?: string;
  tag?: string;
  dueDate?: string;
  parentId?: number;
  listType?: TodoListType;
}): Promise<Todo> => {
  const response = await apiClient.post<Todo>("/todos", payload);
  return response.data;
};

export const updateTodo = async (
  id: number,
  payload: Partial<{
    title: string;
    content: string;
    tag: string;
    dueDate: string;
    order: number;
  }>,
): Promise<Todo> => {
  const response = await apiClient.patch<Todo>(`/todos/${id}`, payload);
  return response.data;
};

export const completeTodo = async (id: number): Promise<Todo> => {
  const response = await apiClient.post<Todo>(`/todos/${id}/complete`);
  return response.data;
};

export const incompleteTodo = async (id: number): Promise<Todo> => {
  const response = await apiClient.post<Todo>(`/todos/${id}/incomplete`);
  return response.data;
};

export const deferTodoTomorrow = async (id: number): Promise<void> => {
  await apiClient.post(`/todos/${id}/defer-to-tomorrow`);
};

export const deferTodoNextWeek = async (id: number): Promise<void> => {
  await apiClient.post(`/todos/${id}/defer-to-next-week`);
};

export const softDeleteTodo = async (id: number): Promise<void> => {
  await apiClient.delete(`/todos/${id}`);
};

export const moveTodoToTrash = async (id: number): Promise<void> => {
  await apiClient.post(`/todos/${id}/to-trash`);
};

export const restoreTodo = async (id: number): Promise<void> => {
  await apiClient.post(`/todos/${id}/restore`);
};

export const permanentDeleteTodo = async (id: number): Promise<void> => {
  await apiClient.delete(`/todos/${id}/permanent`);
};

export const reorderTodos = async (items: ReorderItem[]): Promise<void> => {
  await apiClient.post("/todos/reorder", { items });
};
