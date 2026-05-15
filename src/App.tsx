import React, { useState, useMemo, FormEvent, useEffect, useRef } from 'react';
import Calendar from './components/Calendar';
import PunchClock from './components/PunchClock';
import AuthView from './components/AuthView';
import { isSameDay, setHours, setMinutes, setSeconds, eachDayOfInterval, parseISO, subDays, differenceInHours } from 'date-fns';
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
  ChevronDown,
  FileText,
  Download,
  AlertTriangle,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Zap,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { getBrasiliaNow, formatBrasilia } from './lib/dateUtils';
import { supabase } from './supabase';

interface PunchRecord {
  id: string;
  type: 'in' | 'out';
  timestamp: Date;
  is_manual?: boolean;
  is_overtime?: boolean;
  employee_id: string;
  company_id: string;
}

interface Company {
  id: string;
  name: string;
  admin_email: string;
  password?: string;
}

interface Employee {
  id: string;
  company_id?: string;
  companyId?: string;
  name: string;
  email: string;
  password?: string;
  photo?: string;
  work_start?: string;
  work_end?: string;
  lunch_duration?: number;
  is_12x36?: boolean;
}

interface FullPunchRecord extends PunchRecord {
  employeeId: string;
  employeeName: string;
}

// Helpers para labels de ponto — State Machine rigorosa
const getPunchLabel = (index: number) => {
  const hour = getBrasiliaNow().getHours();
  const mealLabel = (hour >= 6 && hour <= 17) ? "Almoço" : "Janta";

  switch (index) {
    case 0: return "Começar Jornada";
    case 1: return `Saída ${mealLabel}`;
    case 2: return `Retorno ${mealLabel}`;
    case 3: return "Terminar Jornada";
    default: return index % 2 === 0 ? "Começar Extra" : "Terminar Extra";
  }
};

