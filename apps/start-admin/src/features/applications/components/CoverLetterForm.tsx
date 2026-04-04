import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Button } from '../../../components/ui/Button'
import { FormTextarea } from '../../../components/ui/Field'

interface CoverLetterFormProps {
  readonly initialContent?: string
  readonly onSubmit?: (content: string) => Promise<void>
  readonly onCancel?: () => void
}

export function CoverLetterForm({
  initialContent = '',
  onSubmit,
  onCancel,
}: CoverLetterFormProps) {
  const [saving, setSaving] = useState(false)

  const form = useForm({
    defaultValues: {
      content: initialContent,
    },
    validators: {
      onChange: z.object({
        content: z.string().min(1, 'Cover letter content is required'),
      }),
    },
    onSubmit: async ({ value }) => {
      if (saving) return
      setSaving(true)
      try {
        if (onSubmit) {
          await onSubmit(value.content)
        }
      } finally {
        setSaving(false)
      }
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="flex h-full flex-col px-4 pb-12 sm:px-6"
    >
      <div className="flex-1 space-y-12">
        <div className="border-b border-white/10 pb-12 pt-4">
          <h2 className="text-base/7 font-semibold text-white">Cover Letter Content</h2>
          <p className="mt-1 text-sm/6 text-gray-400">
            Edit the content of the tailored cover letter directly.
          </p>
          <div className="mt-6">
            <form.Field
              name="content"
              children={(field) => (
                <FormTextarea
                  label="Cover Letter"
                  field={field}
                  rows={20}
                  className="font-mono"
                  placeholder="Dear Hiring Manager..."
                />
              )}
            />
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-end gap-x-4 border-t border-white/10 pt-8">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              variant="secondary"
              disabled={!canSubmit || saving}
              className="px-6 py-2"
            >
              {isSubmitting || saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        />
      </div>
    </form>
  )
}
