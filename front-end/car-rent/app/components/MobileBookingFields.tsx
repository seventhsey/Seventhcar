"use client"

import { useEffect, useRef, useState } from "react"
import DatePicker from "react-datepicker"
import { ChevronDown, X } from "lucide-react"

const fields = [
  ["island", "Pickup location"],
  ["dropOff", "Drop-off location"],
  ["pickupDate", "Pickup date"],
  ["pickupTime", "Pickup time"],
  ["returnDate", "Return date"],
  ["returnTime", "Return time"],
] as const

type Field = typeof fields[number][0]
type Values = Record<Field, string>

const locations = [
  { value: "Mahe Airport", label: "Mahe Airport" },
  { value: "Cat Coco's Jetty", label: "Cat Coco's Jetty" },
  { value: "Other +25 Euro", label: "Other" },
]
const times = Array.from({ length: 48 }, (_, i) => {
  const value = `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`
  return { value, label: value }
})

function parseDate(value: string) {
  if (!value) return null
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export default function MobileBookingFields({ values, onChange, onNext }: {
  values: Values
  onChange: (field: Field, value: string) => void
  onNext: () => void
}) {
  const [step, setStep] = useState<number | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const nextButton = useRef<HTMLButtonElement>(null)
  const complete = useRef(false)
  const optionsPanel = useRef<HTMLDivElement>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const previousMonth = useRef<HTMLButtonElement>(null)
  const nextMonth = useRef<HTMLButtonElement>(null)
  const active = step === null ? null : fields[step]
  const field = active?.[0]

  useEffect(() => {
    if (step !== null && !dialog.current?.open) dialog.current?.showModal()
    if (step === null && dialog.current?.open) {
      dialog.current.close()
      if (complete.current) {
        nextButton.current?.focus()
        complete.current = false
      }
    }
    if (step !== null) {
      const selected = optionsPanel.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
      selected?.scrollIntoView({ block: "nearest" })
      const first = dialog.current?.querySelector<HTMLButtonElement>('[data-choice]:not(:disabled)')
      ;(selected || first || dialog.current?.querySelector<HTMLElement>("h2"))?.focus({ preventScroll: true })
    }
  }, [step])

  const choose = (value: string) => {
    if (!field || step === null) return
    onChange(field, value)
    if (step === fields.length - 1) {
      complete.current = true
      setStep(null)
    } else setStep(step + 1)
  }

  const isDate = field === "pickupDate" || field === "returnDate"
  const options = field === "island" || field === "dropOff" ? locations : times

  return (
    <div className="md:hidden">
      <div className="grid grid-cols-2 gap-3">
        {fields.map(([key, label], index) => (
          <div key={key}>
            <span id={`mobile-${key}-label`} className="block text-sm font-bold mb-1">{label}</span>
            <button
              type="button"
              aria-labelledby={`mobile-${key}-label mobile-${key}-value`}
              aria-haspopup="dialog"
              onClick={() => setStep(index)}
              className="flex min-h-[60px] w-full items-center justify-between gap-1 rounded-md bg-[#f8f8f8] p-3 text-left text-sm border border-[#167a7c]/25"
            >
              <span id={`mobile-${key}-value`}>{values[key] === "Other +25 Euro" ? "Other" : values[key] || "Select date"}</span>
              <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      <button ref={nextButton} type="button" onClick={onNext} className="mt-4 mb-4 w-full h-[60px] rounded-lg bg-[#167a7c] text-white font-bold hover:bg-[#126467]">Next</button>
      <dialog
        ref={dialog}
        aria-labelledby="mobile-booking-title"
        onCancel={() => setStep(null)}
        onClose={() => setStep(null)}
        onClick={e => { if (e.target === e.currentTarget) setStep(null) }}
        className="m-auto w-[calc(100%-2rem)] max-w-sm max-h-[85dvh] rounded-2xl bg-white p-0 shadow-xl backdrop:bg-black/50"
      >
        {active && (
          <div className="p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-xs text-gray-500">{(step ?? 0) + 1} of {fields.length}</p>
                <h2 tabIndex={-1} id="mobile-booking-title" className="text-lg font-bold" aria-live="polite">{active[1]}</h2>
              </div>
              <button type="button" onClick={() => setStep(null)} aria-label="Close selection" className="p-3 rounded-lg hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            {isDate ? (
              <div>
              <p className="mb-2 text-center text-xs text-gray-500">Swipe left or right to change month</p>
              <div className="flex justify-center overflow-x-auto" style={{ touchAction: "pan-y" }}
                onTouchStart={event => {
                  const touch = event.touches[0]
                  touchStart.current = event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null
                }}
                onTouchCancel={() => { touchStart.current = null }}
                onTouchEndCapture={event => {
                  const start = touchStart.current
                  touchStart.current = null
                  if (!start) return
                  const touch = event.changedTouches[0]
                  const dx = touch.clientX - start.x
                  const dy = touch.clientY - start.y
                  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return
                  event.preventDefault()
                  event.stopPropagation()
                  if (dx < 0) nextMonth.current?.click()
                  else previousMonth.current?.click()
                }}>
                <DatePicker
                  inline
                  renderCustomHeader={({ date, decreaseMonth, increaseMonth, prevMonthButtonDisabled, nextMonthButtonDisabled }) => (
                    <div className="flex items-center justify-between px-2 gap-2">
                      <button ref={previousMonth} type="button" aria-label="Previous month" disabled={prevMonthButtonDisabled} onClick={decreaseMonth} className="min-h-11 min-w-11 text-xl disabled:opacity-30">‹</button>
                      <span aria-live="polite" className="font-semibold">{date.toLocaleDateString("en", { month: "long", year: "numeric" })}</span>
                      <button ref={nextMonth} type="button" aria-label="Next month" disabled={nextMonthButtonDisabled} onClick={increaseMonth} className="min-h-11 min-w-11 text-xl disabled:opacity-30">›</button>
                    </div>
                  )}
                  selected={parseDate(values[field!])}
                  onSelect={date => { if (date) choose(formatDate(date)) }}
                  minDate={field === "returnDate" ? parseDate(values.pickupDate) || new Date() : new Date()}
                />
              </div>
              </div>
            ) : (
              <div ref={optionsPanel} className={`grid gap-2 max-h-[55dvh] overflow-y-auto ${options === times ? "grid-cols-3" : "grid-cols-1"}`}>
                {options.map(option => (
                  <button
                    key={option.value}
                    data-choice
                    type="button"
                    aria-pressed={values[field!] === option.value}
                    onClick={() => choose(option.value)}
                    className={`min-h-12 rounded-lg border px-3 py-3 text-sm ${values[field!] === option.value ? "border-[#167a7c] bg-[#167a7c] text-white" : "border-gray-200 hover:bg-gray-100"}`}
                  >{option.label}</button>
                ))}
              </div>
            )}
            {step !== null && step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="mt-4 min-h-11 px-3 text-[#167a7c] font-semibold">Back</button>}
          </div>
        )}
      </dialog>
    </div>
  )
}
