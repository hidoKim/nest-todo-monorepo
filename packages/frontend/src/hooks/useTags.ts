import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { createTag, deleteTag, getTags, updateTag } from "../api/tags";
import { Tag } from "../types/Tag";

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

export const useTags = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTags();
      setTags(data);
    } catch (err) {
      setError("태그 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const runMutation = useCallback(
    async (action: () => Promise<void>, fallbackMessage: string) => {
      setError(null);
      try {
        await action();
        await fetchTags();
      } catch (err) {
        setError(getErrorMessage(err, fallbackMessage));
      }
    },
    [fetchTags],
  );

  useEffect(() => {
    void fetchTags();
  }, [fetchTags]);

  const addTag = useCallback(
    async (name: string) => {
      await runMutation(async () => {
        await createTag(name);
      }, "태그를 추가하지 못했습니다.");
    },
    [runMutation],
  );

  const editTag = useCallback(
    async (id: number, name: string) => {
      await runMutation(async () => {
        await updateTag(id, name);
      }, "태그를 수정하지 못했습니다.");
    },
    [runMutation],
  );

  const removeTag = useCallback(
    async (id: number) => {
      await runMutation(async () => {
        await deleteTag(id);
      }, "태그를 삭제하지 못했습니다.");
    },
    [runMutation],
  );

  return {
    tags,
    loading,
    error,
    addTag,
    editTag,
    removeTag,
    refetch: fetchTags,
  };
};
