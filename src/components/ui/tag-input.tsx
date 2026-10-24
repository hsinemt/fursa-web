"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { addTags } from "@/lib/profile/values";
import { cn } from "@/lib/utils/cn";
import { ICON_SM, iconProps } from "./icon";

/** What ends an item: a comma, a semicolon (Latin or Arabic) or a new line. */
const SEPARATORS = /[,;\n\r،؛]/;

type TagInputProps = {
  /** Ties the visible label to the field. */
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
  max: number;
  placeholder?: string;
  disabled?: boolean;
  /** The id of a hint under the label, read with the field. */
  describedBy?: string;
};

/**
 * A list typed one item at a time. Enter or a comma adds the item; Backspace on an empty
 * field removes the last one; text left in the field is added when it loses focus; pasted
 * text with commas or new lines becomes several items; a duplicate is ignored.
 */
export function TagInput({
  id,
  value,
  onChange,
  max,
  placeholder,
  disabled,
  describedBy,
}: TagInputProps) {
  const t = useTranslations("profile.tags");
  const noteId = useId();
  const [text, setText] = useState("");
  const [full, setFull] = useState(false);

  function commit(raw: string) {
    if (!raw.trim()) return;
    const result = addTags(value, raw, max);
    setFull(result.full);
    if (result.list.length !== value.length) onChange(result.list);
    setText("");
  }

  function remove(index: number) {
    setFull(false);
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div
        className={cn(
          "flex min-h-10 w-full flex-wrap items-center gap-1 rounded-control border border-control bg-panel p-1",
          "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent",
          disabled && "opacity-60",
        )}
      >
        {value.map((tag, index) => (
          <span
            key={tag}
            dir="auto"
            className="inline-flex items-center gap-1 rounded-chip bg-tint py-1 ps-2 pe-1 text-sm text-accent"
          >
            {tag}
            <button
              type="button"
              disabled={disabled}
              aria-label={t("remove", { name: tag })}
              onClick={() => remove(index)}
              className="inline-flex size-5 items-center justify-center rounded-chip hover:bg-line pointer-coarse:size-8"
            >
              <X width={ICON_SM - 4} height={ICON_SM - 4} {...iconProps} />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          disabled={disabled}
          placeholder={value.length === 0 ? placeholder : undefined}
          aria-describedby={[describedBy, noteId].filter(Boolean).join(" ")}
          dir="auto"
          autoComplete="off"
          onChange={(event) => {
            const next = event.target.value;
            if (SEPARATORS.test(next)) commit(next);
            else setText(next);
          }}
          onPaste={(event) => {
            // A single-line field flattens new lines, so a pasted list is split here instead.
            const pasted = event.clipboardData.getData("text");
            if (!SEPARATORS.test(pasted)) return;
            event.preventDefault();
            commit(`${text} ${pasted}`);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault(); // Enter adds an item; it must not submit the form
              commit(text);
            } else if (event.key === "Backspace" && text === "" && value.length > 0) {
              remove(value.length - 1);
            }
          }}
          onBlur={() => commit(text)}
          className="h-8 min-w-32 flex-1 bg-transparent px-2 text-base text-ink outline-none placeholder:text-slate pointer-coarse:h-10"
        />
      </div>
      <p id={noteId} className="tabular mt-1 text-sm text-slate">
        {full ? t("full", { max }) : t("count", { count: value.length, max })}
      </p>
    </div>
  );
}
