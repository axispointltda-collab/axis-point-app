import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Briefcase, UserPlus, LogIn, Fingerprint } from 'lucide-react';

interface AuthViewProps {
  onLogin: (email: string) => void;
  companies: { adminEmail?: string; admin_email?: string; password?: string }[];
  employees: { email: string; password?: string }[];
}

export default function AuthView({ onLogin, companies, employees }: AuthViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasBiometric, setHasBiometric] = useState<boolean>(() => !!localStorage.getItem('flow_bio_id'));
  const [bioError, setBioError] = useState<string | null>(null);

  const base64urlToUint8Array = (base64url: string) => {
    const padding = '='.repeat((4 - base64url.length % 4) % 4);
    const base64 = (base64url + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };
  
  const bufferToBase64url = (buffer: ArrayBuffer) => {
    const byteRef = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < byteRef.byteLength; i++) {
        binary += String.fromCharCode(byteRef[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const handleEnableBiometrics = async (emailToSave: string) => {
    if (window.PublicKeyCredential && !localStorage.getItem('flow_bio_id')) {
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);
        
        const cred = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: "AxisPoint" },
            user: {
              id: userId,
              name: emailToSave,
              displayName: emailToSave
            },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
            authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
            timeout: 60000
          }
        }) as PublicKeyCredential;
        
        if (cred && cred.rawId) {
          localStorage.setItem('flow_bio_id', bufferToBase64url(cred.rawId));
          localStorage.setItem('flow_bio_email', emailToSave);
          setHasBiometric(true);
        }
      } catch(e) { 
        console.warn('Biometric setup rejected/failed or not supported.', e);
      }
    }
  };

  const handleBiometricLogin = async () => {
    setBioError(null);
    try {
      const storedId = localStorage.getItem('flow_bio_id');
      const storedEmail = localStorage.getItem('flow_bio_email');
      if (!storedId || !storedEmail) return;

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{
            type: 'public-key',
            id: base64urlToUint8Array(storedId),
            transports: ['internal']
          }],
          userVerification: "required"
        }
      });
      
      if (assertion) {
         onLogin(storedEmail);
      }
    } catch(e) {
      setBioError('A autenticação biométrica falhou ou foi cancelada.');
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Simulando chamada de API
    setTimeout(() => {
      setIsLoading(false);
      
      const lowerEmail = email.toLowerCase();
      const adminEmail = 'adminaxispoint@gmail.com';
      const adminPass = '#Senhasecreta2e';

      // 1. Check Super Admin
      if (lowerEmail === adminEmail) {
        if (password === adminPass) {
          handleEnableBiometrics(email).finally(() => onLogin(email));
        } else {
          setError('Senha de administrador incorreta.');
        }
        return;
      }

      // 2. Check Companies
      const company = companies.find(c => (c.adminEmail || c.admin_email)?.toLowerCase() === lowerEmail);
      if (company) {
        if (company.password === password) {
          handleEnableBiometrics(email).finally(() => onLogin(email));
        } else {
          setError('Senha da empresa incorreta.');
        }
        return;
      }

      // 3. Check Employees
      const employee = employees.find(e => e.email.toLowerCase() === lowerEmail);
      if (employee) {
        if (employee.password === password) {
          handleEnableBiometrics(email).finally(() => onLogin(email));
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
    <div className="h-full w-full overflow-y-auto bg-[#f1f3f5] flex items-center justify-center p-0 sm:p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full min-h-full sm:min-h-0 max-w-md bg-white sm:rounded-[2.5rem] sm:shadow-2xl sm:shadow-gray-200/50 overflow-hidden sm:border border-gray-100 flex flex-col justify-center"
      >
        <div className="p-6 sm:p-8 md:p-12 space-y-8 sm:space-y-10 flex-1 flex flex-col justify-center">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center space-y-4">
            <img src="/logo.png" alt="AxisPoint" className="w-28 h-28 object-contain drop-shadow-xl" />
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

            {hasBiometric && (
              <div className="mb-6 flex flex-col items-center">
                <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mb-6 border-4 border-teal-100 shadow-inner">
                  <Fingerprint size={48} className="text-[#1B9E9E]" />
                </div>
                <button 
                  type="button"
                  onClick={handleBiometricLogin}
                  className="w-full py-4 bg-[#1B9E9E] text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-[#167878] transition-all shadow-xl shadow-teal-200/50 flex items-center justify-center gap-3 group"
                >
                  Entrar com Biometria
                </button>
                <AnimatePresence>
                  {bioError && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-red-500 text-[10px] font-bold uppercase tracking-wider text-center mt-3"
                    >
                      {bioError}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {(!hasBiometric || showPassword) && (
              <>
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
                      Entrar com E-mail e Senha
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </>
            )}

            {hasBiometric && !showPassword && (
              <button 
                type="button"
                onClick={() => setShowPassword(true)}
                className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
              >
                Acessar usando E-mail e Senha
              </button>
            )}

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
