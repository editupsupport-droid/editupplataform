import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'placeholder:text-muted-foreground flex field-sizing-content min-h-24 w-full rounded-md border border-border bg-input px-3.5 py-3 text-base text-foreground shadow-none transition-[color,box-shadow,background-color,border-color] outline-none hover:bg-input focus-visible:bg-input focus-visible:ring-ring/30 focus-visible:ring-[2px] aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
