"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type UploadedImage = {
  id: string;
  file: File;
  /** Object URL for the live preview while editing. Revoked on remove. */
  previewUrl: string;
};

type UploadDropzoneProps = {
  id?: string;
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  max?: number;
  maxSizeMb?: number;
  invalid?: boolean;
  disabled?: boolean;
  onReject?: (message: string) => void;
};

/**
 * Click-or-drop image picker with local previews.
 * In demo mode nothing leaves the browser; Stage 8 adds real uploads behind the same props.
 */
export function UploadDropzone({
  id,
  images,
  onChange,
  max = 5,
  maxSizeMb = 10,
  invalid,
  disabled,
  onReject,
}: UploadDropzoneProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list);
    const accepted: UploadedImage[] = [];
    const problems: string[] = [];

    for (const file of incoming) {
      if (!file.type.startsWith("image/")) {
        problems.push(`${file.name} is not an image.`);
        continue;
      }
      if (file.size > maxSizeMb * 1024 * 1024) {
        problems.push(`${file.name} is larger than ${maxSizeMb} MB.`);
        continue;
      }
      if (images.length + accepted.length >= max) {
        problems.push(`You can add up to ${max} images.`);
        break;
      }
      accepted.push({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (accepted.length) onChange([...images, ...accepted]);
    if (problems.length && onReject) onReject(problems[0]);
  }

  function remove(target: UploadedImage) {
    URL.revokeObjectURL(target.previewUrl);
    onChange(images.filter((img) => img.id !== target.id));
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    addFiles(event.dataTransfer.files);
  }

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-[14px] border border-dashed px-6 py-10 text-center transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20",
          dragging ? "border-ink bg-ink/5" : "bg-surface-muted hover:bg-surface-muted/70",
          invalid ? "border-danger" : "border-border",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span className="grid size-12 place-items-center rounded-full bg-surface text-ink shadow-card">
          <ImagePlus className="size-5" aria-hidden />
        </span>
        <p className="mt-4 text-[15px] font-medium text-ink">
          Drop product images here, or click to choose
        </p>
        <p className="mt-1 text-[13px] text-muted">
          PNG or JPG, up to {maxSizeMb} MB each, max {max} images. Clear photos on a plain background work best.
        </p>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = ""; // allow re-selecting the same file
          }}
        />
      </div>

      {images.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {images.map((img) => (
            <li
              key={img.id}
              className="group relative aspect-square overflow-hidden rounded-[12px] bg-surface-muted shadow-card"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
              <img
                src={img.previewUrl}
                alt={img.file.name}
                className="size-full object-cover"
              />
              <button
                type="button"
                onClick={() => remove(img)}
                disabled={disabled}
                aria-label={`Remove ${img.file.name}`}
                className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-surface text-ink shadow-card transition-opacity hover:bg-ink hover:text-surface"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
