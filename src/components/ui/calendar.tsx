import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 rounded-full bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        // Range background bar lives on the cell (scoped to the range markers below,
        // so a single selected date stays a clean circle with no square behind it).
        cell: cn(
          "relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20",
          "[&:has(.day-range-middle)]:bg-accent",
          "[&:has(.day-range-start)]:bg-accent [&:has(.day-range-start)]:rounded-l-full",
          "[&:has(.day-range-end)]:bg-accent [&:has(.day-range-end)]:rounded-r-full",
          "[&:has([aria-selected].day-outside)]:bg-accent/50",
        ),
        // Pill cells: circular days, no buttonVariants (avoids a fixed rounded-md).
        day: "inline-flex h-9 w-9 items-center justify-center rounded-full p-0 text-sm font-normal transition-colors hover:bg-accent hover:text-accent-foreground aria-selected:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-full",
        day_range_start:
          "day-range-start bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground rounded-full",
        day_range_end:
          "day-range-end bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground rounded-full",
        // Middle days are transparent so the cell's accent bar shows through.
        day_range_middle: "day-range-middle bg-transparent text-accent-foreground hover:bg-accent/60",
        // Today: a ring instead of a filled square.
        day_today: "ring-1 ring-primary ring-offset-1 ring-offset-background",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-transparent aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
