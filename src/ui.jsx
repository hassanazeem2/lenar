// Animate UI primitives styled for lenar. Animate UI supplies the motion
// (sliding tab indicator, panel transitions, accordion height, tooltip and dialog
// enter/exit); these wrappers only add the look.
import { Plus, X } from 'lucide-react'
import {
  Tabs as TabsP, Accordion as AccordionP, Tooltip as TooltipP, Dialog as DialogP,
} from '@animate-ui/react/primitives/radix-ui'
import { C, cn } from '../SimpleLanding.jsx'

/* ---------- Tabs ---------- */

export const Tabs = TabsP.Root

export function TabsList({ className, ...props }) {
  return (
    <TabsP.List
      className={cn('relative inline-flex items-center gap-1 rounded-xl border p-1', className)}
      style={{ borderColor: C.line2, background: 'rgba(244,245,246,0.03)' }}
      {...props}
    />
  )
}

// Animate UI slides a copy of the active trigger's background between tabs.
export function TabsTrigger({ className, ...props }) {
  return (
    <TabsP.Trigger
      className={cn(
        'relative z-10 rounded-lg px-3 py-1.5 text-xs font-medium text-white/45 outline-none transition-colors hover:text-white/80',
        'data-[state=active]:bg-white/[0.09] data-[state=active]:text-white focus-visible:ring-2 focus-visible:ring-white/20',
        className,
      )}
      {...props}
    />
  )
}

export const TabsContent = TabsP.Content

/* ---------- Accordion ---------- */

export const Accordion = AccordionP.Root

export function AccordionItem({ className, ...props }) {
  return <AccordionP.Item className={cn('border-t first:border-t-0', className)} style={{ borderColor: C.line }} {...props} />
}

export function AccordionTrigger({ children, className, ...props }) {
  return (
    <AccordionP.Header className="flex">
      <AccordionP.Trigger
        className={cn('group flex w-full items-center justify-between gap-6 py-5 text-left outline-none focus-visible:text-white', className)}
        {...props}
      >
        <span style={{ fontSize: 15, color: 'rgba(244,245,246,0.85)' }}>{children}</span>
        <Plus size={16} className="shrink-0 transition-transform duration-300 group-data-[state=open]:rotate-45" style={{ color: C.faint }} />
      </AccordionP.Trigger>
    </AccordionP.Header>
  )
}

export function AccordionContent({ children, ...props }) {
  return (
    <AccordionP.Content className="overflow-hidden" {...props}>
      <div className="pb-5 text-sm leading-relaxed" style={{ color: C.dim }}>{children}</div>
    </AccordionP.Content>
  )
}

/* ---------- Tooltip ---------- */

export const TooltipProvider = TooltipP.Provider

export function Tip({ content, children }) {
  return (
    <TooltipP.Root>
      <TooltipP.Trigger asChild>{children}</TooltipP.Trigger>
      <TooltipP.Portal>
        <TooltipP.Content
          sideOffset={6}
          className="z-50 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl"
          style={{ borderColor: C.line2, background: '#111214', color: C.fg }}
        >
          {content}
        </TooltipP.Content>
      </TooltipP.Portal>
    </TooltipP.Root>
  )
}

/* ---------- Dialog ---------- */

export const Dialog = DialogP.Root
export const DialogTrigger = DialogP.Trigger
export const DialogClose = DialogP.Close

export function DialogContent({ title, description, children, className }) {
  return (
    <DialogP.Portal>
      <DialogP.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
      <DialogP.Content
        className={cn('fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-6 outline-none', className)}
        style={{ borderColor: C.line2, background: '#0e0f11', color: C.fg }}
      >
        <DialogP.Title className="text-lg font-medium" style={{ letterSpacing: '-0.01em' }}>{title}</DialogP.Title>
        {description ? <DialogP.Description className="mt-1.5 text-sm" style={{ color: C.dim }}>{description}</DialogP.Description> : null}
        <div className="mt-5">{children}</div>
        <DialogP.Close className="btn btn-ghost btn-sm btn-square absolute right-3 top-3" aria-label="Close">
          <X size={16} />
        </DialogP.Close>
      </DialogP.Content>
    </DialogP.Portal>
  )
}
