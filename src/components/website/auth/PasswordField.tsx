"use client"

import { useId, useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/cn"

type PasswordFieldProps = {
  id?: string
  name: string
  label: string
  autoComplete: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  error?: string
  required?: boolean
}

export default function PasswordField({ id: idProp, name, label, autoComplete, value, onChange, onBlur, error, required }: PasswordFieldProps) {
  const genId = useId()
  const id = idProp ?? `${genId}-password`
  const errId = `${id}-error`
  const [visible, setVisible] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-800">{label}{required ? <span className="text-red-600"> *</span> : null}</label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? errId : undefined}
          className={cn(
            "w-full rounded-lg border bg-white py-3 pl-3 pr-12 text-base text-slate-900 outline-none transition-shadow placeholder:text-slate-400 focus:ring-2 focus:ring-web-brand/40",
            error ? "border-red-500 focus:border-red-500 focus:ring-red-500/30" : "border-slate-300 focus:border-web-brand"
          )}
          required={required}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
        </button>
      </div>
      {error ? (
        <p id={errId} role="alert" className="text-sm text-red-600">{error}</p>
      ) : null}
    </div>
  )
}
