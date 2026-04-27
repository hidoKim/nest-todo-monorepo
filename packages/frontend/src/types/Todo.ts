export type TodoListType = "today" | "tomorrow" | "this-week" | "next-week";

export interface Todo {
  id: number;
  title: string;
  content: string | null;
  completedAt: string | null;
  deletedAt: string | null;
  trashedAt: string | null;
  parentId: number | null;
  order: number;
  dueDate: string | null;
  targetDate: string;
  tag: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReorderItem {
  id: number;
  order: number;
}
