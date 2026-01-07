"use client";

import React, { memo, useMemo } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

type TTooltipProps = {
  children?: React.ReactNode;
  tooltip?: string | React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  showTooltip?: boolean;
  sideOffset?: number;
  classes?: string;
  delay?: number;
};

const OctarineTooltip = memo(
  ({
    children,
    tooltip = "",
    side = "bottom",
    showTooltip = true,
    sideOffset = 5,
    classes,
    delay = 300,
  }: TTooltipProps) => {
    const className = useMemo(() => {
      const baseClasses =
        "z-[9999999] max-w-[260px] select-none rounded border border-primary bg-secondary px-2 py-1 text-center text-xs text-primary";
      const animationClass =
        side === "top"
          ? "animate-slideUpAndFade"
          : side === "left"
            ? "animate-slideLeftAndFade"
            : side === "right"
              ? "animate-slideRightAndFade"
              : "animate-slideDownAndFade";

      return `${baseClasses} ${animationClass} ${classes || ""}`;
    }, [side, classes]);

    // Don't render anything if tooltip is disabled or empty
    if (!showTooltip || !tooltip) {
      return children as React.ReactElement;
    }

    return (
      <Tooltip.Provider delayDuration={delay}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className={className}
              sideOffset={sideOffset}
              side={side}
              collisionPadding={8}
            >
              {tooltip}
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  },
  (prevProps: TTooltipProps, nextProps: TTooltipProps) => {
    return (
      prevProps.tooltip === nextProps.tooltip &&
      prevProps.side === nextProps.side &&
      prevProps.showTooltip === nextProps.showTooltip &&
      prevProps.sideOffset === nextProps.sideOffset &&
      prevProps.classes === nextProps.classes &&
      prevProps.children === nextProps.children
    );
  }
);

OctarineTooltip.displayName = "OctarineTooltip";

export default OctarineTooltip;
