"use client";

import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { CleanVideo } from "@/components/ui/CleanVideo";
import { Clapperboard, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type UploadedVideo = {
  file: File;
  /** Object URL for the preview. Revoked on remove. */
  previewUrl: string;
  /** Read from the file's metadata once the browser has it. */
  seconds?: number;
};

type VideoDropzoneProps = {
  id?: string;
  video: UploadedVideo | null;
  onChange: (video: UploadedVideo | null) => void;
  maxSizeMb: number;
  maxSeconds?: number;
  invalid?: boolean;
  disabled?: boolean;
  /** Plain-language reason a file was not accepted. */
  onReject?: (message: string) => void;
};

const ACCEPTED = ["video/mp4", "video/webm", "video/quicktime"];

export function formatBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(mb >= 10 ? 0 : 1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function formatDuration(seconds: number) {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

/**
 * Single-video picker with a live preview and duration read-out.
 * Checks the size limit before anything is uploaded and explains it in plain language.
 */
export function VideoDropzone({
  id,
  video,
  onChange,
  maxSizeMb,
  maxSeconds,
  invalid,
  disabled,
  onReject,
}: VideoDropzoneProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // Revoke the object URL when the video changes or the component unmounts.
  const previewUrl = video?.previewUrl;
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function accept(file: File) {
    if (!ACCEPTED.includes(file.type) && !/\.(mp4|webm|mov)$/i.test(file.name)) {
      onReject?.(`${file.name} is not a video we can use. Choose an MP4, WebM or MOV file.`);
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      onReject?.(
        `${file.name} is ${formatBytes(file.size)}. Right now we accept videos up to ${maxSizeMb} MB. ` +
          "Trim the video or export it at a lower bitrate and try again. Support for larger files comes later.",
      );
      return;
    }
    onChange({ file, previewUrl: URL.createObjectURL(file) });
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = event.dataTransfer.files[0];
    if (file) accept(file);
  }

  if (video) {
    const tooLong = maxSeconds !== undefined && video.seconds !== undefined && video.seconds > maxSeconds;
    return (
      <div className="flex flex-col gap-4 rounded-[14px] bg-surface-muted p-4 sm:flex-row">
        <div className="relative mx-auto aspect-[9/16] w-full max-w-[160px] shrink-0 overflow-hidden rounded-[12px] bg-ink shadow-card sm:mx-0">
          <CleanVideo
            src={video.previewUrl}
            preload="metadata"
            muted
            aria-label={`Preview of ${video.file.name}`}
            videoClassName="object-contain"
            onLoadedMetadata={(e) => {
              const seconds = e.currentTarget.duration;
              if (Number.isFinite(seconds) && video.seconds === undefined) onChange({ ...video, seconds });
            }}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium text-ink">{video.file.name}</p>
              <p className="label-mono mt-1 text-muted">
                {formatBytes(video.file.size)}
                {video.seconds !== undefined ? ` · ${formatDuration(video.seconds)}` : " · reading length…"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={disabled}
              aria-label={`Remove ${video.file.name}`}
              className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-ink shadow-card hover:bg-ink hover:text-surface disabled:opacity-50"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
          {tooLong ? (
            <p role="alert" className="text-[13px] text-danger">
              This video is {formatDuration(video.seconds!)} long. For now we translate videos up to {formatDuration(maxSeconds!)}. Trim it and try again.
            </p>
          ) : (
            <p className="text-[13px] text-muted">
              One clearly audible speaker works best. Text burned into the video is not translated.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
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
        <Clapperboard className="size-5" aria-hidden />
      </span>
      <p className="mt-4 text-[15px] font-medium text-ink">Drop your video here, or click to choose</p>
      <p className="mt-1 text-[13px] text-muted">
        MP4, WebM or MOV, up to {maxSizeMb} MB{maxSeconds ? ` and ${formatDuration(maxSeconds)}` : ""}. Any aspect ratio; we make it 9:16.
      </p>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) accept(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
