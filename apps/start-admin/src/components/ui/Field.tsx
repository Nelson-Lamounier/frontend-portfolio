import React from 'react'


interface FieldInfoProps {
  field: any
}

export function FieldInfo({ field }: FieldInfoProps) {
  return (
    <>
      {field.state.meta.isTouched && field.state.meta.errors.length ? (
        <em className="text-xs text-red-500 mt-1 block">
          {field.state.meta.errors.join(', ')}
        </em>
      ) : null}
      {field.state.meta.isValidating ? (
        <em className="text-xs text-teal-500 mt-1 block">Validating...</em>
      ) : null}
    </>
  )
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  field: any
}

export function FormInput({ label, field, className = '', ...props }: FormInputProps) {
  return (
    <div>
      <label htmlFor={field.name} className="block text-sm/6 font-medium text-white">
        {label}
      </label>
      <div className="mt-2">
        <input
          id={field.name}
          name={field.name}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          className={`p-2 block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm/6 ${className}`}
          {...props}
        />
      </div>
      <FieldInfo field={field} />
    </div>
  )
}

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  field: any
}

export function FormTextarea({ label, field, className = '', ...props }: FormTextareaProps) {
  return (
    <div>
      <label htmlFor={field.name} className="block text-sm/6 font-medium text-white">
        {label}
      </label>
      <div className="mt-2">
        <textarea
          id={field.name}
          name={field.name}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          className={`block p-2 w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm/6 ${className}`}
          {...props}
        />
      </div>
      <FieldInfo field={field} />
    </div>
  )
}

