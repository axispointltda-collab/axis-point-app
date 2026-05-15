import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  getYear,
  setYear,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'motion/react';
import { getBrasiliaNow } from '../lib/dateUtils';

interface CalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  recordedDays?: string[]; // Array of ISO strings (YYYY-MM-DD)
}

export default function Calendar({ selectedDate, onDateSelect, recordedDays = [] }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(getBrasiliaNow());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 cursor-pointer select-none" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="flex flex-col">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowYearPicker(!showYearPicker); }}
            className="text-left group"
          >
              <h2 className="text-2xl font-serif font-black tracking-tight text-gray-900 flex items-center gap-2 group-hover:text-[#1B9E9E] transition-colors">
              {format(currentMonth, 'MMMM', { locale: ptBR })}
              <span className="text-gray-300 font-sans font-light">/</span>
              {format(currentMonth, 'yyyy')}
            </h2>
          </button>
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 mt-0.5">
            {isCollapsed ? 'Toque para expandir o calendário' : 'Selecione uma data para ver registros'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {!isCollapsed && (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); prevMonth(); }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); nextMonth(); }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
          <motion.div
            animate={{ rotate: isCollapsed ? 0 : 180 }}
            transition={{ duration: 0.3 }}
            className="p-1 text-gray-400"
          >
            <ChevronDown size={18} />
          </motion.div>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return (
      <div className="grid grid-cols-7 mb-2 px-2">
        {days.map((day) => (
          <div key={day} className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 py-3">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    const today = getBrasiliaNow();

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const isSelected = isSameDay(day, selectedDate);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const dayKey = format(day, 'yyyy-MM-dd');
        const hasRecord = recordedDays.includes(dayKey);

        days.push(
          <motion.div
            key={day.toString()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              relative h-12 flex items-center justify-center cursor-pointer text-sm font-medium transition-all duration-200
              ${!isCurrentMonth ? 'text-gray-200 pointer-events-none' : 'text-gray-700'}
              ${isSelected ? 'text-white' : 'hover:bg-gray-50'}
              rounded-xl mx-0.5
            `}
            onClick={() => onDateSelect(cloneDay)}
          >
            {isSelected && (
              <motion.div 
                layoutId="activeDay"
                className="absolute inset-2 bg-[#1B9E9E] rounded-lg shadow-sm"
              />
            )}
            <span className="relative z-10">{format(day, 'd')}</span>
            
            <div className="absolute bottom-1.5 flex gap-0.5">
              {isSameDay(day, today) && !isSelected && (
                <div className="w-1-5 h-1.5 bg-[#1B9E9E] rounded-full" />
              )}
              {hasRecord && (
                <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-green-500'}`} />
              )}
            </div>
          </motion.div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 px-1" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="pb-4">{rows}</div>;
  };

  const renderYearPicker = () => {
    const years = [];
    const currentYear = getYear(getBrasiliaNow());
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
      years.push(i);
    }

    return (
      <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-b-2xl border-t border-gray-100">
        {years.map(year => (
          <button
            key={year}
            onClick={() => {
              setCurrentMonth(setYear(currentMonth, year));
              setShowYearPicker(false);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-colors
              ${getYear(currentMonth) === year ? 'bg-[#1B9E9E] text-white' : 'bg-white text-gray-500 hover:bg-gray-100'}
            `}
          >
            {year}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">
      {renderHeader()}
      <motion.div
        initial={false}
        animate={{ 
          height: isCollapsed ? 0 : 'auto',
          opacity: isCollapsed ? 0 : 1
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        {showYearPicker && renderYearPicker()}
        {!showYearPicker && (
          <>
            {renderDays()}
            {renderCells()}
          </>
        )}
      </motion.div>
    </div>
  );
}
