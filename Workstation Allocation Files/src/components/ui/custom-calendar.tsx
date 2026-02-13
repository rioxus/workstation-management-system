import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

interface CustomCalendarProps {
  selected?: Date;
  onSelect: (date: Date) => void;
  disabled?: (date: Date) => boolean;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function CustomCalendar({ selected, onSelect, disabled }: CustomCalendarProps) {
  const [currentDate, setCurrentDate] = useState(selected || new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  
  // Get number of days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Get number of days in previous month
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Create array of dates to display
  const dates: (Date | null)[] = [];
  
  // Add previous month's trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    dates.push(new Date(year, month - 1, daysInPrevMonth - i));
  }
  
  // Add current month's days
  for (let i = 1; i <= daysInMonth; i++) {
    dates.push(new Date(year, month, i));
  }
  
  // Add next month's leading days to complete the grid
  const remainingCells = 42 - dates.length; // 6 rows × 7 days = 42 cells
  for (let i = 1; i <= remainingCells; i++) {
    dates.push(new Date(year, month + 1, i));
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const isSelected = (date: Date) => {
    if (!selected) return false;
    return (
      date.getDate() === selected.getDate() &&
      date.getMonth() === selected.getMonth() &&
      date.getFullYear() === selected.getFullYear()
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === month;
  };

  const isDisabled = (date: Date) => {
    return disabled ? disabled(date) : false;
  };

  const handleDateClick = (date: Date) => {
    if (!isDisabled(date)) {
      onSelect(date);
    }
  };

  return (
    <div className="w-[280px] bg-white rounded-lg shadow-sm border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={goToPreviousMonth}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="text-sm font-semibold">
          {MONTHS[month]} {year}
        </div>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={goToNextMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="p-3">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map((day) => (
            <div
              key={day}
              className="h-9 flex items-center justify-center text-xs font-medium text-slate-500"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Date Grid */}
        <div className="grid grid-cols-7 gap-1">
          {dates.map((date, index) => {
            if (!date) return <div key={index} className="h-9" />;
            
            const selected = isSelected(date);
            const today = isToday(date);
            const currentMonth = isCurrentMonth(date);
            const dateDisabled = isDisabled(date);

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleDateClick(date)}
                disabled={dateDisabled}
                className={`
                  h-9 w-9 rounded-md text-sm font-normal
                  flex items-center justify-center
                  transition-colors
                  ${!currentMonth ? 'text-slate-300' : 'text-slate-700'}
                  ${selected 
                    ? 'bg-blue-600 text-white font-semibold hover:bg-blue-700' 
                    : today 
                      ? 'bg-slate-100 font-semibold hover:bg-slate-200'
                      : 'hover:bg-slate-100'
                  }
                  ${dateDisabled 
                    ? 'text-slate-300 cursor-not-allowed hover:bg-transparent opacity-50' 
                    : 'cursor-pointer'
                  }
                `}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
