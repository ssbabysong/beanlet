"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import {useSwipeNavigation} from '@/components/use-swipe-navigation'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  onSwipeBack,
  onSwipeDown,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  onSwipeBack?: () => void
  onSwipeDown?: () => void
  showCloseButton?: boolean
}) {
  const swipe=useSwipeNavigation(direction=>{if(direction==='previous')onSwipeBack?.()},!!onSwipeBack)
  const down=React.useRef<{x:number;y:number;active:boolean;moved:boolean}|null>(null)
  const [dismissY,setDismissY]=React.useState(0)
  const [draggingDown,setDraggingDown]=React.useState(false)
  function downStart(event:React.PointerEvent<HTMLElement>){
    down.current=null
    if(!onSwipeDown||event.button!==0||!event.isPrimary)return
    const target=event.target as HTMLElement,rect=event.currentTarget.getBoundingClientRect()
    if(event.clientY>rect.top+104||target.closest('button,a,input,textarea,select,[role=button],[role=slider],[role=combobox]'))return
    down.current={x:event.clientX,y:event.clientY,active:false,moved:false}
  }
  function downMove(event:React.PointerEvent<HTMLElement>){
    const start=down.current;if(!start)return
    const dx=event.clientX-start.x,dy=event.clientY-start.y
    if(!start.active&&dy>12&&Math.abs(dy)>Math.abs(dx)*1.25){start.active=true;setDraggingDown(true);event.currentTarget.setPointerCapture(event.pointerId)}
    if(start.active){
      if(dy>18)start.moved=true
      setDismissY(Math.max(0,Math.min(150,dy*.82)))
    }
  }
  function downEnd(event:React.PointerEvent<HTMLElement>){
    const start=down.current;down.current=null
    if(!start?.active)return
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)
    const shouldDismiss=event.clientY-start.y>82&&Math.abs(event.clientX-start.x)<Math.abs(event.clientY-start.y)
    setDraggingDown(false)
    setDismissY(0)
    if(shouldDismiss)onSwipeDown?.()
  }
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-swipe-down-enabled={!!onSwipeDown}
        onDragStart={swipe.onDragStart}
        onPointerDown={event=>{swipe.onPointerDown(event);downStart(event)}}
        onPointerMove={event=>{swipe.onPointerMove(event);downMove(event)}}
        onPointerUp={event=>{swipe.onPointerUp(event);downEnd(event)}}
        onPointerCancel={event=>{swipe.onPointerCancel();down.current=null;setDraggingDown(false);setDismissY(0)}}
        onClickCapture={event=>{swipe.onClickCapture(event);if(down.current?.moved){event.preventDefault();event.stopPropagation();down.current.moved=false}}}
        {...props}
        className={cn(
          "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg",
          className
        )}
        style={{...props.style,translate:`-50% calc(-50% + ${dismissY}px)`,transition:draggingDown?'none':undefined}}
      >
        {onSwipeDown && <span className="dialog-drag-handle" aria-hidden="true" />}
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
