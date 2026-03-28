import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface DateRange {
  from: Date;
  to: Date;
}

interface DatePickerWithRangeProps {
  value?: DateRange;
  onChange?: (range: DateRange | null) => void;
}

export function DatePickerWithRange({ value, onChange }: DatePickerWithRangeProps) {
  const [date, setDate] = useState<DateRange | null>(value || null);

  const handleSelect = (range: { from?: Date; to?: Date } | undefined) => {
    const newRange = range?.from && range?.to ? { from: range.from, to: range.to } : null;
    setDate(newRange);
    onChange?.(newRange);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date?.from ? (
            date.to ? (
              <>
                {format(date.from, "yyyy/MM/dd", { locale: ja })} -{" "}
                {format(date.to, "yyyy/MM/dd", { locale: ja })}
              </>
            ) : (
              format(date.from, "yyyy/MM/dd", { locale: ja })
            )
          ) : (
            <span>日付範囲を選択</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={date}
          onSelect={handleSelect}
          numberOfMonths={2}
          locale={ja}
        />
      </PopoverContent>
    </Popover>
  );
}