export default function App() {
  const [user, setUser] = useState<string | null>(() => localStorage.getItem('flow_user'));
  const [userRole, setUserRole] = useState<'admin' | 'company' | 'employee' | null>(() => localStorage.getItem('flow_role') as any);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('flow_isAdmin') === 'true');
  const [activeTab, setActiveTab] = useState<'clock' | 'history' | 'monitor' | 'team' | 'admin'>('clock');
  const [selectedDate, setSelectedDate] = useState(getBrasiliaNow());
  
  const [records, setRecords] = useState<PunchRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allPunchRecords, setAllPunchRecords] = useState<FullPunchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompaniesListExpanded, setIsCompaniesListExpanded] = useState(false);
  // Swipe gesture states
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [touchEnd, setTouchEnd] = useState<{x: number, y: number} | null>(null);

  // Initial Fetch from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch Companies
        const { data: dbCompanies } = await supabase.from('companies').select('*');
        if (dbCompanies) setCompanies(dbCompanies);

        // Fetch Employees
        const { data: dbEmployees } = await supabase.from('employees').select('*');
        if (dbEmployees) setEmployees(dbEmployees);

        // Fetch Records
        const { data: dbRecords } = await supabase.from('punch_records').select('*');
        if (dbRecords) {
          const formattedRecords = dbRecords.map(r => {
            const employee = dbEmployees?.find(e => e.id === r.employee_id);
            return {
              ...r,
              timestamp: new Date(r.timestamp),
              employeeId: r.employee_id || r.employeeId,
              employeeName: employee ? employee.name : 'Desconhecido'
            };
          });
          setAllPunchRecords(formattedRecords as any);
          
          // Filter for current user if applicable
          if ((userRole === 'employee' || userRole === 'admin') && user) {
            const employee = dbEmployees?.find(e => e.email.toLowerCase() === user.toLowerCase());
            if (employee) {
              setRecords(formattedRecords.filter(r => r.employee_id === employee.id) as any);
            } else if (userRole === 'admin') {
              const adminId = '00000000-0000-0000-0000-000000000000';
              if (!dbEmployees?.find(e => e.id === adminId)) {
                supabase.from('companies').upsert({ id: adminId, name: 'Administração', admin_email: 'adminaxispoint@gmail.com' }).then(() => {
                  supabase.from('employees').upsert({ id: adminId, company_id: adminId, name: 'Administrador Master', email: 'adminaxispoint@gmail.com', work_start: '08:00', work_end: '18:00', lunch_duration: 60, is_12x36: false }).then(() => {
                    console.log('Ghost admin account created');
                  });
                });
              }
              setRecords(formattedRecords.filter(r => r.employee_id === adminId) as any);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching from Supabase:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, userRole]);

  // Migration Helper: Push LocalStorage to Supabase (Run once)
  const migrateToCloud = async () => {
    const localCompanies = JSON.parse(localStorage.getItem('flow_companies') || '[]');
    const localEmployees = JSON.parse(localStorage.getItem('flow_employees') || '[]');
    const localRecords = JSON.parse(localStorage.getItem('flow_all_records') || '[]');

    if (localCompanies.length > 0) {
      await supabase.from('companies').upsert(localCompanies.map((c: any) => ({
        id: c.id,
        name: c.name,
        admin_email: c.adminEmail,
        password: c.password
      })));
    }

    if (localEmployees.length > 0) {
      await supabase.from('employees').upsert(localEmployees.map((e: any) => ({
        id: e.id,
        company_id: e.companyId,
        name: e.name,
        email: e.email,
        password: e.password,
        photo: e.photo
      })));
    }

    if (localRecords.length > 0) {
      await supabase.from('punch_records').upsert(localRecords.map((r: any) => ({
        id: r.id,
        employee_id: r.employeeId,
        company_id: r.companyId, // Assuming companyId is in record or derived
        type: r.type,
        timestamp: r.timestamp,
        is_manual: r.isManual
      })));
    }
    
    // Clear local once done (re-fetch will happen)
    localStorage.removeItem('flow_companies');
    localStorage.removeItem('flow_employees');
    localStorage.removeItem('flow_all_records');
    window.location.reload();
  };

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
  const [isCreateFormExpanded, setIsCreateFormExpanded] = useState(false);
  const [manualTime, setManualTime] = useState(formatBrasilia(new Date(), 'HH:mm'));
  const [manualType, setManualType] = useState<'in' | 'out'>('in');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filter States
  const [filterStartDate, setFilterStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [filterEndDate, setFilterEndDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  const handleExportExcel = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Data,Funcionario,Tipo,Horário\n"
      + filteredPunchRecords.map(r => {
          const empName = employees.find(e => (e.id === r.employee_id || e.id === r.employeeId))?.name || '---';
          return `${formatBrasilia(r.timestamp, 'dd/MM/yyyy')},${empName},${r.type === 'in' ? 'Entrada' : 'Saída'},${formatBrasilia(r.timestamp, 'HH:mm:ss')}`;
        }).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `espelho_ponto_${filterStartDate}_a_${filterEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    window.print();
  };

  // Company/Employee Creation States
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(() => localStorage.getItem('flow_selectedCompanyId'));
  const [selectedEmployeeForDetail, setSelectedEmployeeForDetail] = useState<string | null>(null);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyEmail, setNewCompanyEmail] = useState('');
  const [newCompanyPassword, setNewCompanyPassword] = useState('');
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editCompanyEmail, setEditCompanyEmail] = useState('');
  const [editCompanyPassword, setEditCompanyPassword] = useState('');
  const [selectedCompanyForEmployee, setSelectedCompanyForEmployee] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [newEmployeePassword, setNewEmployeePassword] = useState('');
  const [newEmployeePhoto, setNewEmployeePhoto] = useState<string | null>(null);
  const [newEmployeeWorkStart, setNewEmployeeWorkStart] = useState('08:00');
  const [newEmployeeWorkEnd, setNewEmployeeWorkEnd] = useState('18:00');
  const [newEmployeeLunchDuration, setNewEmployeeLunchDuration] = useState('60');
  const [newEmployeeIs12x36, setNewEmployeeIs12x36] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [editEmployeeName, setEditEmployeeName] = useState('');
  const [editEmployeeEmail, setEditEmployeeEmail] = useState('');
  const [editEmployeePassword, setEditEmployeePassword] = useState('');
  const [editEmployeePhoto, setEditEmployeePhoto] = useState<string | null>(null);
  const [editEmployeeWorkStart, setEditEmployeeWorkStart] = useState('08:00');
  const [editEmployeeWorkEnd, setEditEmployeeWorkEnd] = useState('18:00');
  const [editEmployeeLunchDuration, setEditEmployeeLunchDuration] = useState('60');
  const [editEmployeeIs12x36, setEditEmployeeIs12x36] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showCompanyEditPassword, setShowCompanyEditPassword] = useState(false);
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
    setEditEmployeeWorkStart(emp.work_start || '08:00');
    setEditEmployeeWorkEnd(emp.work_end || '18:00');
    setEditEmployeeLunchDuration(String(emp.lunch_duration || 60));
    setEditEmployeeIs12x36(emp.is_12x36 || false);
  };

  const handleUpdateEmployee = async (e: FormEvent) => {
    e.preventDefault();
    
    await supabase.from('employees').update({
      name: editEmployeeName,
      email: editEmployeeEmail,
      password: editEmployeePassword,
      photo: editEmployeePhoto || null,
      work_start: editEmployeeWorkStart,
      work_end: editEmployeeWorkEnd,
      lunch_duration: parseInt(editEmployeeLunchDuration),
      is_12x36: editEmployeeIs12x36
    }).eq('id', editingEmployeeId);

    setEmployees(prev => prev.map(emp => 
      emp.id === editingEmployeeId 
        ? { 
            ...emp, 
            name: editEmployeeName, 
            email: editEmployeeEmail, 
            password: editEmployeePassword, 
            photo: editEmployeePhoto || undefined,
            work_start: editEmployeeWorkStart,
            work_end: editEmployeeWorkEnd,
            lunch_duration: parseInt(editEmployeeLunchDuration),
            is_12x36: editEmployeeIs12x36
          }
        : emp
    ));

    // Fix historical names to match new names (optional syncing)
    setAllPunchRecords(prev => prev.map(r => 
      (r.employeeId || r.employee_id) === editingEmployeeId ? { ...r, employeeName: editEmployeeName } : r
    ));

    setEditingEmployeeId(null);
    alert('Funcionário atualizado com sucesso!');
  };

  const handleUpdateCompany = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) return;

    try {
      const updateData: any = {
        name: editCompanyName,
        admin_email: editCompanyEmail,
      };
      if (editCompanyPassword) {
        updateData.password = editCompanyPassword;
      }

      const { error } = await supabase.from('companies').update(updateData).eq('id', selectedCompanyId);
      if (error) throw error;

      setCompanies(prev => prev.map(c => 
        c.id === selectedCompanyId 
          ? { ...c, name: editCompanyName, admin_email: editCompanyEmail, password: editCompanyPassword || c.password } 
          : c
      ));

      alert('Cadastro da empresa atualizado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar cadastro.');
    }
  };

  const handleDeleteCompany = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir permanentemente a empresa "${name}"?`)) {
      try {
        const { error } = await supabase.from('companies').delete().eq('id', id);
        if (error) throw error;
        setCompanies(prev => prev.filter(c => c.id !== id));
        if (selectedCompanyId === id) {
           setSelectedCompanyId(null);
           setActiveTab('admin');
        }
        alert('Empresa excluída com sucesso.');
      } catch (err: any) {
        console.error(err);
        alert('Erro ao excluir empresa: ' + err.message);
      }
    }
  };



  const handleLogin = async (email: string) => {
    setUser(email);
    localStorage.setItem('flow_user', email);
    const lowerEmail = email.toLowerCase();
    
    // 1. Check Super Admin (Hardcoded for now as per current logic)
    if (lowerEmail === 'adminaxispoint@gmail.com') {
      setIsAdmin(true);
      localStorage.setItem('flow_isAdmin', 'true');
      setUserRole('admin');
      localStorage.setItem('flow_role', 'admin');
      setActiveTab('clock');
      return;
    }

    // 2. Check Companies in Supabase
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('admin_email', lowerEmail)
      .single();

    if (company) {
      setIsAdmin(true);
      localStorage.setItem('flow_isAdmin', 'true');
      setUserRole('company');
      localStorage.setItem('flow_role', 'company');
      setSelectedCompanyId(company.id);
      localStorage.setItem('flow_selectedCompanyId', company.id);
      setActiveTab('team');
      return;
    }

    // 3. Check Employees in Supabase
    const { data: employee } = await supabase
      .from('employees')
      .select('*')
      .eq('email', lowerEmail)
      .single();

    if (employee) {
      setIsAdmin(false);
      localStorage.setItem('flow_isAdmin', 'false');
      setUserRole('employee');
      localStorage.setItem('flow_role', 'employee');
      setSelectedCompanyId(employee.company_id);
      localStorage.setItem('flow_selectedCompanyId', employee.company_id);
      setActiveTab('clock');
      return;
    }

    // Fallback or Error
    console.warn('User not found in database');
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

  const handleCreateCompany = async (e: FormEvent) => {
    e.preventDefault();
    const { data: newCompany, error } = await supabase.from('companies').insert({
      name: newCompanyName,
      admin_email: newCompanyEmail,
      password: newCompanyPassword,
    }).select().single();

    if (newCompany) {
      setCompanies(prev => [...prev, newCompany as any]);
      setNewCompanyName('');
      setNewCompanyEmail('');
      setNewCompanyPassword('');
      alert('Empresa cadastrada com sucesso!');
    } else {
      console.error('Error creating company:', error);
      alert('Erro ao cadastrar empresa. Detalhes: ' + (error?.message || 'Erro desconhecido de conexão.'));
    }
  };

  const handleCreateEmployee = async (e: FormEvent) => {
    e.preventDefault();
    const companyId = selectedCompanyId || selectedCompanyForEmployee;
    const { data: newEmployee, error } = await supabase.from('employees').insert({
      company_id: companyId,
      name: newEmployeeName,
      email: newEmployeeEmail,
      password: newEmployeePassword,
      photo: newEmployeePhoto || null,
      work_start: newEmployeeWorkStart,
      work_end: newEmployeeWorkEnd,
      lunch_duration: parseInt(newEmployeeLunchDuration),
      is_12x36: newEmployeeIs12x36
    }).select().single();

    if (newEmployee) {
      setEmployees(prev => [...prev, {
        ...newEmployee,
        work_start: newEmployeeWorkStart,
        work_end: newEmployeeWorkEnd,
        lunch_duration: parseInt(newEmployeeLunchDuration),
        is_12x36: newEmployeeIs12x36
      } as any]);
      setNewEmployeeName('');
      setNewEmployeeEmail('');
      setNewEmployeePassword('');
      setNewEmployeePhoto(null);
      setNewEmployeeWorkStart('08:00');
      setNewEmployeeWorkEnd('18:00');
      setNewEmployeeLunchDuration('60');
      alert('Funcionário cadastrado com sucesso!');
    } else {
      console.error('Error creating employee:', error);
      alert('Erro ao cadastrar funcionário. Detalhes: ' + (error?.message || 'Erro desconhecido.'));
    }
  };

  // Registros são criados apenas por ações reais de ponto (entrada/saída)

  const myRecords = useMemo(() => {
    return records;
  }, [records]);

  // Filtra os registros pertencentes à jornada atual (corrige bug de virada de noite 12x36)
  const todayRecords = useMemo(() => {
    if (myRecords.length === 0) return [];
    const sorted = [...myRecords].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()); // oldest to newest
    
    let currentJourney: PunchRecord[] = [];
    
    for (let i = 0; i < sorted.length; i++) {
      const record = sorted[i];
      if (currentJourney.length === 0) {
        currentJourney.push(record);
      } else {
        const lastRecord = currentJourney[currentJourney.length - 1];
        const hoursDiff = (record.timestamp.getTime() - lastRecord.timestamp.getTime()) / (1000 * 60 * 60);
        
        // Nova jornada começa se bater 'in' após já ter 4 pontos OU se passou mais de 10 horas de intervalo
        if ((currentJourney.length >= 4 && record.type === 'in') || hoursDiff > 10) {
          currentJourney = [record];
        } else {
          currentJourney.push(record);
        }
      }
    }
    
    if (currentJourney.length > 0) {
      const lastRecord = currentJourney[currentJourney.length - 1];
      const hoursSinceLastPunch = (getBrasiliaNow().getTime() - lastRecord.timestamp.getTime()) / (1000 * 60 * 60);
      
      // Se a jornada está fechada (par) e passou mais de 6h, reseta para a próxima
      if (currentJourney.length % 2 === 0 && hoursSinceLastPunch > 6) {
        return [];
      }
      // Se a pessoa esqueceu de bater o ponto e já passou mais de 24 horas, reseta
      if (hoursSinceLastPunch > 24) {
        return [];
      }
    }
    
    return currentJourney;
  }, [myRecords]);

  const isClockedIn = useMemo(() => {
    if (todayRecords.length === 0) return false;
    const sorted = [...todayRecords].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return sorted[0].type === 'in';
  }, [todayRecords]);

  const recordedDays = useMemo(() => {
    const days = new Set<string>();
    myRecords.forEach(r => {
      days.add(formatBrasilia(r.timestamp, 'yyyy-MM-dd'));
    });
    return Array.from(days);
  }, [myRecords]);

  const punchesTodayCount = useMemo(() => {
    return todayRecords.length;
  }, [todayRecords]);

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

  const handlePunch = async (photoDataUrl: string | null = null, location: { lat: number, lng: number } | null = null) => {
    const now = getBrasiliaNow();
    const type = isClockedIn ? 'out' : 'in';
    let currentEmployee = employees.find(e => e.email.toLowerCase() === user?.toLowerCase());
    
    if (userRole === 'admin' && !currentEmployee) {
      currentEmployee = {
        id: '00000000-0000-0000-0000-000000000000',
        company_id: '00000000-0000-0000-0000-000000000000',
        name: 'Administrador Master',
        email: user || '',
        work_start: '08:00',
        work_end: '18:00',
        lunch_duration: 60,
        is_12x36: false
      } as any;
    }

    if (!currentEmployee) {
      alert("Erro: Conta atual não é um perfil de funcionário válido para bater ponto.");
      return;
    }

    const checkIsOvertime = (time: Date, punchType: string) => {
      if (!currentEmployee.work_start || !currentEmployee.work_end) return false;
      
      const [startH, startM] = currentEmployee.work_start.split(':').map(Number);
      const [endH, endM] = currentEmployee.work_end.split(':').map(Number);
      
      const startTime = setSeconds(setMinutes(setHours(new Date(time), startH), startM), 0);
      const endTime = setSeconds(setMinutes(setHours(new Date(time), endH), endM), 0);

      // Simple checks:
      if (punchType === 'in' && time.getTime() < startTime.getTime() - 10 * 60000) { // 10 min early threshold
        return true;
      }
      if (punchType === 'out' && time.getTime() > endTime.getTime() + 10 * 60000) { // 10 min late threshold
        return true;
      }

      // 12x36 logic: If today is a rest day (worked yesterday), any punch is overtime
      if (currentEmployee.is_12x36) {
        const yesterday = subDays(time, 1);
        const workedYesterday = allPunchRecords.some(r => 
          (r.employeeId === currentEmployee.id || r.employee_id === currentEmployee.id) && 
          isSameDay(new Date(r.timestamp), yesterday)
        );
        if (workedYesterday) return true;
      }

      return false;
    };

    const isOvertime = checkIsOvertime(now, type);

    let photoUrl = null;
    
    if (photoDataUrl) {
      try {
        const base64Data = photoDataUrl.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });
        
        const fileName = `${currentEmployee.id}_${now.getTime()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('punch_photos')
          .upload(fileName, blob, {
            contentType: 'image/jpeg'
          });
          
        if (uploadData) {
          const { data: urlData } = supabase.storage.from('punch_photos').getPublicUrl(fileName);
          photoUrl = urlData.publicUrl;
        }
      } catch (err) {
        console.error("Erro no upload da foto", err);
      }
    }

    const { data: newRecord, error } = await supabase.from('punch_records').insert({
      employee_id: currentEmployee.id,
      company_id: currentEmployee.company_id,
      type: type,
      timestamp: now.toISOString(),
      is_manual: false,
      is_overtime: isOvertime,
      latitude: location?.lat || null,
      longitude: location?.lng || null,
      photo_url: photoUrl
    }).select().single();

    if (newRecord) {
      const formattedRecord: PunchRecord = {
        ...newRecord,
        timestamp: new Date(newRecord.timestamp)
      } as any;

      setRecords(prev => [...prev, formattedRecord]);
      
      const fullRecord: FullPunchRecord = {
        ...formattedRecord,
        employeeId: currentEmployee.id,
        employeeName: currentEmployee.name,
      };
      setAllPunchRecords(prev => [fullRecord, ...prev]);
      setSelectedDate(now);
    } else {
      console.error('Error punching clock:', error);
      alert('Erro inesperado ao registrar o ponto: Verifique o console. ' + (error?.message || ''));
    }
  };

  const handleAddManual = async () => {
    const [hours, minutes] = manualTime.split(':').map(Number);
    let targetDate = setSeconds(setMinutes(setHours(selectedDate, hours), minutes), 0);
    let currentEmployee = employees.find(e => e.email.toLowerCase() === user?.toLowerCase());
    
    if (userRole === 'admin' && !currentEmployee) {
      currentEmployee = {
        id: '00000000-0000-0000-0000-000000000000',
        company_id: '00000000-0000-0000-0000-000000000000',
        name: 'Administrador Master',
        email: user || '',
        work_start: '08:00',
        work_end: '18:00',
        lunch_duration: 60,
        is_12x36: false
      } as any;
    }

    if (!currentEmployee) {
      alert("Erro: Faça login como funcionário para registrar um ponto. Conta de administração principal não pode registrar horários.");
      return;
    }

    const checkIsOvertime = (time: Date, punchType: string) => {
      if (!currentEmployee.work_start || !currentEmployee.work_end) return false;
      const [startH, startM] = currentEmployee.work_start.split(':').map(Number);
      const [endH, endM] = currentEmployee.work_end.split(':').map(Number);
      const startTime = setSeconds(setMinutes(setHours(new Date(time), startH), startM), 0);
      const endTime = setSeconds(setMinutes(setHours(new Date(time), endH), endM), 0);

      if (punchType === 'in' && time.getTime() < startTime.getTime() - 10 * 60000) return true;
      if (punchType === 'out' && time.getTime() > endTime.getTime() + 10 * 60000) return true;

      if (currentEmployee.is_12x36) {
        const yesterday = subDays(time, 1);
        const workedYesterday = allPunchRecords.some(r => 
          (r.employeeId === currentEmployee.id || r.employee_id === currentEmployee.id) && 
          isSameDay(new Date(r.timestamp), yesterday)
        );
        if (workedYesterday) return true;
      }
      return false;
    };

    const isOvertime = checkIsOvertime(targetDate, manualType);

    if (editingId) {
      const { data: updatedRecord, error } = await supabase.from('punch_records').update({
        timestamp: targetDate.toISOString(),
        type: manualType,
        is_manual: true,
        is_overtime: isOvertime
      }).eq('id', editingId).select().single();

      if (updatedRecord) {
        setRecords(prev => prev.map(r => r.id === editingId ? { ...updatedRecord, timestamp: new Date(updatedRecord.timestamp) } : r));
        setAllPunchRecords(prev => prev.map(r => r.id === editingId ? { ...updatedRecord, timestamp: new Date(updatedRecord.timestamp), employeeId: currentEmployee.id, employeeName: currentEmployee.name } : r));
      }
      setEditingId(null);
    } else {
      const { data: newRecord, error } = await supabase.from('punch_records').insert({
        employee_id: currentEmployee.id,
        company_id: currentEmployee.company_id,
        type: manualType,
        timestamp: targetDate.toISOString(),
        is_manual: true,
        is_overtime: isOvertime
      }).select().single();

      if (newRecord) {
        const formattedRecord = { ...newRecord, timestamp: new Date(newRecord.timestamp) } as any;
        setRecords(prev => [...prev, formattedRecord]);
        
        const fullRecord: FullPunchRecord = {
          ...formattedRecord,
          employeeId: currentEmployee.id,
          employeeName: currentEmployee.name,
        };
        setAllPunchRecords(prev => [fullRecord, ...prev]);
      } else if (error) {
        alert("Erro ao registrar ponto: " + error.message);
        return;
      }
    }
    setShowManualForm(false);
    setActiveTab('history');
  };

  const startEdit = (record: PunchRecord) => {
    setEditingId(record.id);
    setManualTime(formatBrasilia(record.timestamp, 'HH:mm'));
    setManualType(record.type);
    setShowManualForm(true);
  };

  const removeRecord = async (id: string) => {
    const { error } = await supabase.from('punch_records').delete().eq('id', id);
    if (!error) {
      setRecords(prev => prev.filter(r => r.id !== id));
      setAllPunchRecords(prev => prev.filter(r => r.id !== id));
    }
  };

  // Lists
  const filteredPunchRecords = useMemo(() => {
    let records = allPunchRecords;
    if (userRole === 'company' && user) {
      const company = companies.find(c => c.email === user);
      if (company) {
        records = allPunchRecords.filter(r => (r.company_id || r.companyId) === company.id);
      }
    } else if (selectedCompanyId) {
      records = allPunchRecords.filter(r => (r.company_id || r.companyId) === selectedCompanyId);
    }
    
    // Apply Date Range Filter
    return records.filter(r => {
      const recordDate = new Date(r.timestamp).toISOString().split('T')[0];
      return recordDate >= filterStartDate && recordDate <= filterEndDate;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [allPunchRecords, selectedCompanyId, userRole, user, companies, filterStartDate, filterEndDate]);

  const employeeDetailedRecords = useMemo(() => {
    if (!selectedEmployeeForDetail) return [];
    
    const employee = employees.find(e => e.id === selectedEmployeeForDetail);
    if (!employee) return [];

    const minLunch = employee.lunch_duration || 60;
    const start = parseISO(filterStartDate);
    const end = parseISO(filterEndDate);

    const allEmployeeRecords = allPunchRecords
      .filter(r => (r.employee_id === selectedEmployeeForDetail || r.employeeId === selectedEmployeeForDetail))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const journeys: any[] = [];
    let currentJourney: FullPunchRecord[] = [];

    for (let i = 0; i < allEmployeeRecords.length; i++) {
      const record = allEmployeeRecords[i];
      if (currentJourney.length === 0) {
        currentJourney.push(record);
      } else {
        const lastRecord = currentJourney[currentJourney.length - 1];
        const hoursDiff = (new Date(record.timestamp).getTime() - new Date(lastRecord.timestamp).getTime()) / (1000 * 60 * 60);
        
        if ((currentJourney.length >= 4 && record.type === 'in') || hoursDiff > 14) {
          journeys.push({ date: new Date(currentJourney[0].timestamp), records: [...currentJourney] });
          currentJourney = [record];
        } else {
          currentJourney.push(record);
        }
      }
    }
    if (currentJourney.length > 0) {
      journeys.push({ date: new Date(currentJourney[0].timestamp), records: [...currentJourney] });
    }

    journeys.forEach(journey => {
      const ascRecords = [...journey.records].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      journey.records = ascRecords.reverse(); // For UI
      
      let lunchMins = 0;
      for (let i = 0; i < ascRecords.length - 1; i++) {
        if (ascRecords[i].type === 'out' && ascRecords[i+1].type === 'in') {
          lunchMins += (new Date(ascRecords[i+1].timestamp).getTime() - new Date(ascRecords[i].timestamp).getTime()) / 60000;
        }
      }
      if (lunchMins > 0) {
        journey.lunchDuration = Math.round(lunchMins);
        if (journey.lunchDuration < minLunch) journey.lunchAlert = true;
      }
      
      let workedMins = 0;
      let lastIn: Date | null = null;
      ascRecords.forEach((r: any) => {
        if (r.type === 'in') lastIn = new Date(r.timestamp);
        else if (r.type === 'out' && lastIn) {
          workedMins += (new Date(r.timestamp).getTime() - lastIn.getTime()) / 60000;
          lastIn = null;
        }
      });

      // Cálculo Parcial: Se estiver logado agora, calcula até o momento atual
      if (lastIn) {
        const now = getBrasiliaNow();
        const diffHours = (now.getTime() - lastIn.getTime()) / (1000 * 60 * 60);
        // Só calcula parcial se for uma batida recente (menos de 16h atrás)
        if (diffHours > 0 && diffHours < 16) {
          workedMins += (now.getTime() - lastIn.getTime()) / 60000;
        }
      }
      
      journey.workedMinutes = Math.round(workedMins);
      
      let expectedMins = 0;
      let isRestDay = false;

      if (employee.is_12x36) {
        // Lógica 12x36: Se trabalhou ontem, hoje é folga (esperado = 0)
        const yesterday = subDays(journey.date, 1);
        const workedYesterday = journeys.some(j => isSameDay(j.date, yesterday) && j !== journey && (j.workedMinutes || 0) > 0);
        
        if (workedYesterday) {
          isRestDay = true;
          expectedMins = 0;
        } else {
          expectedMins = 12 * 60;
        }
      } else if (employee.work_start && employee.work_end) {
        const [startH, startM] = employee.work_start.split(':').map(Number);
        const [endH, endM] = employee.work_end.split(':').map(Number);
        expectedMins = (endH * 60 + endM) - (startH * 60 + startM);
        if (expectedMins < 0) expectedMins += 24 * 60;
        expectedMins -= minLunch;
      }
      
      journey.isRestDay = isRestDay;
      journey.expectedMinutes = expectedMins;
      journey.extraMinutes = journey.workedMinutes - expectedMins;
    });

    const filteredJourneys = journeys.filter(j => {
      const recordDateStr = formatBrasilia(j.date, 'yyyy-MM-dd');
      return recordDateStr >= filterStartDate && recordDateStr <= filterEndDate;
    });

    // Add rest days for 12x36 if they worked yesterday but not today
    if (employee.is_12x36) {
      const days = eachDayOfInterval({ start, end });
      days.forEach(day => {
        const dayStr = formatBrasilia(day, 'yyyy-MM-dd');
        const hasJourney = filteredJourneys.some(j => formatBrasilia(j.date, 'yyyy-MM-dd') === dayStr);
        if (!hasJourney) {
          const yesterday = subDays(day, 1);
          const workedYesterday = journeys.some(j => formatBrasilia(j.date, 'yyyy-MM-dd') === formatBrasilia(yesterday, 'yyyy-MM-dd'));
          if (workedYesterday) {
            filteredJourneys.push({ date: day, records: [], isRestDay: true });
          }
        }
      });
    }

    return filteredJourneys.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [allPunchRecords, selectedEmployeeForDetail, filterStartDate, filterEndDate, employees]);

  const filteredEmployees = useMemo(() => {
    if (!selectedCompanyId) return employees;
    return employees.filter(e => (e.companyId || e.company_id) === selectedCompanyId);
  }, [employees, selectedCompanyId]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = Math.abs(touchStart.y - touchEnd.y);
    const minSwipeDistance = 50;
    const maxVerticalOffset = 40;
    
    if (distanceY > maxVerticalOffset) return; // Prevent horizontal swipe while scrolling vertically

    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;

    if (isLeftSwipe || isRightSwipe) {
      const tabs = userRole === 'admin' 
        ? ['clock', 'history', 'admin'] 
        : userRole === 'company' 
          ? ['team', 'monitor'] 
          : ['clock', 'history'];

      let currentIndex = tabs.indexOf(activeTab);
      if (currentIndex === -1 && userRole === 'admin') {
        if (['monitor', 'team', 'company-edit'].includes(activeTab)) {
          currentIndex = tabs.indexOf('admin');
        }
      }

      if (currentIndex !== -1) {
        if (isLeftSwipe && currentIndex < tabs.length - 1) {
          // Swipe Left = Go to Next Tab
          const nextTab = tabs[currentIndex + 1];
          setActiveTab(nextTab as any);
        } else if (isRightSwipe && currentIndex > 0) {
          // Swipe Right = Go to Prev Tab
          const prevTab = tabs[currentIndex - 1];
          setActiveTab(prevTab as any);
        }
      }
    }
  };

  if (!user) {
    return <AuthView onLogin={handleLogin} companies={companies} employees={employees} />;
  }

  return (
    <div 
      className="h-full w-full overflow-y-auto bg-[#f1f3f5] flex flex-col items-center scroll-smooth"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="w-full max-w-5xl flex-1 flex flex-col p-2 sm:p-6 md:p-8 lg:p-12 space-y-4 sm:space-y-8 transition-all">
        
        {/* Header de Impressão (Só aparece no PDF/Print) */}
        <div className="print-only mb-10 border-b-2 border-gray-900 pb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-gray-900">Espelho de Ponto Eletrônico</h1>
              <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-widest">Relatório Gerado via AxisPoint</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-gray-400">Emissão</p>
              <p className="text-xs font-bold">{formatBrasilia(new Date(), 'dd/MM/yyyy HH:mm')}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-8 mt-8">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-gray-400">Empresa / Unidade</p>
              <p className="text-sm font-bold text-gray-900">
                {companies.find(c => c.id === selectedCompanyId)?.name || '---'}
              </p>
            </div>
            {selectedEmployeeForDetail && (
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-gray-400">Colaborador</p>
                <p className="text-sm font-bold text-gray-900">
                  {employees.find(e => e.id === selectedEmployeeForDetail)?.name || '---'}
                </p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-gray-400">Período Selecionado</p>
              <p className="text-sm font-bold text-gray-900">
                {formatBrasilia(new Date(filterStartDate + 'T00:00:00'), 'dd/MM/yyyy')} até {formatBrasilia(new Date(filterEndDate + 'T00:00:00'), 'dd/MM/yyyy')}
              </p>
            </div>
          </div>
        </div>

        {/* Header */}
        <header className="flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center">
              <img src="/logo.png" alt="AxisPoint" className="w-full h-full object-contain" />
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
            {activeTab === 'clock' && (
              <button 
                onClick={() => {
                  setEditingId(null);
                  setManualTime(formatBrasilia(getBrasiliaNow(), 'HH:mm'));
                  setManualType(isClockedIn ? 'out' : 'in');
                  setShowManualForm(true);
                }}
                className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                title="Adicionar Ponto Manual"
              >
                <PlusCircle size={18} />
              </button>
            )}
            <div className={`
               px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border transition-colors ${isLoading ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-green-50 text-green-600 border-green-100'}
            `}>
               {isLoading ? 'SINCRONIZANDO...' : 'ONLINE'}
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
          {userRole === 'company' && (
            <>
              <button 
                onClick={() => setActiveTab('team')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all min-w-fit
                  ${activeTab === 'team' ? 'bg-white text-[#1B9E9E] shadow-sm' : 'text-gray-500 hover:text-gray-700'}
                `}
              >
                <Users size={16} />
                Gestão
                {filteredEmployees.length > 0 && (
                  <span className="min-w-[20px] h-[20px] flex items-center justify-center bg-red-500 text-white text-[9px] font-black rounded-full px-1.5 shadow-sm ml-1">
                    {filteredEmployees.length}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setActiveTab('monitor')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all min-w-fit
                  ${activeTab === 'monitor' ? 'bg-white text-[#1B9E9E] shadow-sm' : 'text-gray-500 hover:text-gray-700'}
                `}
              >
                <Monitor size={16} />
                Registro
              </button>
            </>
          )}
          {userRole === 'admin' && (
            <button 
              onClick={() => {
                setSelectedCompanyId(null);
                setActiveTab('admin');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all min-w-fit
                ${['admin', 'monitor', 'team', 'company-edit'].includes(activeTab) ? 'bg-white text-[#1B9E9E] shadow-sm' : 'text-gray-500 hover:text-gray-700'}
              `}
            >
              <Briefcase size={16} />
              Empresas
              {companies.length > 0 && (
                <span className="min-w-[20px] h-[20px] flex items-center justify-center bg-red-500 text-white text-[9px] font-black rounded-full px-1.5 shadow-sm ml-1">
                  {companies.length}
                </span>
              )}
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

                <div className="flex justify-center pb-12">
                  <PunchClock 
                    onPunch={handlePunch} 
                    isClockedIn={isClockedIn} 
                    nextPunchLabel={getPunchLabel(punchesTodayCount)}
                    punchCount={punchesTodayCount}
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
                        
                        {dayRecords.slice().sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()).map((record, index) => (
                          <motion.div
                            key={record.id}
                            layout
                            className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100 group"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-2.5 rounded-xl text-white shadow-sm ${index >= 4 ? (index % 2 === 0 ? 'bg-amber-400' : 'bg-amber-500') : (index % 2 === 0 ? 'bg-green-500' : 'bg-red-500')}`}>
                                {index >= 4 ? (index % 2 === 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />) : (index % 2 === 0 ? <LogIn size={18} /> : <LogOut size={18} />)}
                              </div>
                              <div>
                                <p className={`text-sm font-bold transition-colors ${index >= 4 ? 'text-amber-600' : 'text-gray-900 group-hover:text-[#1B9E9E]'}`}>
                                  {getPunchLabel(index)}
                                </p>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs text-gray-400 font-mono">{formatBrasilia(record.timestamp, 'HH:mm:ss')}</p>
                                  {record.isManual && (
                                    <span className="text-[8px] font-black uppercase text-amber-500 bg-amber-50 px-1 py-0.5 rounded leading-none border border-amber-100">Manual</span>
                                  )}
                                </div>
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
                        {/* Resumo de horas do dia para o funcionário */}
                        {(() => {
                          const sortedDay = dayRecords.slice().sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                          let worked = 0;
                          let lastIn: Date | null = null;
                          sortedDay.forEach(r => {
                            if (r.type === 'in') lastIn = r.timestamp;
                            else if (r.type === 'out' && lastIn) {
                              worked += (r.timestamp.getTime() - lastIn.getTime()) / 60000;
                              lastIn = null;
                            }
                          });

                          // Saldo Parcial para o histórico
                          if (lastIn) {
                            const now = getBrasiliaNow();
                            const diffHours = (now.getTime() - lastIn.getTime()) / (1000 * 60 * 60);
                            if (diffHours > 0 && diffHours < 16) {
                              worked += (now.getTime() - lastIn.getTime()) / 60000;
                            }
                          }

                          const workedMins = Math.round(worked);
                          if (workedMins <= 0) return null;
                          
                          const currentEmployee = employees.find(e => e.email.toLowerCase() === user?.toLowerCase());
                          let expectedMins = 0;
                          if (currentEmployee) {
                            if (currentEmployee.is_12x36) {
                              // Verifica se trabalhou ontem para zerar o esperado (folga)
                              const yesterday = subDays(sortedDay[0].timestamp, 1);
                              const workedYesterday = allPunchRecords.some(r => 
                                (r.employeeId === currentEmployee.id || r.employee_id === currentEmployee.id) && 
                                isSameDay(new Date(r.timestamp), yesterday)
                              );
                              expectedMins = workedYesterday ? 0 : 12 * 60;
                            } else if (currentEmployee.work_start && currentEmployee.work_end) {
                              const [sH, sM] = currentEmployee.work_start.split(':').map(Number);
                              const [eH, eM] = currentEmployee.work_end.split(':').map(Number);
                              expectedMins = (eH * 60 + eM) - (sH * 60 + sM);
                              if (expectedMins < 0) expectedMins += 24 * 60;
                              expectedMins -= (currentEmployee.lunch_duration || 60);
                            }
                          }
                          const extra = workedMins - expectedMins;

                          return (
                            <div className="flex flex-wrap gap-2 mt-2">
                              <div className="bg-[#f1f3f5] px-3 py-1.5 rounded-xl text-gray-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                <Clock size={11} className="text-[#1B9E9E]" />
                                {Math.floor(workedMins / 60)}h {String(workedMins % 60).padStart(2, '0')}m
                              </div>
                              {expectedMins > 0 && extra !== 0 && (
                                <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${extra > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                  {extra > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                  {extra > 0 ? '+' : '-'}{Math.floor(Math.abs(extra) / 60)}h {String(Math.abs(extra) % 60).padStart(2, '0')}m
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            ) : (['monitor', 'team', 'company-edit'].includes(activeTab)) ? (
              <motion.div
                key="company-detail"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6"
              >
                {/* Sub-Header para Admins (Navegação da Empresa) */}
                {userRole === 'admin' && selectedCompanyId && (
                  <div className="flex items-center justify-between bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                    <button 
                      onClick={() => {
                        setSelectedCompanyId(null);
                        setActiveTab('admin');
                      }}
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-[#1B9E9E] px-4 py-2"
                    >
                      <ArrowLeft size={16} />
                      Voltar ao Painel
                    </button>

                    <div className="flex gap-2 p-1 bg-gray-100 rounded-xl overflow-x-auto no-scrollbar">
                      <button 
                        onClick={() => setActiveTab('company-edit')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'company-edit' ? 'bg-white text-[#1B9E9E] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        <Briefcase size={14} />
                        Cadastro
                      </button>
                    </div>
                  </div>
                )}

                {/* Aba CADASTRO (Edição da empresa) */}
                {activeTab === 'company-edit' && (
                  <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 mb-6">
                    <form onSubmit={handleUpdateCompany} className="space-y-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Nome da Empresa</label>
                        <input 
                          type="text"
                          required
                          value={editCompanyName}
                          onChange={(e) => setEditCompanyName(e.target.value)}
                          placeholder="Ex: Flow Tech LTDA"
                          className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-[#1B9E9E] transition-colors"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">E-mail do Gestor</label>
                        <input 
                          type="email"
                          required
                          value={editCompanyEmail}
                          onChange={(e) => setEditCompanyEmail(e.target.value)}
                          placeholder="gestor@empresa.com"
                          className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-[#1B9E9E] transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Senha de Acesso</label>
                        <div className="relative">
                          <input 
                            type={showCompanyEditPassword ? "text" : "password"}
                            required
                            value={editCompanyPassword}
                            onChange={(e) => setEditCompanyPassword(e.target.value)}
                            placeholder="Digite a senha"
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 pr-12 text-sm font-medium focus:outline-none focus:border-[#1B9E9E] transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCompanyEditPassword(!showCompanyEditPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1B9E9E] transition-colors"
                          >
                            {showCompanyEditPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </div>

                      <button 
                        type="submit"
                        className="w-full py-4 bg-[#1B9E9E] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#1a3551] transition-all shadow-lg mt-4"
                      >
                        Atualizar Cadastro
                      </button>
                    </form>
                  </div>
                )}

                {/* Aba MONITOR (Registros da empresa) */}
                {activeTab === 'monitor' && (
                  <div className="space-y-6">
                    {selectedCompanyId && (
                      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-4 no-print">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Início do Período</label>
                            <input 
                              type="date"
                              value={filterStartDate}
                              onChange={(e) => setFilterStartDate(e.target.value)}
                              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-3 text-xs font-bold focus:outline-none focus:border-[#1B9E9E] transition-colors"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Fim do Período</label>
                            <input 
                              type="date"
                              value={filterEndDate}
                              onChange={(e) => setFilterEndDate(e.target.value)}
                              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-3 text-xs font-bold focus:outline-none focus:border-[#1B9E9E] transition-colors"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={handleExportPDF}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-md"
                          >
                            <FileText size={14} />
                            Imprimir Espelho
                          </button>
                          <button 
                            onClick={handleExportExcel}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm"
                          >
                            <Download size={14} />
                            Baixar CSV
                          </button>
                        </div>
                      </div>
                    )}

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

                      {/* Regras de Jornada Planas (Monitor Detail) */}
                      {employees.find(e => e.id === selectedEmployeeForDetail) && (
                        <div className="bg-teal-50/50 border border-teal-100/50 rounded-[2rem] p-5 flex items-center justify-between no-print">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-xl text-[#1B9E9E] shadow-sm">
                              <Clock size={16} />
                            </div>
                            <div>
                               <p className="text-[10px] font-black uppercase tracking-widest text-[#1B9E9E]/60">Jornada Definida</p>
                               <p className="text-xs font-bold text-gray-900">
                                 {employees.find(e => e.id === selectedEmployeeForDetail)?.work_start} — {employees.find(e => e.id === selectedEmployeeForDetail)?.work_end}
                               </p>
                            </div>
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] font-black uppercase tracking-widest text-[#1B9E9E]/60">Intervalo Mín.</p>
                             <p className="text-xs font-bold text-gray-900">{employees.find(e => e.id === selectedEmployeeForDetail)?.lunch_duration} min</p>
                          </div>
                        </div>
                      )}

                      {/* Resumo Acumulado do Banco de Horas */}
                      {employeeDetailedRecords.length > 0 && (() => {
                        const journeysToSum = employeeDetailedRecords.filter((g: any) => g.workedMinutes > 0);
                        const totalWorked = journeysToSum.reduce((acc: number, g: any) => acc + (g.workedMinutes || 0), 0);
                        const totalExpected = journeysToSum.reduce((acc: number, g: any) => acc + (g.expectedMinutes || 0), 0);
                        const totalExtra = totalWorked - totalExpected;
                        const journeyCount = journeysToSum.length;
                        
                        return (
                          <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-gray-200/50 border border-gray-100 no-print">
                            <div className="flex items-center gap-2 mb-4">
                              <Zap size={16} className="text-[#1B9E9E]" />
                              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                                Banco de Horas — Resumo do Período
                              </h4>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div className="bg-[#f1f3f5] rounded-2xl p-4 text-center">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Trabalhado</p>
                                <p className="text-lg font-black text-gray-900">{Math.floor(totalWorked / 60)}h {String(totalWorked % 60).padStart(2, '0')}m</p>
                              </div>
                              <div className="bg-[#f1f3f5] rounded-2xl p-4 text-center">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Previsto</p>
                                <p className="text-lg font-black text-gray-900">{Math.floor(totalExpected / 60)}h {String(totalExpected % 60).padStart(2, '0')}m</p>
                              </div>
                              <div className={`rounded-2xl p-4 text-center ${totalExtra >= 0 ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Saldo</p>
                                <p className={`text-lg font-black ${totalExtra >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {totalExtra >= 0 ? '+' : '-'}{Math.floor(Math.abs(totalExtra) / 60)}h {String(Math.abs(totalExtra) % 60).padStart(2, '0')}m
                                </p>
                              </div>
                            </div>
                            <p className="text-[9px] text-gray-400 mt-3 text-center font-medium">
                              Baseado em {journeyCount} jornada{journeyCount !== 1 ? 's' : ''} registrada{journeyCount !== 1 ? 's' : ''} no período
                            </p>
                          </div>
                        );
                      })()}

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
                                {group.lunchDuration !== undefined && (
                                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${group.lunchAlert ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                                    {group.lunchAlert && <AlertTriangle size={10} className="text-amber-500" />}
                                    Almoço: {group.lunchDuration} min
                                  </div>
                                )}
                                </div>
                              </div>

                              <div className="space-y-3">
                                {group.workedMinutes > 0 && (
                                  <div className="flex flex-wrap gap-2 px-2 no-print">
                                    <div className="bg-[#f1f3f5] px-3 py-2 rounded-xl text-gray-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                      <Clock size={12} className="text-[#1B9E9E]" />
                                      Trabalhado: {Math.floor(group.workedMinutes / 60)}h {String(group.workedMinutes % 60).padStart(2, '0')}m
                                    </div>
                                    {group.extraMinutes !== 0 && group.records.length % 2 === 0 && (
                                      <div className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${group.extraMinutes > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        <Zap size={12} className={group.extraMinutes > 0 ? 'text-green-600' : 'text-red-600'} />
                                        Banco: {group.extraMinutes > 0 ? '+' : '-'}{Math.floor(Math.abs(group.extraMinutes) / 60)}h {String(Math.abs(group.extraMinutes) % 60).padStart(2, '0')}m
                                      </div>
                                    )}
                                  </div>
                                )}

                                {group.isRestDay && (
                                  <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 flex items-center gap-4">
                                    <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                                      <Clock size={20} />
                                    </div>
                                    <div>
                                      <p className="text-sm font-black text-blue-600 uppercase tracking-widest">Descanso 36h</p>
                                      <p className="text-[10px] font-bold text-blue-400 uppercase mt-0.5">Folga Compensatória (12x36)</p>
                                    </div>
                                  </div>
                                )}
                                {group.records.slice().reverse().map((record, index) => (
                                  <div key={record.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-between group hover:border-[#1B9E9E] transition-all">
                                    <div className="flex items-center gap-4">
                                      <div className={`p-2.5 rounded-xl text-white shadow-sm ${index >= 4 ? (index % 2 === 0 ? 'bg-amber-400' : 'bg-amber-500') : (index % 2 === 0 ? 'bg-green-500' : 'bg-red-500')}`}>
                                        {index >= 4 ? (index % 2 === 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />) : (index % 2 === 0 ? <LogIn size={16} /> : <LogOut size={16} />)}
                                      </div>
                                      <div>
                                        <p className={`text-sm font-bold capitalize ${index >= 4 ? 'text-amber-600' : 'text-gray-900'}`}>{getPunchLabel(index)}</p>
                                        <div className="flex items-center gap-2">
                                          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{record.is_manual ? 'Registro Manual' : 'Ponto via App'}</p>
                                          {record.is_overtime && (
                                            <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter animate-pulse">
                                              Hora Extra
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="bg-gray-50 px-4 py-2 rounded-2xl group-hover:bg-teal-50 transition-colors">
                                      <p className="text-sm font-mono font-black text-gray-900 group-hover:text-[#1B9E9E] leading-none">
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
                                      ) : employee.is_12x36 && (() => {
                                        const yesterday = subDays(getBrasiliaNow(), 1);
                                        return allPunchRecords.some(r => (r.employeeId === employee.id || r.employee_id === employee.id) && isSameDay(new Date(r.timestamp), yesterday));
                                      })() ? (
                                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700">Descanso (12x36)</span>
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
                  </div>
                )}

                {/* Aba TEAM (Gestão da Equipe) */}
                {activeTab === 'team' && (
                  <div className="space-y-6">
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

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Entrada</label>
                                <input 
                                  type="time"
                                  required
                                  value={editEmployeeWorkStart}
                                  onChange={(e) => setEditEmployeeWorkStart(e.target.value)}
                                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-[#1B9E9E] transition-colors"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Saída</label>
                                <input 
                                  type="time"
                                  required
                                  value={editEmployeeWorkEnd}
                                  onChange={(e) => setEditEmployeeWorkEnd(e.target.value)}
                                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-[#1B9E9E] transition-colors"
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Intervalo de Almoço (minutos)</label>
                              <input 
                                type="number"
                                required
                                min="0"
                                value={editEmployeeLunchDuration}
                                onChange={(e) => setEditEmployeeLunchDuration(e.target.value)}
                                placeholder="Ex: 60"
                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-[#1B9E9E] transition-colors"
                              />
                            </div>
                            
                            <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                                  <Clock size={18} />
                                </div>
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Regime Especial</p>
                                  <p className="text-xs font-bold text-gray-700">Escala 12x36</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditEmployeeIs12x36(!editEmployeeIs12x36)}
                                className={`w-12 h-6 rounded-full transition-all relative ${editEmployeeIs12x36 ? 'bg-[#1B9E9E]' : 'bg-gray-200'}`}
                              >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${editEmployeeIs12x36 ? 'left-7' : 'left-1'}`} />
                              </button>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Atualizar Senha (Opcional)</label>
                              <div className="relative group">
                                <input 
                                  type={showEditPassword ? 'text' : 'password'}
                                  value={editEmployeePassword}
                                  onChange={(e) => setEditEmployeePassword(e.target.value)}
                                  placeholder="Deixe em branco para manter a atual"
                                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 pr-12 text-sm font-medium focus:outline-none focus:border-[#1B9E9E] transition-colors"
                                />
                                <button 
                                  type="button"
                                  onClick={() => setShowEditPassword(!showEditPassword)}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1B9E9E] transition-colors"
                                  title={showEditPassword ? "Ocultar senha" : "Mostrar senha"}
                                >
                                  {showEditPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                              </div>
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
                          <button 
                            type="button"
                            onClick={() => setIsCreateFormExpanded(!isCreateFormExpanded)}
                            className="w-full flex items-center justify-between text-left group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-100 transition-colors">
                                <Users size={24} />
                              </div>
                              <div>
                                <h3 className="text-xl font-serif font-black tracking-tight text-gray-900 leading-none">Cadastrar Funcionário</h3>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                                  Gestão de Equipe: {companies.find(c => c.id === selectedCompanyId)?.name}
                                </p>
                              </div>
                            </div>
                            <div className={`p-2 rounded-xl bg-gray-50 text-gray-400 group-hover:text-[#1B9E9E] group-hover:bg-teal-50 transition-all ${isCreateFormExpanded ? 'rotate-180' : ''}`}>
                              <ChevronDown size={20} />
                            </div>
                          </button>

                          <AnimatePresence>
                            {isCreateFormExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                animate={{ height: 'auto', opacity: 1, marginTop: 24 }}
                                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                className="overflow-hidden"
                              >
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
                                    <div className="relative group">
                                      <input 
                                        type={showNewPassword ? 'text' : 'password'}
                                        required
                                        value={newEmployeePassword}
                                        onChange={(e) => setNewEmployeePassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 pr-12 text-sm font-medium focus:outline-none focus:border-[#1B9E9E] transition-colors"
                                      />
                                      <button 
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1B9E9E] transition-colors"
                                        title={showNewPassword ? "Ocultar senha" : "Mostrar senha"}
                                      >
                                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                      </button>
                                    </div>
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

                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Entrada</label>
                                      <input 
                                        type="time"
                                        required
                                        value={newEmployeeWorkStart}
                                        onChange={(e) => setNewEmployeeWorkStart(e.target.value)}
                                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-[#1B9E9E] transition-colors"
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Saída</label>
                                      <input 
                                        type="time"
                                        required
                                        value={newEmployeeWorkEnd}
                                        onChange={(e) => setNewEmployeeWorkEnd(e.target.value)}
                                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-[#1B9E9E] transition-colors"
                                      />
                                    </div>
                                    
                                    <div className="col-span-2 flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                                          <Clock size={18} />
                                        </div>
                                        <div>
                                          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Regime Especial</p>
                                          <p className="text-xs font-bold text-gray-700">Escala 12x36</p>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setNewEmployeeIs12x36(!newEmployeeIs12x36)}
                                        className={`w-12 h-6 rounded-full transition-all relative ${newEmployeeIs12x36 ? 'bg-[#1B9E9E]' : 'bg-gray-200'}`}
                                      >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${newEmployeeIs12x36 ? 'left-7' : 'left-1'}`} />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Intervalo de Almoço (minutos)</label>
                                    <input 
                                      type="number"
                                      required
                                      min="0"
                                      value={newEmployeeLunchDuration}
                                      onChange={(e) => setNewEmployeeLunchDuration(e.target.value)}
                                      placeholder="Ex: 60"
                                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:border-[#1B9E9E] transition-colors"
                                    />
                                  </div>

                                  <button 
                                    type="submit"
                                    className="w-full py-4 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg mt-4"
                                  >
                                    Confirmar Cadastro
                                  </button>
                                </form>
                              </motion.div>
                            )}
                          </AnimatePresence>
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
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-bold text-gray-900 group-hover:text-[#1a3551] transition-colors uppercase tracking-tight">{emp.name}</p>
                                      {emp.is_12x36 && (
                                        <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">12x36</span>
                                      )}
                                    </div>
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
                  </div>
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
                  <button 
                    onClick={() => setIsCompaniesListExpanded(!isCompaniesListExpanded)}
                    className="flex items-center justify-between w-full px-2 py-2 group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <ListTodo size={16} className={`transition-colors ${isCompaniesListExpanded ? 'text-[#1B9E9E]' : 'text-gray-400'}`} />
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 group-hover:text-gray-700 transition-colors">Empresas Cadastradas</h4>
                    </div>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform duration-300 ${isCompaniesListExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isCompaniesListExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-4"
                      >
                        {companies.length === 0 ? (
                          <div className="p-10 border border-dashed border-gray-300 rounded-[2rem] text-center text-gray-400 text-xs italic">
                            Nenhuma empresa cadastrada.
                          </div>
                        ) : (
                          companies.map(company => (
                            <div 
                              key={company.id} 
                              className="w-full bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-between group transition-all"
                            >
                              <button
                                onClick={() => {
                                  setSelectedCompanyId(company.id);
                                  setEditCompanyName(company.name);
                                  setEditCompanyEmail(company.admin_email);
                                  setEditCompanyPassword(company.password || '');
                                  setActiveTab('company-edit');
                                }}
                                className="flex-1 flex items-center gap-4 text-left active:scale-95"
                              >
                                <div className="w-12 h-12 bg-gray-100 text-gray-400 flex items-center justify-center rounded-2xl group-hover:bg-teal-50 group-hover:text-[#1B9E9E] transition-colors">
                                  <Briefcase size={20} />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-gray-900 group-hover:text-[#1B9E9E] transition-colors">{company.name}</p>
                                  <p className="text-xs text-gray-400">{company.admin_email}</p>
                                </div>
                              </button>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedCompanyId(company.id);
                                    setEditCompanyName(company.name);
                                    setEditCompanyEmail(company.admin_email);
                                    setEditCompanyPassword(company.password || '');
                                    setActiveTab('company-edit');
                                  }}
                                  className="p-2 text-[8px] bg-green-50 text-green-600 hover:bg-green-100 rounded uppercase font-black transition-colors"
                                >
                                  Gerenciar
                                </button>
                                <button
                                  onClick={() => handleDeleteCompany(company.id, company.name)}
                                  className="p-3 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                  title="Excluir Empresa"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                    <div className="flex p-1 bg-gray-100 rounded-2xl gap-1">
                      <button 
                        onClick={() => setManualType('in')}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                          ${manualType === 'in' ? 'bg-green-500 text-white shadow-md' : 'bg-transparent text-gray-400 hover:bg-white'}
                        `}
                      >
                        Entrada
                      </button>
                      <button 
                        onClick={() => setManualType('out')}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                          ${manualType === 'out' ? 'bg-red-500 text-white shadow-md' : 'bg-transparent text-gray-400 hover:bg-white'}
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
