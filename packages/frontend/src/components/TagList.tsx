import { KeyboardEvent, useState } from "react";
import { Tag } from "../types/Tag";

interface TagListProps {
  tags: Tag[];
  onEdit: (id: number, name: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const TagList = ({ tags, onEdit, onDelete }: TagListProps) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setDraftName(tag.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftName("");
  };

  const saveEdit = async (tag: Tag) => {
    const next = draftName.trim();
    if (next === "" || next === tag.name) {
      cancelEdit();
      return;
    }
    await onEdit(tag.id, next);
    cancelEdit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, tag: Tag) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void saveEdit(tag);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  return (
    <ul className="tag-list">
      {tags.map((tag) => {
        const isEditing = editingId === tag.id;
        return (
          <li key={tag.id}>
            {isEditing ? (
              <input
                type="text"
                value={draftName}
                autoFocus
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, tag)}
                aria-label="태그 이름 수정"
              />
            ) : (
              <span>{tag.name}</span>
            )}
            <div>
              {isEditing ? (
                <>
                  <button type="button" onClick={() => void saveEdit(tag)}>
                    저장
                  </button>
                  <button type="button" onClick={cancelEdit}>
                    취소
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => startEdit(tag)}>
                    수정
                  </button>
                  <button type="button" onClick={() => void onDelete(tag.id)}>
                    삭제
                  </button>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default TagList;
