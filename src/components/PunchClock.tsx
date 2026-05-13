import { useEffect, useState } from 'react';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Play, Square } from 'lucide-react';
import { getBrasiliaNow, formatBrasilia } from '../lib/dateUtils';

interface PunchClockProps {
  onPunch: () => void;
  isClockedIn: boolean;
  nextPunchLabel?: string;
}

export default function PunchClock({ onPunch, isClockedIn, nextPunchLabel }: PunchClockProps) {
  const [now, setNow] = useState(getBrasiliaNow());

  useEffect(() => {
    const timer = setInterval(() => setNow(getBrasiliaNow()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-sm">
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
          ${isClockedIn ? 'bg-red-500/50' : 'bg-[#1B9E9E]/80'}
        `} />
        
        <div className={`
          relative flex flex-col items-center justify-center gap-3 w-full py-10 px-6 rounded-[2rem] 
          border-b-4 shadow-2xl transition-all duration-300 transform active:scale-95 overflow-hidden
          ${isClockedIn 
            ? 'bg-gradient-to-br from-white to-red-50 border-red-200 text-red-600' 
            : 'bg-gradient-to-br from-[#1B9E9E] via-[#22C5C5] to-[#127272] border-[#158282] text-white shadow-[#1B9E9E]/60'
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
              {isClockedIn ? <Square fill="currentColor" size={36} /> : <Play fill="currentColor" size={36} />}
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-col items-center">
            <span className={`text-[10px] font-black uppercase tracking-[0.3em] mb-1 opacity-60 ${isClockedIn ? 'text-red-400' : 'text-teal-100'}`}>
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
              isClockedIn ? 'bg-red-100/20 border-red-200/30' : 'bg-white/10 border-white/20'
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
          ${isClockedIn 
            ? 'bg-green-50 text-green-600 border-green-100' 
            : 'bg-gray-50 text-gray-400 border-gray-100'
          }
        `}
      >
        <div className={`w-2 h-2 rounded-full ${isClockedIn ? 'bg-green-500 animate-ping' : 'bg-gray-300'}`} />
        {isClockedIn ? 'Trabalhando Agora' : 'Ponto Aberto'}
      </motion.div>
    </div>
  );
}
