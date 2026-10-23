import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from './ui/button';

const STORAGE_KEY = 'ghardailo.virtual-keyboard'
const LAYOUT_KEY = 'ghardailo.virtual-keyboard-layout'

type KeyboardMode = 'text' | 'numeric'
export type VirtualKeyboardLayout = 'number' | 'full'

interface KeyboardContextValue {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  layout: VirtualKeyboardLayout
  setLayout: (layout: VirtualKeyboardLayout) => void
}

const KeyboardContext = createContext<KeyboardContextValue | null>(null)

function inputModeFor(element: HTMLInputElement | HTMLTextAreaElement): KeyboardMode | null {
  if (element instanceof HTMLTextAreaElement) return 'text'
  if (element.type === 'checkbox' || element.type === 'radio' || element.type === 'file' || element.type === 'date') {
    return null
  }
  if (
    element.type === 'number' ||
    element.inputMode === 'decimal' ||
    element.inputMode === 'numeric' ||
    element.inputMode === 'tel'
  ) {
    return 'numeric'
  }
  return 'text'
}

function setInputValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  setter?.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

function insertText(element: HTMLInputElement | HTMLTextAreaElement, text: string) {
  const start = element.selectionStart ?? element.value.length
  const end = element.selectionEnd ?? start
  setInputValue(element, `${element.value.slice(0, start)}${text}${element.value.slice(end)}`)
  const cursor = start + text.length
  requestAnimationFrame(() => element.setSelectionRange(cursor, cursor))
}

function backspace(element: HTMLInputElement | HTMLTextAreaElement) {
  const start = element.selectionStart ?? element.value.length
  const end = element.selectionEnd ?? start
  if (start === 0 && end === 0) return
  const nextStart = start === end ? start - 1 : start
  setInputValue(element, `${element.value.slice(0, nextStart)}${element.value.slice(end)}`)
  requestAnimationFrame(() => element.setSelectionRange(nextStart, nextStart))
}

const TEXT_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']

export function useVirtualKeyboard() {
  const context = useContext(KeyboardContext)
  if (!context) throw new Error('useVirtualKeyboard must be used inside VirtualKeyboardProvider')
  return context
}

export function VirtualKeyboardProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === null ? true : stored === 'true'
  })
  const [layout, setLayoutState] = useState<VirtualKeyboardLayout>(() => {
    return window.localStorage.getItem(LAYOUT_KEY) === 'full' ? 'full' : 'number'
  })
  const [active, setActive] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const [activeMode, setActiveMode] = useState<KeyboardMode | null>(null)
  const [shift, setShift] = useState(false)
  const previousInputMode = useRef<string | null>(null)

  const setEnabled = (next: boolean) => {
    setEnabledState(next)
    window.localStorage.setItem(STORAGE_KEY, String(next))
    if (!next) {
      setActive(null)
      setActiveMode(null)
    }
  }

  const setLayout = (next: VirtualKeyboardLayout) => {
    setLayoutState(next)
    window.localStorage.setItem(LAYOUT_KEY, next)
    setActiveMode(active ? (next === 'number' ? 'numeric' : inputModeFor(active)) : null)
  }

  useEffect(() => {
    if (!enabled) return

    function onFocus(event: FocusEvent) {
      const target = event.target
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return
      if (!inputModeFor(target)) return
      previousInputMode.current = target.getAttribute('inputmode')
      target.setAttribute('inputmode', 'none')
      setShift(false)
      setActiveMode(layout === 'number' ? 'numeric' : inputModeFor(target))
      setActive(target)
      if (layout === 'number' || inputModeFor(target) === 'numeric') requestAnimationFrame(() => target.select())
    }

    function onBlur(event: FocusEvent) {
      const target = event.target
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return
      const nextTarget = event.relatedTarget
      if (nextTarget instanceof HTMLElement && nextTarget.closest('[data-virtual-keyboard]')) return
      if (target === active) setActive(null)
      if (previousInputMode.current === null) target.removeAttribute('inputmode')
      else target.setAttribute('inputmode', previousInputMode.current)
      previousInputMode.current = null
    }

    document.addEventListener('focusin', onFocus)
    document.addEventListener('focusout', onBlur)
    return () => {
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('focusout', onBlur)
    }
  }, [active, enabled, layout])

  const context = { enabled, setEnabled, layout, setLayout }

  return (
    <KeyboardContext.Provider value={context}>
      {children}
      {enabled && active && activeMode && (
        <VirtualKeyboard
          mode={activeMode}
          onModeChange={setActiveMode}
          shift={shift}
          onShift={() => setShift((value) => !value)}
          onKey={(key) => {
            if (!active) return
            if (key === 'backspace') backspace(active)
            else if (key === 'clear') setInputValue(active, '')
            else if (key === 'done') {
              active.blur()
              setActive(null)
            } else if (key === 'space') insertText(active, ' ')
            else insertText(active, shift ? key.toUpperCase() : key)
            if (shift && key.length === 1) setShift(false)
          }}
        />
      )}
    </KeyboardContext.Provider>
  )
}

