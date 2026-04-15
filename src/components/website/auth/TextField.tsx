"use client"

import { useId } from "react"
import { cn } from "@/lib/cn"

type TextFieldProps = {
  id?: string
  name: string
  label: string
  type?: "text" | "email"
  autoComplete: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  error?: string
  required?: boolean
  placeholder?: string
}

export default function TextField({ id: idProp, name, label, type = "text", autoComplete, value, onChange, onBlur, error, required, placeholder }: TextFieldProps) {
  const genId = useId()
  const id = idProp ?? `${genId}-field`
  const errId = `${id}-error`
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-800">{label}{required ? <span className="text-red-600"> *</span> : null}</label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        inputMode={type === "email" ? "email" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errId : undefined}
        className={cn(
          "w-full rounded-lg border bg-white px-3 py-3 text-base text-slate-900 outline-none transition-shadow placeholder:text-slate-400 focus:ring-2 focus:ring-web-brand/40",
          error ? "border-red-500 focus:border-red-500 focus:ring-red-500/30" : "border-slate-300 focus:border-web-brand"
        )}
        required={required}
      />
      {error ? (
        <p id={errId} role="alert" className="text-sm text-red-600">{error}</p>
      ) : null}
    </div>
  )
}
