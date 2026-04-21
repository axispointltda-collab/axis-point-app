import React, { useState, useMemo, FormEvent, useEffect, useRef } from 'react';
import Calendar from './components/Calendar';
import PunchClock from './components/PunchClock';
import AuthView from './components/AuthView';
import { isSameDay, setHours, setMinutes, setSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, 
  ListTodo, 
  LogIn, 
  LogOut, 
  Trash2, 
  Clock, 
  History, 
  PlusCircle, 
  X, 
  Check,
  Edit2,
  LogOut as LogoutIcon,
  Users,
  Monitor,
  ArrowLeft,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { getBrasiliaNow, formatBrasilia } from './lib/dateUtils';

interface PunchRecord {
  id: string;
  type: 'in' | 'out';
  timestamp: Date;
  isManual?: boolean;
  ownerEmail?: string;
}

interface Company {
  id: string;
  name: string;
  adminEmail: string;
  password?: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  companyId: string;
  password?: string;
  photo?: string;
}

interface FullPunchRecord extends PunchRecord {
  employeeId: string;
  employeeName: string;
}

export default function App() {
  const [user, setUser] = useState<string | null>(() => localStorage.getItem('flow_user'));
  const [userRole, setUserRole] = useState<'admin' | 'company' | 'employee' | null>(() => localStorage.getItem('flow_role') as any);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('flow_isAdmin') === 'true');
  const [activeTab, setActiveTab] = useState<'clock' | 'history' | 'monitor' | 'team' | 'admin'>('clock');
  const [selectedDate, setSelectedDate] = useState(getBrasiliaNow());
  
  // Real Records
  const [records, setRecords] = useState<PunchRecord[]>(() => {
    const saved = localStorage.getItem('flow_records');
    if (!saved) return [];
    try {
      return JSON.parse(saved).map((r: any) => ({ ...r, timestamp: new Date(r.timestamp) }));
    } catch { return []; }
  });

  const [companies, setCompanies] = useState<Company[]>(() => {
    const saved = localStorage.getItem('flow_companies');
    return saved ? JSON.parse(saved) : [];
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('flow_employees');
    return saved ? JSON.parse(saved) : [];
  });

  const [allPunchRecords, setAllPunchRecords] = useState<FullPunchRecord[]>(() => {
    const saved = localStorage.getItem('flow_all_records');
    if (!saved) return [];
    try {
      return JSON.parse(saved).map((r: any) => ({ ...r, timestamp: new Date(r.timestamp) }));
    } catch { return []; }
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('flow_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('flow_companies', JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem('flow_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('flow_all_records', JSON.stringify(allPunchRecords));
  }, [allPunchRecords]);
  
  // Manual Entry States
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualTime, setManualTime] = useState('09:00');
  const [manualType, setManualType] = useState<'in' | 'out'>('in');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Company/Employee Creation States
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(() => localStorage.getItem('flow_selectedCompanyId'));
  const [selectedEmployeeForDetail, setSelectedEmployeeForDetail] = useState<string | null>(null);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyEmail, setNewCompanyEmail] = useState('');
  const [newCompanyPassword, setNewCompanyPassword] = useState('');
  const [selectedCompanyForEmployee, setSelectedCompanyForEmployee] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [newEmployeePassword, setNewEmployeePassword] = useState('');
  const [newEmployeePhoto, setNewEmployeePhoto] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [editEmployeeName, setEditEmployeeName] = useState('');
  const [editEmployeeEmail, setEditEmployeeEmail] = useState('');
  const [editEmployeePassword, setEditEmployeePassword] = useState('');
  const [editEmployeePhoto, setEditEmployeePhoto] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEmployeePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditEmployeePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startEditEmployee = (emp: Employee) => {
    setEditingEmployeeId(emp.id);
    setEditEmployeeName(emp.name);
    setEditEmployeeEmail(emp.email);
    setEditEmployeePassword(emp.password || '');
    setEditEmployeePhoto(emp.photo || null);
  };

  const handleUpdateEmployee = (e: FormEvent) => {
    e.preventDefault();
    setEmployees(prev => prev.map(emp => 
      emp.id === editingEmployeeId ? {
        ...emp,
        name: editEmployeeName,
        email: editEmployeeEmail,
        password: editEmployeePassword,
        photo: editEmployeePhoto || undefined
      } : emp
    ));

    // Fix historical names to match new names (optional syncing)
    setAllPunchRecords(prev => prev.map(r => 
      r.employeeId === editingEmployeeId ? { ...r, employeeName: editEmployeeName } : r
    ));

    setEditingEmployeeId(null);
  };

  const handleLogin = (email: string) => {
    setUser(email);
    localStorage.setItem('flow_user', email);
    const lowerEmail = email.toLowerCase();
    
    // Check if Super Admin
    if (lowerEmail === 'admin@flow.com') {
      setIsAdmin(true);
      localStorage.setItem('flow_isAdmin', 'true');
      setUserRole('admin');
      localStorage.setItem('flow_role', 'admin');
      setActiveTab('clock');
      return;
    }

    // Check if Company
    const company = companies.find(c => c.adminEmail.toLowerCase() === lowerEmail);
    if (company) {
      setIsAdmin(true);
      localStorage.setItem('flow_isAdmin', 'true');
      setUserRole('company');
      localStorage.setItem('flow_role', 'company');
      setSelectedCompanyId(company.id);
      localStorage.setItem('flow_selectedCompanyId', company.id);
      setActiveTab('monitor');
      return;
    }

    // Fallback to Employee
    setIsAdmin(false);
    localStorage.setItem('flow_isAdmin', 'false');
    setUserRole('employee');
    localStorage.setItem('flow_role', 'employee');
    setActiveTab('clock');
  };

  const handleLogout = () => {
    setUser(null);
    setUserRole(null);
    setIsAdmin(false);
    setSelectedCompanyId(null);
    localStorage.removeItem('flow_user');
    localStorage.removeItem('flow_role');
    localStorage.removeItem('flow_isAdmin');
    localStorage.removeItem('flow_selectedCompanyId');
    // We keep companies/records saved for next login
  };

  const handleCreateCompany = (e: FormEvent) => {
    e.preventDefault();
    const newCompany: Company = {
      id: Math.random().toString(36).substring(7),
      name: newCompanyName,
      adminEmail: newCompanyEmail,
      password: newCompanyPassword,
    };
    setCompanies(prev => [...prev, newCompany]);
    setNewCompanyName('');
    setNewCompanyEmail('');
    setNewCompanyPassword('');
  };

  const handleCreateEmployee = (e: FormEvent) => {
    e.preventDefault();
    // Use selectedCompanyId if available (from dashboard) or fallback to selector
    const targetCompanyId = selectedCompanyId || selectedCompanyForEmployee;
    if (!targetCompanyId) return;

    const newEmployee: Employee = {
      id: Math.random().toString(36).substring(7),
      name: newEmployeeName,
      email: newEmployeeEmail,
      companyId: targetCompanyId,
      password: newEmployeePassword,
      photo: newEmployeePhoto || undefined,
    };
    setEmployees(prev => [...prev, newEmployee]);
    setNewEmployeeName('');
    setNewEmployeeEmail('');
    setNewEmployeePassword('');
    setNewEmployeePhoto(null);
  };

  // Registros são criados apenas por ações reais de ponto (entrada/saída)

  const myRecords = useMemo(() => {
    return records.filter(r => r.ownerEmail === user);
  }, [records, user]);

  const isClockedIn = useMemo(() => {
    if (myRecords.length === 0) return false;
    // Ignora lançamentos futuros (como ponto manual) para não travar o status atual
    const nowMs = getBrasiliaNow().getTime();
    const pastRecords = myRecords.filter(r => r.timestamp.getTime() <= nowMs + 60000); // 1 min leniency
    
    if (pastRecords.length === 0) return false;
    
    const sorted = [...pastRecords].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return sorted[0].type === 'in';
  }, [myRecords]);

  const recordedDays = useMemo(() => {
    const days = new Set<string>();
    myRecords.forEach(r => {
      days.add(formatBrasilia(r.timestamp, 'yyyy-MM-dd'));
    });
    return Array.from(days);
  }, [myRecords]);

  const groupedRecords = useMemo(() => {
    const sorted = [...myRecords].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const groups: { [key: string]: PunchRecord[] } = {};
    
    sorted.forEach(record => {
      const dateKey = formatBrasilia(record.timestamp, 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(record);
    });

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [myRecords]);

  const handlePunch = () => {
    const now = getBrasiliaNow();
    const newRecord: PunchRecord = {
      id: Math.random().toString(36).substring(7),
      type: isClockedIn ? 'out' : 'in',
      timestamp: now,
      ownerEmail: user || undefined,
    };
    setRecords(prev => [...prev, newRecord]);
    
    // Sync with global logs for company view real-time demo
    if (userRole === 'employee') {
      const currentEmployee = employees.find(e => e.email.toLowerCase() === user?.toLowerCase());
      if (currentEmployee) {
        const fullRecord: FullPunchRecord = {
          ...newRecord,
          employeeId: currentEmployee.id,
          employeeName: currentEmployee.name,
        };
        setAllPunchRecords(prev => [fullRecord, ...prev]);
      }
    }
    
    setSelectedDate(now);
  };

  const handleAddManual = () => {
    const [hours, minutes] = manualTime.split(':').map(Number);
    let targetDate = setSeconds(setMinutes(setHours(selectedDate, hours), minutes), 0);
    
    if (editingId) {
      setRecords(prev => prev.map(r => 
        r.id === editingId ? { ...r, timestamp: targetDate, type: manualType, isManual: true } : r
      ));
      
      // Update in all records too
      setAllPunchRecords(prev => prev.map(r => 
        r.id === editingId ? { ...r, timestamp: targetDate, type: manualType, isManual: true } : r
      ));
      
      setEditingId(null);
    } else {
      const newRecord: PunchRecord = {
        id: Math.random().toString(36).substring(7),
        type: manualType,
        timestamp: targetDate,
        isManual: true,
        ownerEmail: user || undefined,
      };
      setRecords(prev => [...prev, newRecord]);

      // Sync with global logs for company view if acting as employee
      if (userRole === 'employee') {
        const currentEmployee = employees.find(e => e.email.toLowerCase() === user?.toLowerCase());
        if (currentEmployee) {
          const fullRecord: FullPunchRecord = {
            ...newRecord,
            employeeId: currentEmployee.id,
            employeeName: currentEmployee.name,
          };
          setAllPunchRecords(prev => [fullRecord, ...prev]);
        }
      }
    }
    setShowManualForm(false);
  };

  const startEdit = (record: PunchRecord) => {
    setEditingId(record.id);
    setManualTime(formatBrasilia(record.timestamp, 'HH:mm'));
    setManualType(record.type);
    setShowManualForm(true);
  };

  const removeRecord = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  // Lists
  const filteredPunchRecords = useMemo(() => {
    if (!selectedCompanyId) return allPunchRecords;
    const companyEmployees = employees.filter(e => e.companyId === selectedCompanyId).map(e => e.id);
    return allPunchRecords.filter(r => companyEmployees.includes(r.employeeId));
  }, [allPunchRecords, employees, selectedCompanyId]);

  const employeeDetailedRecords = useMemo(() => {
    if (!selectedEmployeeForDetail) return [];
    const raw = allPunchRecords
      .filter(r => r.employeeId === selectedEmployeeForDetail)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
    const groups: { date: Date; records: FullPunchRecord[] }[] = [];
    raw.forEach(record => {
      const existing = groups.find(g => isSameDay(g.date, record.timestamp));
      if (existing) {
        existing.records.push(record);
      } else {
        groups.push({ date: record.timestamp, records: [record] });
      }
    });
    return groups;
  }, [allPunchRecords, selectedEmployeeForDetail]);

  const filteredEmployees = useMemo(() => {
    if (!selectedCompanyId) return employees;
    return employees.filter(e => e.companyId === selectedCompanyId);
  }, [employees, selectedCompanyId]);

  if (!user) {
    return <AuthView onLogin={handleLogin} companies={companies} employees={employees} />;
  }

  return (
    <div className="min-h-screen bg-[#f1f3f5] flex flex-col items-center">
      <div className="w-full max-w-lg min-h-screen flex flex-col p-6 md:p-8 space-y-8">
        
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm">
              <img src="/logo.svg" alt="AxisPoint" className="w-full h-full" />
            </div>
            <div>
              <h1 className="text-lg font-display font-black uppercase tracking-tighter text-gray-900 leading-none">
                AxisPoint
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#1B9E9E] bg-teal-50 px-1.5 py-0.5 rounded leading-none italic">PRO</span>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">
                  {user.split('@')[0]}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`
               px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border transition-colors bg-green-50 text-green-600 border-green-100
            `}>
               ONLINE
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Sair"
            >
              <LogoutIcon size={18} />
            </button>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="flex p-1 bg-gray-200/50 rounded-2xl shadow-inner overflow-x-auto no-scrollbar">
          {userRole !== 'company' && (
            <>
              <button 
                onClick={() => setActiveTab('clock')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all min-w-fit
                  ${activeTab === 'clock' ? 'bg-white text-[#1B9E9E] shadow-sm' : 'text-gray-500 hover:text-gray-700'}
                `}
              >
                <Clock size={16} />
                Relógio
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all min-w-fit
                  ${activeTab === 'history' ? 'bg-white text-[#1B9E9E] shadow-sm' : 'text-gray-500 hover:text-gray-700'}
                `}
              >
                <History size={16} />
                Registros
              </button>
            </>
          )}
          {isAdmin && selectedCompanyId && (
            <>
              <button 
                onClick={() => setActiveTab('monitor')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all min-w-fit
                  ${activeTab === 'monitor' ? 'bg-white text-[#1B9E9E] shadow-sm' : 'text-gray-500 hover:text-gray-700'}
                `}
              >
                <Monitor size={16} />
                Registro
              </button>
              <button 
                onClick={() => setActiveTab('team')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all min-w-fit
                  ${activeTab === 'team' ? 'bg-white text-[#1B9E9E] shadow-sm' : 'text-gray-500 hover:text-gray-700'}
                `}
              >
                <Users size={16} />
                Gestão de Equipe
              </button>
            </>
          )}
          {userRole === 'admin' && (
            <button 
              onClick={() => setActiveTab('admin')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all min-w-fit
                ${activeTab === 'admin' ? 'bg-white text-[#1B9E9E] shadow-sm' : 'text-gray-500 hover:text-gray-700'}
              `}
            >
              <Briefcase size={16} />
              Empresas
            </button>
          )}
        </nav>

        {/* Content Area */}
        <main className="flex-1 space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === 'clock' ? (
              <motion.div
                key="clock-tab"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-8"
              >
                <Calendar 
                  selectedDate={selectedDate} 
                  onDateSelect={setSelectedDate} 
                  recordedDays={recordedDays}
                />

                <div className="flex justify-center">
                  <button 
                    onClick={() => {
                      setEditingId(null);
                      setManualTime(formatBrasilia(getBrasiliaNow(), 'HH:mm'));
                      setManualType(isClockedIn ? 'out' : 'in');
                      setShowManualForm(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-teal-100 text-[#1B9E9E] rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-teal-50 transition-all shadow-sm active:scale-95"
                  >
                    <PlusCircle size={16} />
                    Novo Ponto Manual
                  </button>
                </div>

                <div className="flex justify-center pb-12">
                  <PunchClock 
                    onPunch={handlePunch} 
                    isClockedIn={isClockedIn} 
                  />
                </div>
              </motion.div>
            ) : activeTab === 'history' ? (
              <motion.div
                key="history-tab"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between pt-4 border-b border-gray-200 pb-4">
                  <div className="flex items-center gap-2">
                    <ListTodo size={18} className="text-gray-400" />
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                      Histórico Completo
                    </h3>
                  </div>
                </div>

                <div className="space-y-8">
                  {groupedRecords.length === 0 ? (
                    <div className="bg-white/50 border border-dashed border-gray-300 rounded-2xl p-12 text-center">
                      <p className="text-sm font-medium text-gray-400 italic">
                        Nenhum registro no sistema.
                      </p>
                    </div>
                  ) : (
                    groupedRecords.map(([dateKey, dayRecords]) => (
                      <div key={dateKey} className="space-y-3">
                        <div className="sticky top-0 z-10 py-2 bg-[#f1f3f5]/80 backdrop-blur-md">
                           <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1B9E9E]">
                                {formatBrasilia(dayRecords[0].timestamp, "dd 'de' MMMM", ptBR)}
                              </span>
                              <div className="h-px flex-1 bg-gray-200" />
                           </div>
                        </div>
                        
                        {dayRecords.map((record) => (
                          <motion.div
                            key={record.id}
                            layout
                            className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100 group"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-xl ${record.type === 'in' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                {record.type === 'in' ? <LogIn size={18} /> : <LogOut size={18} />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-gray-900">
                                    {record.type === 'in' ? 'Entrada' : 'Saída'}
                                  </p>
                                  {record.isManual && (
                                    <span className="text-[8px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded uppercase font-black">Manual</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 font-medium">
                                  Registrado às {formatBrasilia(record.timestamp, 'HH:mm:ss')}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button 
                                onClick={() => startEdit(record)}
                                className="p-2 text-gray-300 hover:text-[#1B9E9E] hover:bg-teal-50 rounded-lg transition-all"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => removeRecord(record.id)}
                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            ) : activeTab === 'monitor' ? (
              <motion.div
                key="monitor-tab"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6"
              >
                {!selectedCompanyId ? (
                   <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                     <div className="p-4 bg-gray-100 rounded-full text-gray-400">
                       <Briefcase size={32} />
                     </div>
                     <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Selecione uma empresa primeiro</p>
                     <button 
                        onClick={() => setActiveTab('admin')}
                        className="px-6 py-2 bg-[#1B9E9E] text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                     >
                        Ver Empresas
                     </button>
                   </div>
                ) : selectedEmployeeForDetail ? (
                   <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                      <div className="flex items-center justify-between px-2">
                        <button 
                          onClick={() => setSelectedEmployeeForDetail(null)}
                          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#1B9E9E] transition-colors"
                        >
                          <ArrowLeft size={14} />
                          Voltar para todos
                        </button>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#1B9E9E]">
                          {employees.find(e => e.id === selectedEmployeeForDetail)?.name || 'Funcionário'}
                        </h3>
                      </div>

                      <div className="space-y-8">
                        {employeeDetailedRecords.length === 0 ? (
                          <div className="bg-white/50 border border-dashed border-gray-300 rounded-2xl p-12 text-center">
                            <p className="text-sm font-medium text-gray-400 italic">Nenhum registro encontrado para este funcionário.</p>
                          </div>
                        ) : (
                          employeeDetailedRecords.map(group => (
                            <div key={group.date instanceof Date ? group.date.toISOString() : Math.random().toString()} className="space-y-3">
                              <div className="flex items-center gap-3 px-2">
                                <div className="h-px flex-1 bg-gray-200" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                  {group.date instanceof Date && !isNaN(group.date.getTime()) 
                                    ? formatBrasilia(group.date, "EEEE, dd 'de' MMMM", ptBR)
                                    : 'Data Inválida'}
                                </span>
                                <div className="h-px flex-1 bg-gray-200" />
                              </div>

                              <div className="space-y-3">
                                {group.records.map(record => (
                                  <div key={record.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                      <div className={`p-2.5 rounded-xl ${record.type === 'in' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                        {record.type === 'in' ? <LogIn size={16} /> : <LogOut size={16} />}
                                      </div>
                                      <div>
                                        <p className="text-sm font-bold text-gray-900 capitalize">{record.type === 'in' ? 'Entrada' : 'Saída'}</p>
                                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Registrado via App</p>
                                      </div>
                                    </div>
                                    <div className="bg-gray-50 px-4 py-2 rounded-2xl">
                                      <p className="text-sm font-mono font-black text-gray-900 leading-none">
                                        {formatBrasilia(record.timestamp, 'HH:mm:ss')}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                   </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                       <div className="flex items-center gap-2">
                          <Monitor size={16} className="text-[#1B9E9E] animate-pulse" />
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Acompanhamento de Registros</h4>
                       </div>
                       <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-[8px] font-bold text-green-600 uppercase tracking-widest">Ao vivo agora</span>
                       </div>
                    </div>

                    <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-xl shadow-gray-200/40">
                      <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">
                          {companies.find(c => c.id === selectedCompanyId)?.name} • LOGS
                        </span>
                        <span className="text-[9px] font-medium text-gray-500">
                          {formatBrasilia(getBrasiliaNow(), 'HH:mm:ss')}
                        </span>
                      </div>
                      <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                        {filteredEmployees.length === 0 ? (
                           <div className="p-12 text-center text-gray-400">
                             <p className="text-[10px] italic uppercase tracking-widest leading-relaxed">Nenhum funcionário cadastrado nesta empresa.</p>
                           </div>
                        ) : (
                          filteredEmployees.map(employee => {
                            const lastRecord = allPunchRecords
                              .filter(r => r.employeeId === employee.id)
                              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

                            return (
                              <button 
                                key={employee.id} 
                                onClick={() => setSelectedEmployeeForDetail(employee.id)}
                                className="w-full p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors group text-left"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-teal-50 text-[#1B9E9E] rounded-2xl flex items-center justify-center font-black text-sm uppercase overflow-hidden">
                                    {employee.photo ? (
                                      <img src={employee.photo} alt={employee.name} className="w-full h-full object-cover" />
                                    ) : (
                                      employee.name.substring(0, 2)
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-black text-gray-900 group-hover:text-[#1B9E9E] transition-colors uppercase tracking-tight">{employee.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {lastRecord ? (
                                        <>
                                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${lastRecord.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {lastRecord.type === 'in' ? 'Entrada' : 'Saída'}
                                          </span>
                                          <span className="text-[9px] text-gray-400 font-medium">Última atividade: {formatBrasilia(lastRecord.timestamp, 'dd/MM/yyyy')}</span>
                                        </>
                                      ) : (
                                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-400">Sem registros</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  {lastRecord && (
                                    <div className="bg-gray-100 px-3 py-1.5 rounded-xl group-hover:bg-teal-100 group-hover:text-[#1a9e9e] transition-colors">
                                      <p className="text-xs font-mono font-black text-gray-900 group-hover:text-[#1a9e9e] leading-none">{formatBrasilia(lastRecord.timestamp, 'HH:mm:ss')}</p>
                                    </div>
                                  )}
                                  <p className="text-[8px] font-black text-[#1B9E9E] uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all">Ver Detalhes</p>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : activeTab === 'team' ? (
              <motion.div
                key="team-tab"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-8"
              >
                {!selectedCompanyId ? (
                   <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                     <div className="p-4 bg-gray-100 rounded-full text-gray-400">
                       <Briefcase size={32} />
                     </div>
                     <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Selecione uma empresa primeiro</p>
                     <button 
                        onClick={() => setActiveTab('admin')}
                        className="px-6 py-2 bg-[#1B9E9E] text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                     >
                        Ver Empresas
                     </button>
                   </div>
                ) : (
                  <>
                    {editingEmployeeId ? (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center justify-between px-2">
                          <button 
                            onClick={() => setEditingEmployeeId(null)}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#1B9E9E] transition-colors"
                          >
                            <ArrowLeft size={14} />
                            Voltar
                          </button>
                          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#1B9E9E]">
                            Editar Funcionário
                          </h3>
                        </div>

                        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100">
                          <form onSubmit={handleUpdateEmployee} className="space-y-5">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Nome Completo</label>
                              <input 
                                type="text"
                                required
                                value={editEmployeeName}
                                onChange={(e) => setEditEmployeeName(e.target.value)}
                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-[#1B9E9E] transition-colors"
                              />
                            </div>
                            
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">E-mail de Acesso</label>
                              <input 
                                type="email"
                                required
                                value={editEmployeeEmail}
                                onChange={(e) => setEditEmployeeEmail(e.target.value)}
                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-[#1B9E9E] transition-colors"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Atualizar Senha (Opcional)</label>
                              <input 
                                type="password"
                                value={editEmployeePassword}
                                onChange={(e) => setEditEmployeePassword(e.target.value)}
                                placeholder="Deixe em branco para manter a atual"
                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-[#1B9E9E] transition-colors"
                              />
                            </div>

                            <div className="space-y-1.5 pt-2">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Foto de Perfil</label>
                              <div className="flex items-center gap-4">
                                <div 
                                  onClick={() => editFileInputRef.current?.click()}
                                  className="w-16 h-16 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 cursor-pointer hover:border-[#1B9E9E] hover:text-[#1B9E9E] transition-colors overflow-hidden relative group"
                                >
                                  {editEmployeePhoto ? (
                                    <>
                                      <img src={editEmployeePhoto} alt="Preview" className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera size={20} className="text-white" />
                                      </div>
                                    </>
                                  ) : (
                                    <ImageIcon size={24} />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-gray-500">Clique ao lado para alterar a foto.</p>
                                </div>
                                <input 
                                  type="file" 
                                  ref={editFileInputRef} 
                                  onChange={handleEditPhotoUpload} 
                                  accept="image/*" 
                                  className="hidden" 
                                />
                              </div>
                            </div>

                            <button 
                              type="submit"
                              className="w-full py-4 bg-[#1B9E9E] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#1a3551] transition-all shadow-lg mt-4"
                            >
                              Salvar Alterações
                            </button>
                          </form>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                          <Users size={24} />
                        </div>
                        <div>
                           <h3 className="text-xl font-serif font-black tracking-tight text-gray-900 leading-none">Cadastrar Funcionário</h3>
                           <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                             Gestão de Equipe: {companies.find(c => c.id === selectedCompanyId)?.name}
                           </p>
                        </div>
                      </div>

                      <form onSubmit={handleCreateEmployee} className="space-y-5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Nome Completo</label>
                          <input 
                            type="text"
                            required
                            value={newEmployeeName}
                            onChange={(e) => setNewEmployeeName(e.target.value)}
                            placeholder="Nome do colaborador"
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-[#1B9E9E] transition-colors"
                          />
                        </div>
                        
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">E-mail de Acesso</label>
                          <input 
                            type="email"
                            required
                            value={newEmployeeEmail}
                            onChange={(e) => setNewEmployeeEmail(e.target.value)}
                            placeholder="colaborador@empresa.com"
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-[#1B9E9E] transition-colors"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Senha Provisória</label>
                          <input 
                            type="password"
                            required
                            value={newEmployeePassword}
                            onChange={(e) => setNewEmployeePassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-[#1B9E9E] transition-colors"
                          />
                        </div>

                        <div className="space-y-1.5 pt-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Foto de Perfil (Opcional)</label>
                          <div className="flex items-center gap-4">
                            <div 
                              onClick={() => fileInputRef.current?.click()}
                              className="w-16 h-16 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 cursor-pointer hover:border-[#1B9E9E] hover:text-[#1B9E9E] transition-colors overflow-hidden relative group"
                            >
                              {newEmployeePhoto ? (
                                <>
                                  <img src={newEmployeePhoto} alt="Preview" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera size={20} className="text-white" />
                                  </div>
                                </>
                              ) : (
                                <ImageIcon size={24} />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-medium text-gray-500">Clique ao lado para adicionar uma foto.</p>
                              <p className="text-[10px] text-gray-400">JPG, PNG. Máx 2MB recomendado.</p>
                            </div>
                            <input 
                              type="file" 
                              ref={fileInputRef} 
                              onChange={handlePhotoUpload} 
                              accept="image/*" 
                              className="hidden" 
                            />
                          </div>
                        </div>

                        <button 
                          type="submit"
                          className="w-full py-4 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg mt-4"
                        >
                          Confirmar Cadastro
                        </button>
                      </form>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 px-2">
                        <Users size={16} className="text-gray-400" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Equipe Ativa</h4>
                      </div>
                      
                      {filteredEmployees.length === 0 ? (
                        <div className="p-10 border border-dashed border-gray-300 rounded-[2rem] text-center text-gray-400 text-xs italic">
                           Nenhum funcionário vinculado.
                        </div>
                      ) : (
                        filteredEmployees.map(emp => (
                          <div 
                            key={emp.id} 
                            onClick={() => startEditEmployee(emp)}
                            className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-between group cursor-pointer hover:border-[#1B9E9E] hover:shadow-md transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gray-50 text-gray-400 flex items-center justify-center rounded-2xl group-hover:bg-teal-50 group-hover:text-[#1B9E9E] transition-colors overflow-hidden">
                                {emp.photo ? (
                                  <img src={emp.photo} alt={emp.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Users size={20} />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900 group-hover:text-[#1a3551] transition-colors">{emp.name}</p>
                                <p className="text-xs text-gray-400 group-hover:text-[#1B9E9E]/70 transition-colors">{emp.email}</p>
                              </div>
                            </div>
                            <div className="bg-gray-50 p-2.5 rounded-xl text-gray-400 group-hover:bg-teal-100 group-hover:text-[#1B9E9E] transition-colors">
                               <Edit2 size={16} />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    </>
                  )}
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="admin-tab"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-8 pb-12"
              >
                <div className="flex items-center justify-between px-2">
                   <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Gestão de Empresas</h3>
                </div>

                <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-teal-50 text-[#1B9E9E] rounded-2xl">
                      <PlusCircle size={24} />
                    </div>
                    <div>
                       <h3 className="text-xl font-serif font-black tracking-tight text-gray-900 leading-none">Criar Empresa</h3>
                       <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Configurações de Administrador</p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateCompany} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Nome da Empresa</label>
                      <input 
                        type="text"
                        required
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                        placeholder="Ex: Flow Tech LTDA"
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-[#1B9E9E] transition-colors"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">E-mail do Gestor</label>
                      <input 
                        type="email"
                        required
                        value={newCompanyEmail}
                        onChange={(e) => setNewCompanyEmail(e.target.value)}
                        placeholder="gestor@empresa.com"
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-[#1B9E9E] transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Senha Inicial</label>
                      <input 
                        type="password"
                        required
                        value={newCompanyPassword}
                        onChange={(e) => setNewCompanyPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-[#1B9E9E] transition-colors"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-4 bg-[#1B9E9E] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#1a3551] transition-all shadow-lg shadow-teal-200/50"
                    >
                      Cadastrar Empresa
                    </button>
                  </form>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <ListTodo size={16} className="text-gray-400" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Empresas Cadastradas</h4>
                  </div>
                  
                  {companies.length === 0 ? (
                    <div className="p-10 border border-dashed border-gray-300 rounded-[2rem] text-center text-gray-400 text-xs italic">
                       Nenhuma empresa cadastrada.
                    </div>
                  ) : (
                    companies.map(company => (
                      <button 
                        key={company.id} 
                        onClick={() => {
                          setSelectedCompanyId(company.id);
                          setActiveTab('monitor');
                        }}
                        className="w-full bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-between group active:scale-95 transition-all text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-100 text-gray-400 flex items-center justify-center rounded-2xl group-hover:bg-teal-50 group-hover:text-[#1B9E9E] transition-colors">
                            <Briefcase size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{company.name}</p>
                            <p className="text-xs text-gray-400">{company.adminEmail}</p>
                          </div>
                        </div>
                        <div className="p-2 text-[8px] bg-green-50 text-green-600 rounded uppercase font-black">Gerenciar</div>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Manual Modal Overlay */}
        <AnimatePresence>
          {showManualForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-serif font-black tracking-tight text-gray-900">
                        {editingId ? 'Editar Ponto' : 'Novo Registro'}
                      </h3>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                        Para {formatBrasilia(selectedDate, 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <button 
                      onClick={() => setShowManualForm(false)}
                      className="p-2 bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Type Selector */}
                    <div className="flex p-1 bg-gray-100 rounded-2xl">
                      <button 
                        onClick={() => setManualType('in')}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                          ${manualType === 'in' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}
                        `}
                      >
                        Entrada
                      </button>
                      <button 
                        onClick={() => setManualType('out')}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                          ${manualType === 'out' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400'}
                        `}
                      >
                        Saída
                      </button>
                    </div>

                    {/* Time Input */}
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Horário</label>
                       <input 
                        type="time" 
                        value={manualTime}
                        onChange={(e) => setManualTime(e.target.value)}
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-2xl font-display font-bold text-gray-900 focus:outline-none focus:border-[#1B9E9E] transition-colors"
                       />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <button 
                        onClick={() => setShowManualForm(false)}
                        className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-all"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleAddManual}
                        className="flex-[2] py-4 bg-[#1B9E9E] text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-[#1a3551] transition-all shadow-lg shadow-teal-200 flex items-center justify-center gap-2"
                      >
                        <Check size={16} />
                        Confirmar
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="text-center pb-8">
           <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-300">
             Relógio de Ponto v2.0 • 2026
           </p>
        </footer>
      </div>
    </div>
  );
}