function VirtualKeyboard({
  mode,
  onModeChange,
  shift,
  onShift,
  onKey,
}: {
  mode: KeyboardMode
  onModeChange: (mode: KeyboardMode) => void
  shift: boolean
  onShift: () => void
  onKey: (key: string) => void
}) {
  const keyClass =
    'grid h-11 min-w-0 flex-1 touch-manipulation select-none place-items-center rounded-[10px] border border-[#cbd8ce] bg-white text-[1rem] font-bold text-ink-2 shadow-[0_1px_2px_rgba(18,28,21,0.08)] transition-[transform,background-color,box-shadow] active:translate-y-px active:bg-primary-soft active:shadow-none'

  return (
    <div
      data-virtual-keyboard
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-[#b8cbbd] bg-[#edf4ef]/96 px-2.5 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] shadow-[0_-14px_35px_rgba(18,28,21,0.16)] backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-[760px] flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3 px-0.5 pb-0.5">
          <span className="text-[0.72rem] font-extrabold tracking-[0.12em] text-ink-3 uppercase">Touch keyboard</span>
          <RadioGroup
            value={mode}
            onValueChange={(value) => onModeChange(value as KeyboardMode)}
            aria-label="Keyboard layout"
            className="grid grid-cols-2 gap-1 rounded-lg bg-surface-container p-1"
          >
            {(['numeric', 'text'] as const).map((keyMode) => (
              <label
                key={keyMode}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => onModeChange(keyMode)}
                className={`flex min-w-14 cursor-pointer items-center justify-center rounded-md px-3 py-1.5 text-[0.76rem] font-extrabold transition-colors ${mode === keyMode ? 'bg-white text-primary shadow-xs' : 'text-ink-3 hover:text-foreground'}`}
              >
                <RadioGroupItem value={keyMode} className="sr-only" />
                {keyMode === 'numeric' ? '123' : 'ABC'}
              </label>
            ))}
          </RadioGroup>
        </div>
        {mode === 'numeric' ? (
          <>
            <div className="grid grid-cols-3 gap-1.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
                <button
                  key={key}
                  type="button"
                  className={keyClass}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => onKey(key)}
                >
                  {key}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                className={keyClass}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => onKey('.')}
              >
                .
              </button>
              <button
                type="button"
                className={keyClass}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => onKey('0')}
              >
                0
              </button>
              <button
                type="button"
                className={`${keyClass} bg-surface-container`}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => onKey('backspace')}
              >
                ⌫
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-1.5">
              {'1234567890'.split('').map((key) => (
                <button
                  key={key}
                  type="button"
                  className={keyClass}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => onKey(key)}
                >
                  {key}
                </button>
              ))}
            </div>
            {TEXT_ROWS.map((row) => (
              <div key={row} className="flex gap-1.5">
                {row.split('').map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={keyClass}
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => onKey(key)}
                  >
                    {shift ? key.toUpperCase() : key}
                  </button>
                ))}
              </div>
            ))}
          </>
        )}
        <div className="flex gap-1.5">
          {mode === 'text' && (
            <button
              type="button"
              className={`${keyClass} max-w-16`}
              onPointerDown={(event) => event.preventDefault()}
              onClick={onShift}
            >
              ⇧
            </button>
          )}
          <button
            type="button"
            className={`${keyClass} max-w-28`}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => onKey('space')}
          >
            Space
          </button>
          {mode === 'text' && (
            <button
              type="button"
              className={`${keyClass} max-w-14`}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => onKey('@')}
            >
              @
            </button>
          )}
          {mode === 'text' && (
            <button
              type="button"
              className={`${keyClass} max-w-14`}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => onKey('.')}
            >
              .
            </button>
          )}
          <button
            type="button"
            className={`${keyClass} max-w-24 bg-surface-container`}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => onKey('clear')}
          >
            Clear
          </button>
          <Button
            type="button"
            className={`${keyClass} max-w-24 bg-primary text-white`}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => onKey('done')}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}
