import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import {
  ChevronDownIcon,
  TrashIcon,
  DocumentTextIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  EnvelopeIcon,
  CheckIcon,
} from '@heroicons/react/20/solid'

interface DropDownOptionsProps {
  readonly label?: React.ReactNode
  readonly disabled?: boolean
  readonly options?: ReadonlyArray<{ label: string; value: string }>
  readonly selectedValue?: string
  readonly onSelect?: (value: string) => void

  readonly onPreviewResume?: () => void
  readonly onPreviewCoverLetter?: () => void
  readonly onEditResume?: () => void
  readonly onEditCoverLetter?: () => void
  readonly onDelete?: () => void
  readonly onPublish?: () => void
  readonly onUnpublish?: () => void
  readonly showPreviewResume?: boolean
  readonly showPreviewCoverLetter?: boolean
}

export default function DropDownOptions({
  label = 'Options',
  disabled,
  options,
  selectedValue,
  onSelect,
  onPreviewResume,
  onPreviewCoverLetter,
  onEditResume,
  onEditCoverLetter,
  onDelete,
  onPublish,
  onUnpublish,
  onPreviewArticle,
  onEditArticle,
  showPreviewResume = true,
  showPreviewCoverLetter = true,
}: DropDownOptionsProps & { onPreviewArticle?: () => void; onEditArticle?: () => void; }) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <MenuButton
        disabled={disabled}
        className="inline-flex w-full items-center justify-center gap-x-1.5 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white inset-ring-1 inset-ring-white/5 hover:bg-white/20 disabled:opacity-50"
      >
        {label}
        <ChevronDownIcon aria-hidden="true" className="-mr-1 size-5 text-gray-400" />
      </MenuButton>

      <MenuItems
        transition
        className="absolute right-0 z-10 mt-2 w-56 max-h-96 overflow-y-auto origin-top-right divide-y divide-white/10 rounded-md bg-zinc-800 outline-1 -outline-offset-1 outline-white/10 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
      >
        {options && options.length > 0 && (
          <div className="py-1">
            {options.map((opt) => (
              <MenuItem key={opt.value}>
                <button
                  type="button"
                  onClick={() => onSelect?.(opt.value)}
                  className={`group flex w-full items-center justify-between px-4 py-2 text-sm data-focus:bg-white/5 data-focus:outline-hidden ${
                    selectedValue === opt.value ? 'text-violet-400 bg-white/5 font-medium' : 'text-gray-300'
                  }`}
                >
                  {opt.label}
                  {selectedValue === opt.value && (
                    <CheckIcon className="size-4 text-violet-400" />
                  )}
                </button>
              </MenuItem>
            ))}
          </div>
        )}

        {(onEditResume || onEditCoverLetter || onPreviewResume || onPreviewCoverLetter || onPublish || onUnpublish || onPreviewArticle || onEditArticle) && (
          <div className="py-1">
            {onEditResume && (
              <MenuItem>
                <button
                  type="button"
                  onClick={onEditResume}
                  className="group flex w-full items-center px-4 py-2 text-sm text-gray-300 data-focus:bg-white/5 data-focus:text-white data-focus:outline-hidden"
                >
                  <PencilSquareIcon
                    aria-hidden="true"
                    className="mr-3 size-5 text-gray-500 group-data-focus:text-white"
                  />
                  Edit Resume
                </button>
              </MenuItem>
            )}
            {onEditCoverLetter && (
              <MenuItem>
                <button
                  type="button"
                  onClick={onEditCoverLetter}
                  className="group flex w-full items-center px-4 py-2 text-sm text-gray-300 data-focus:bg-white/5 data-focus:text-white data-focus:outline-hidden"
                >
                  <PencilSquareIcon
                    aria-hidden="true"
                    className="mr-3 size-5 text-gray-500 group-data-focus:text-white"
                  />
                  Edit Cover Letter
                </button>
              </MenuItem>
            )}
            {showPreviewResume && onPreviewResume && (
              <MenuItem>
                <button
                  type="button"
                  onClick={onPreviewResume}
                  className="group flex w-full items-center px-4 py-2 text-sm text-gray-300 data-focus:bg-white/5 data-focus:text-white data-focus:outline-hidden"
                >
                  <DocumentTextIcon
                    aria-hidden="true"
                    className="mr-3 size-5 text-gray-500 group-data-focus:text-white"
                  />
                  Preview Resume
                </button>
              </MenuItem>
            )}
            {showPreviewCoverLetter && onPreviewCoverLetter && (
              <MenuItem>
                <button
                  type="button"
                  onClick={onPreviewCoverLetter}
                  className="group flex w-full items-center px-4 py-2 text-sm text-gray-300 data-focus:bg-white/5 data-focus:text-white data-focus:outline-hidden"
                >
                  <EnvelopeIcon
                    aria-hidden="true"
                    className="mr-3 size-5 text-gray-500 group-data-focus:text-white"
                  />
                  Preview Cover Letter
                </button>
              </MenuItem>
            )}
            {onPublish && (
              <MenuItem>
                <button
                  type="button"
                  onClick={onPublish}
                  className="group flex w-full items-center px-4 py-2 text-sm text-gray-300 data-focus:bg-white/5 data-focus:text-white data-focus:outline-hidden"
                >
                  <PaperAirplaneIcon
                    aria-hidden="true"
                    className="mr-3 size-5 text-gray-500 group-data-focus:text-white"
                  />
                  Publish
                </button>
              </MenuItem>
            )}
            {onUnpublish && (
              <MenuItem>
                <button
                  type="button"
                  onClick={onUnpublish}
                  className="group flex w-full items-center px-4 py-2 text-sm text-gray-300 data-focus:bg-white/5 data-focus:text-white data-focus:outline-hidden"
                >
                  <PaperAirplaneIcon
                    aria-hidden="true"
                    className="mr-3 size-5 text-gray-500 group-data-focus:text-white rotate-180"
                  />
                  Unpublish
                </button>
              </MenuItem>
            )}
            {onPreviewArticle && (
              <MenuItem>
                <button
                  type="button"
                  onClick={onPreviewArticle}
                  className="group flex w-full items-center px-4 py-2 text-sm text-gray-300 data-focus:bg-white/5 data-focus:text-white data-focus:outline-hidden"
                >
                  <DocumentTextIcon
                    aria-hidden="true"
                    className="mr-3 size-5 text-gray-500 group-data-focus:text-white"
                  />
                  Preview
                </button>
              </MenuItem>
            )}
            {onEditArticle && (
              <MenuItem>
                <button
                  type="button"
                  onClick={onEditArticle}
                  className="group flex w-full items-center px-4 py-2 text-sm text-gray-300 data-focus:bg-white/5 data-focus:text-white data-focus:outline-hidden"
                >
                  <PencilSquareIcon
                    aria-hidden="true"
                    className="mr-3 size-5 text-gray-500 group-data-focus:text-white"
                  />
                  Edit
                </button>
              </MenuItem>
            )}
          </div>
        )}
        
        {onDelete && (
          <div className="py-1">
            <MenuItem>
              <button
                type="button"
                onClick={onDelete}
                className="group flex w-full items-center px-4 py-2 text-sm text-red-500 data-focus:bg-red-500/10 data-focus:text-red-400 data-focus:outline-hidden"
              >
                <TrashIcon aria-hidden="true" className="mr-3 size-5 text-red-500/70 group-data-focus:text-red-400" />
                Delete
              </button>
            </MenuItem>
          </div>
        )}
      </MenuItems>
    </Menu>
  )
}

