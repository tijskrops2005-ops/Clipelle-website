"use client";

/**
 * The anti-spam field of the site forms: simple bots fill every input, people never see this one,
 * and the API stores nothing when it has a value. It must be display:none, not just moved off
 * screen: Chrome autofill and password managers fill focusable fields named like "website", and a
 * real visitor's message was then silently dropped as spam (found 23 Oct 2026). The JSON key stays
 * `website`; only the markup is hidden from autofill.
 */
export function Honeypot({ value, onChange }: { value?: string; onChange?: (value: string) => void }) {
  return (
    <input
      type="text"
      name="website"
      hidden
      aria-hidden
      tabIndex={-1}
      autoComplete="off"
      data-1p-ignore
      data-lpignore="true"
      data-bwignore
      data-form-type="other"
      {...(onChange ? { value: value ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value) } : { defaultValue: "" })}
    />
  );
}
