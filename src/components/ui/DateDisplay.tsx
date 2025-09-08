import React from "react";
import { formatDistanceToNow } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import { cn } from "@/lib/utils";

interface DateDisplayProps {
  date: string | Date;
  format?: "relative" | "short" | "full";
  showTooltip?: boolean;
  className?: string;
}

export const DateDisplay: React.FC<DateDisplayProps> = ({
  date,
  format = "relative",
  showTooltip = true,
  className = "",
}) => {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  const getDisplayText = () => {
    switch (format) {
      case "relative":
        return formatRelativeDate(dateObj);
      case "short":
        return formatShortDate(dateObj);
      case "full":
        return formatFullDate(dateObj);
      default:
        return formatRelativeDate(dateObj);
    }
  };

  const getTooltipText = () => {
    switch (format) {
      case "relative":
        return formatFullDate(dateObj);
      case "short":
        return formatFullDate(dateObj);
      case "full":
        return formatRelativeDate(dateObj);
      default:
        return formatFullDate(dateObj);
    }
  };

  if (!showTooltip) {
    return <span className={className}>{getDisplayText()}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("cursor-default", className)}>
          {getDisplayText()}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getTooltipText()}</p>
      </TooltipContent>
    </Tooltip>
  );
};

// Utils

function formatRelativeDate(date: Date) {
  return formatDistanceToNow(date, { addSuffix: true });
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatFullDate(date: Date) {
  return date.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
