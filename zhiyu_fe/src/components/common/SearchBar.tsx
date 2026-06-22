import { useState, type ChangeEvent } from "react";
import { Search as SearchIcon } from "lucide-react";
import Button from "@/components/ui/Button";
import styles from "./SearchBar.module.css";

type SearchBarProps = {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  buttonLabel?: string;
  suggestions?: string[];
  suggestLoading?: boolean;
  onSuggestionClick?: (value: string) => void;
};

const SearchBar = ({
  placeholder,
  value,
  onChange,
  onSubmit,
  buttonLabel = "搜索",
  suggestions = [],
  suggestLoading = false,
  onSuggestionClick,
}: SearchBarProps) => {
  const [focused, setFocused] = useState(false);
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className={styles.wrapper}>
      <SearchIcon
        size={20}
        strokeWidth={2.5}
        className={styles.icon}
        aria-hidden
      />
      <input
        className={styles.input}
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        onKeyDown={e => {
          if (e.key === "Enter") onSubmit?.();
        }}
      />
      <Button
        variant="primary"
        size="sm"
        onClick={onSubmit}
        type="button"
        className={styles.button}
      >
        {buttonLabel}
      </Button>

      {focused && (value?.trim()?.length ?? 0) > 0 && (
        <div className={styles.dropdown}>
          {suggestLoading ? (
            <div className={styles.dropdownEmpty}>加载中…</div>
          ) : suggestions?.length ? (
            suggestions.map(s => (
              <div
                key={s}
                className={styles.dropdownItem}
                onMouseDown={() => onSuggestionClick?.(s)}
              >
                {s}
              </div>
            ))
          ) : (
            <div className={styles.dropdownEmpty}>无联想结果</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;