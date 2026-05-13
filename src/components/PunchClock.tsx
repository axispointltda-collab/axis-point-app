import { useEffect, useState, useMemo } from 'react';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Play, Square, Check, Coffee, Utensils, Moon, Sun, Zap } from 'lucide-react';
import { getBrasiliaNow, formatBrasilia } from '../lib/dateUtils';

interface PunchClockProps {
  onPunch: () => void;
  isClockedIn: boolean;
  nextPunchLabel?: string;
  punchCount: number;
}

export default function PunchClock({ onPunch, isClockedIn, nextPunchLabel, punchCount }: PunchClockProps) {
  const [now, setNow] = useState(getBrasiliaNow());

  useEffect(() => {
    const timer = setInterval(() => setNow(getBrasiliaNow()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hour = now.getHours();
  const isDayShift = hour >= 6 && hour <= 17;
  const mealLabel = isDayShift ? "Almoço" : "Janta";

  // Etapas da jornada com ícones
  const journeySteps = useMemo(() => [
    { label: "Começar Jornada", icon: <Play size={12} fill="currentColor" /> },
    { label: `Entrada ${mealLabel}`, icon: isDayShift ? <Utensils size={12} /> : <Moon size={12} /> },
    { label: `Saída ${mealLabel}`, icon: isDayShift ? <Coffee size={12} /> : <Sun size={12} /> },
    { label: "Terminar Jornada", icon: <Square size={12} fill="currentColor" /> },
  ], [mealLabel, isDayShift]);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      {/* Time Display */}
      <div className="text-center">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          <div className="flex items-center gap-3 text-gray-400 mb-1">
             <Clock size={16} className="animate-pulse" />
             <span className="text-[10px] uppercase font-bold tracking-[0.3em]">Horário de Brasília</span>
          </div>
          <span className="text-6xl font-display font-bold tracking-tighter text-gray-900 tabular-nums">
            {formatBrasilia(now, 'HH:mm:ss')}
          </span>
          <p className="text-sm font-medium text-gray-500 mt-1">
            {formatBrasilia(now, "EEEE, d 'de' MMMM 'de' yyyy", ptBR)}
          </p>
        </motion.div>
      </div>

      {/* Journey Progress Steps */}
      <div className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between relative">
          {/* Progress Line */}
          <div className="absolute top-[14px] left-[14px] right-[14px] h-[2px] bg-gray-200 z-0" />
          <div 
            className="absolute top-[14px] left-[14px] h-[2px] bg-[#1B9E9E] z-0 transition-all duration-500" 
            style={{ width: `calc(${Math.min(punchCount, 4) / 4 * 100}% - 28px)` }} 
          />
          
          {journeySteps.map((step, i) => {
            const isCompleted = punchCount > i;
            const isCurrent = punchCount === i;
            
            return (
              <div key={i} className="flex flex-col items-center z-10 relative">
                <div className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 border-2
                  ${isCompleted 
                    ? 'bg-[#1B9E9E] border-[#1B9E9E] text-white scale-100' 
                    : isCurrent 
                      ? 'bg-white border-[#1B9E9E] text-[#1B9E9E] scale-110 shadow-lg shadow-teal-200/50 animate-pulse' 
                      : 'bg-gray-100 border-gray-200 text-gray-400 scale-90'
                  }
                `}>
                  {isCompleted ? <Check size={14} strokeWidth={3} /> : step.icon}
                </div>
                <span className={`
                  text-[7px] font-black uppercase tracking-wider mt-1.5 text-center leading-tight max-w-[60px]
                  ${isCompleted ? 'text-[#1B9E9E]' : isCurrent ? 'text-gray-900' : 'text-gray-300'}
                `}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Punch Button */}
      <motion.button
        onClick={onPunch}
        className="relative group w-full p-1"
        animate={!isClockedIn ? { 
          scale: [1, 1.02, 1],
        } : {}}
        transition={{ 
          duration: 2, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      >
        <div className={`
          absolute inset-0 rounded-[2rem] blur-2xl opacity-40 transition-all duration-500 group-hover:opacity-70
          ${punchCount >= 4 
            ? 'bg-amber-500/50' 
            : isClockedIn ? 'bg-red-500/50' : 'bg-green-500/80'
          }
        `} />
        
        <div className={`
          relative flex flex-col items-center justify-center gap-3 w-full py-10 px-6 rounded-[2rem] 
          border-b-4 shadow-2xl transition-all duration-300 transform active:scale-95 overflow-hidden
          ${punchCount >= 4
            ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 border-amber-600 text-white shadow-amber-400/60'
            : isClockedIn 
              ? 'bg-gradient-to-br from-red-500 via-red-600 to-red-700 border-red-800 text-white shadow-red-500/60' 
              : 'bg-gradient-to-br from-green-500 via-green-600 to-green-700 border-green-800 text-white shadow-green-500/60'
          }
        `}>
          <AnimatePresence mode="wait">
            <motion.div
              key={nextPunchLabel || (isClockedIn ? 'stop' : 'start')}
              initial={{ opacity: 0, scale: 0.8, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.8, rotate: 20 }}
              className="p-5 rounded-full bg-white/20 backdrop-blur-md shadow-inner"
            >
              {punchCount >= 4 
                ? <Zap fill="currentColor" size={36} /> 
                : isClockedIn 
                  ? <Square fill="currentColor" size={36} /> 
                  : <Play fill="currentColor" size={36} />
              }
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-col items-center">
            <span className={`text-[10px] font-black uppercase tracking-[0.3em] mb-1 opacity-80 ${
              punchCount >= 4 ? 'text-amber-100' : isClockedIn ? 'text-red-100' : 'text-green-100'
            }`}>
              Próximo Registro
            </span>
            <AnimatePresence mode="wait">
              <motion.span 
                key={nextPunchLabel}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="text-2xl font-display font-black uppercase tracking-[0.1em] text-center leading-tight"
              >
                {nextPunchLabel || (isClockedIn ? 'Saída' : 'Entrada')}
              </motion.span>
            </AnimatePresence>
            <span className={`text-[9px] font-bold uppercase tracking-[0.2em] mt-2 py-1 px-3 rounded-full border ${
              punchCount >= 4 
                ? 'bg-amber-100/20 border-amber-200/30' 
                : isClockedIn ? 'bg-red-100/20 border-red-200/30' : 'bg-white/10 border-white/20'
            }`}>
              Bater Ponto Agora
            </span>
          </div>

          {/* Animated Background Element */}
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-all duration-700" />
        </div>
      </motion.button>

      {/* Status Badge */}
      <motion.div 
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 3 }}
        className={`
          flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border
          ${punchCount >= 4
            ? 'bg-amber-50 text-amber-600 border-amber-100'
            : isClockedIn 
              ? 'bg-green-50 text-green-600 border-green-100' 
              : 'bg-gray-50 text-gray-400 border-gray-100'
          }
        `}
      >
        <div className={`w-2 h-2 rounded-full ${
          punchCount >= 4
            ? 'bg-amber-500 animate-ping'
            : isClockedIn ? 'bg-green-500 animate-ping' : 'bg-gray-300'
        }`} />
        {punchCount >= 4 
          ? 'Jornada Concluída • Hora Extra' 
          : isClockedIn ? 'Trabalhando Agora' : 'Ponto Aberto'
        }
      </motion.div>
    </div>
  );
}
