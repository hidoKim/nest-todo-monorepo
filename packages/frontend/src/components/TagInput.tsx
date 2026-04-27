import { Tag } from "../types/Tag";

interface TagInputProps {
  value: string | null;
  tags: Tag[];
  onChange: (value: string | null) => void;
}

const TagInput = ({ value, tags, onChange }: TagInputProps) => {
  return (
    <select
      className="rounded-md border border-muji-line bg-white px-2 py-1 text-xs text-muji-text outline-none transition focus:border-muji-accent"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">태그 없음</option>
      {tags.map((tag) => (
        <option key={tag.id} value={tag.name}>
          {tag.name}
        </option>
      ))}
    </select>
  );
};

export default TagInput;
