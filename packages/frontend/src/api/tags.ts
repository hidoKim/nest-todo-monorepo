import { apiClient } from "./client";
import { Tag } from "../types/Tag";

export const getTags = async (): Promise<Tag[]> => {
  const response = await apiClient.get<Tag[]>("/tags");
  return response.data;
};

export const createTag = async (name: string): Promise<Tag> => {
  const response = await apiClient.post<Tag>("/tags", { name });
  return response.data;
};

export const updateTag = async (id: number, name: string): Promise<Tag> => {
  const response = await apiClient.put<Tag>(`/tags/${id}`, { name });
  return response.data;
};

export const deleteTag = async (id: number): Promise<void> => {
  await apiClient.delete(`/tags/${id}`);
};
