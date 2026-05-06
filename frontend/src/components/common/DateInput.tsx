import React, { useRef } from 'react'

interface DateInputProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  style?: React.CSSProperties
  className?: string
  placeholder?: string
}

export const DateInput: React.FC<DateInputProps> = ({ 
  value, 
  onChange, 
  style, 
  className,
  placeholder 
}) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    if (inputRef.current) {
      inputRef.current.showPicker?.()
    }
  }

  return (
    <input
      ref={inputRef}
      type="date"
      value={value}
      onChange={onChange}
      onClick={handleClick}
      className={className}
      placeholder={placeholder}
      style={{
        cursor: 'pointer',
        ...style
      }}
    />
  )
}

export default DateInput
