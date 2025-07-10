"use client";

import { ComponentPropsWithoutRef, forwardRef } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@renderer/components/ui/tooltip";
import { Button } from "@renderer/components/ui/button";
import { cn } from "@renderer/lib/utils";

export type TooltipIconButtonProps = ComponentPropsWithoutRef<typeof Button> & {
  tooltip: string;
  side?: "top" | "bottom" | "left" | "right";
};

export const TooltipIconButton = forwardRef<
  HTMLButtonElement,
  TooltipIconButtonProps
>(({ children, tooltip, side = "bottom", className, ...rest }, ref) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          {...rest}
          className={cn("aui-button-icon", className)}
          ref={ref}
        >
          {children}
          <span className="aui-sr-only">{tooltip}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side={side}>{tooltip}</TooltipContent>
    </Tooltip>
  );
});

TooltipIconButton.displayName = "TooltipIconButton";
