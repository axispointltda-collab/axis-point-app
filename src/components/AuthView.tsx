import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Briefcase, UserPlus, LogIn } from 'lucide-react';

interface AuthViewProps {
  onLogin: (email: string) => void;
  companies: { adminEmail: string; password?: string }[];
  employees: { email: string; password?: string }[];
}

export default function AuthView({ onLogin, companies, employees }: AuthViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Simulando chamada de API
    setTimeout(() => {
      setIsLoading(false);
      
      const lowerEmail = email.toLowerCase();
      const adminEmail = 'admin@flow.com';
      const adminPass = '#Senhasecreta2e';

      // 1. Check Super Admin
      if (lowerEmail === adminEmail) {
        if (password === adminPass) {
          onLogin(email);
        } else {
          setError('Senha de administrador incorreta.');
        }
        return;
      }

      // 2. Check Companies
      const company = companies.find(c => c.adminEmail.toLowerCase() === lowerEmail);
      if (company) {
        if (company.password === password) {
          onLogin(email);
        } else {
          setError('Senha da empresa incorreta.');
        }
        return;
      }

      // 3. Check Employees
      const employee = employees.find(e => e.email.toLowerCase() === lowerEmail);
      if (employee) {
        if (employee.password === password) {
          onLogin(email);
        } else {
          setError('Senha do funcionário incorreta.');
        }
        return;
      }

      // 4. Fallback (error)
      setError('Usuário não encontrado ou senha inválida.');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#f1f3f5] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 overflow-hidden border border-gray-100"
      >
        <div className="p-8 md:p-12 space-y-10">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center space-y-4">
            <img src="/logo.svg" alt="AxisPoint" className="w-20 h-20 drop-shadow-xl" />
            <div>
              <h2 className="text-3xl font-display font-black uppercase tracking-tighter text-gray-900 leading-none">
                AxisPoint
              </h2>
              <p className="text-xs font-medium text-gray-400 mt-2">
                O controle de ponto que evolui com você.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-50 border border-red-100 p-3 rounded-xl text-red-500 text-[10px] font-bold uppercase tracking-wider text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">E-mail</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1B9E9E] transition-colors">
                    <Mail size={18} />
                  </div>
                  <input 
                    type="email" 
                    required
                    placeholder="exemplo@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium text-gray-900 focus:outline-none focus:border-[#1B9E9E] transition-colors placeholder:text-gray-300"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Senha</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1B9E9E] transition-colors">
                    <Lock size={18} />
                  </div>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-12 text-sm font-medium text-gray-900 focus:outline-none focus:border-[#1B9E9E] transition-colors placeholder:text-gray-300"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-[#1B9E9E] text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-[#167878] transition-all shadow-xl shadow-teal-200/50 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Entrar no Sistema
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Bottom Banner */}
        <div className="bg-gray-50 p-4 border-t border-gray-100">
           <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-300 text-center">
             Segurança AxisPoint • Criptografia de Ponta-a-Ponta
           </p>
        </div>
      </motion.div>
    </div>
  );
}
