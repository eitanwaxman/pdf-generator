import React from 'react'

export function Switch({ id, checked, onCheckedChange, disabled = false, 'aria-label': ariaLabel }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        if (disabled) return
        onCheckedChange?.(!checked)
      }}
      className={[
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-muted',
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        ].join(' ')}
      />
    </button>
  )
}

export default Switch


