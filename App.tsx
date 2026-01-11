
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TimeEntry, ServiceType, Collaborator, Folder, UserRole, TaskAssignment, Attendance } from './types';
import TimeEntryForm from './components/TimeEntryForm';
import Dashboard from './components/Dashboard';
import EntityModal from './components/EntityModal';
import ClockingModule from './components/ClockingModule';
import PlanningModule from './components/PlanningModule';
import Logo from './components/Logo';
import { 
  LayoutDashboard, Clock, List, Users, FolderOpen, LogOut, 
  PlusCircle, Loader2, Search, Trash2, Download, Table, Edit3, ShieldCheck, User as UserIcon,
  Calendar as CalendarIcon, UserPlus, Bell, AlertTriangle, Info, CheckCircle2, Eye, X
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { exportToExcel } from './services/csvService';

const STORE = { 
  USER_ID: 'mgtso_v1_userid', 
  READ_ALERTS: 'mgtso_v1_read_alerts'
};
const DEFAULT_SUPABASE_URL = "https://cvbovfqbgdchdycqtmpr.supabase.co";
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2Ym92ZnFiZ2RjaGR5Y3F0bXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTcyNDcsImV4cCI6MjA4MjQzMzI0N30.e16pFuNwInvA51q9X1V_0fpAWar8JPVQZD4-tfx0gdk";

export const formatDateFR = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

const App: React.FC = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => localStorage.getItem(STORE.USER_ID));
  const [loginStep, setLoginStep] = useState<{collab: Collaborator} | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tasks, setTasks] = useState<TaskAssignment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [view, setView] = useState<'log' | 'dashboard' | 'collabs' | 'folders' | 'planning' | 'clocking' | 'history'>('log');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [notif, setNotif] = useState<{type: 'success'|'error', msg: string} | null>(null);
  const [entityModal, setEntityModal] = useState<{type: 'collab' | 'folder', data?: any} | null>(null);
  const [showNotifCenter, setShowNotifCenter] = useState(false);
  const [readAlerts, setReadAlerts] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORE.READ_ALERTS);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [poleFilter, setPoleFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'all' | 'day' | 'week' | 'month'>('all');

  const supabase = useMemo(() => createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY), []);

  const showNotif = useCallback((type: 'success' | 'error', msg: string) => {
    setNotif({ type, msg });
    setTimeout(() => setNotif(null), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const { data: cData } = await supabase.from('collaborators').select('*');
      const { data: fData } = await supabase.from('folders').select('*');
      const { data: eData } = await supabase.from('time_entries').select('*').order('date', { ascending: false });
      const { data: tData } = await supabase.from('tasks').select('*').order('deadline', { ascending: true });
      const { data: aData } = await supabase.from('attendance').select('*').order('date', { ascending: false });
      
      setCollaborators(cData?.map(c => ({ 
        id: String(c.id), name: c.name, department: c.department as ServiceType, hiringDate: c.hiring_date, role: c.role as UserRole, password: String(c.password), startTime: c.start_time || "09:00", endTime: c.end_time || "18:00"
      })) || []);
      setFolders(fData?.map(f => ({ id: String(f.id), name: f.name, number: f.number, clientName: f.client_name, serviceType: f.service_type as ServiceType, budgetHours: f.budget_hours })) || []);
      setEntries(eData?.map(e => ({ id: String(e.id), collaboratorId: String(e.collaborator_id), collaboratorName: e.collaborator_name, folderId: String(e.folder_id), folderName: e.folder_name, folderNumber: e.folder_number, duration: e.duration, date: e.date, description: e.description, isOvertime: e.is_overtime, service: e.service as ServiceType })) || []);
      
      // FIX: Mapping correct pour le Planning (camelCase vs snake_case)
      setTasks(tData?.map(t => ({ 
        id: String(t.id), 
        title: t.title, 
        assignedToId: String(t.assigned_to_id), 
        assignedById: String(t.assigned_by_id), 
        pole: t.pole || 'Audit', 
        deadline: t.deadline, 
        status: t.status as 'todo' | 'done', 
        urgency: (t.urgency || 'normal') as any 
      })) || []);
      
      setAttendance(aData?.map(a => ({ id: String(a.id), collaboratorId: String(a.collaborator_id), date: a.date, checkIn: a.check_in || "", checkOut: a.check_out })) || []);
      setIsDataLoaded(true);
    } catch (err) {
      showNotif('error', "Erreur chargement");
      setIsDataLoaded(true);
    }
  }, [supabase, showNotif]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentUser = useMemo(() => collaborators.find(c => String(c.id) === String(currentUserId)), [collaborators, currentUserId]);
  const isAdminOrManager = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;

  const systemAlerts = useMemo(() => {
    if (!currentUser) return [];
    const alerts: {id: string, title: string, msg: string, type: 'warning' | 'info', icon?: React.ReactNode}[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    const today = now.toISOString().split('T')[0];

    tasks.filter(t => String(t.assignedToId) === String(currentUser.id) && String(t.assignedById) !== String(currentUser.id) && t.status === 'todo').forEach(t => {
      const alertId = `task_${t.id}`;
      if (!readAlerts.includes(alertId)) {
        alerts.push({ id: alertId, title: "Nouvelle Tâche", msg: t.title, type: 'info', icon: <List size={14}/> });
      }
    });

    const todayAttendance = attendance.find(a => a.date === today && String(a.collaboratorId) === String(currentUser.id));
    const [startH, startM] = (currentUser.startTime || "09:00").split(':').map(Number);
    if (!todayAttendance && (currentHour > startH || (currentHour === startH && now.getMinutes() > startM + 15))) {
      const alertId = `clockin_${today}`;
      if (!readAlerts.includes(alertId)) {
        alerts.push({ id: alertId, title: "Pointage manquant", msg: "Avez-vous oublié de pointer votre arrivée ?", type: 'warning', icon: <Clock size={14}/> });
      }
    }

    const todayHours = entries.filter(e => e.date === today && String(e.collaboratorId) === String(currentUser.id)).reduce((sum, e) => sum + e.duration, 0);
    if (currentHour >= 18 && todayHours < 7.5) {
      const alertId = `timesheet_${today}`;
      if (!readAlerts.includes(alertId)) {
        alerts.push({ id: alertId, title: "Saisie incomplète", msg: `Journée de ${todayHours}h. Pensez à compléter vos travaux.`, type: 'warning', icon: <Edit3 size={14}/> });
      }
    }

    return alerts;
  }, [currentUser, tasks, attendance, entries, readAlerts]);

  const markAlertAsRead = (id: string) => {
    const updated = [...readAlerts, id];
    setReadAlerts(updated);
    localStorage.setItem(STORE.READ_ALERTS, JSON.stringify(updated));
  };

  const clearAllAlerts = () => {
    const allIds = systemAlerts.map(a => a.id);
    const updated = [...new Set([...readAlerts, ...allIds])];
    setReadAlerts(updated);
    localStorage.setItem(STORE.READ_ALERTS, JSON.stringify(updated));
    setShowNotifCenter(false);
  };

  const handleLoginAttempt = () => {
    if (loginStep && pinInput === String(loginStep.collab.password)) {
      setCurrentUserId(loginStep.collab.id);
      localStorage.setItem(STORE.USER_ID, loginStep.collab.id);
      setLoginStep(null);
      setPinInput('');
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
      setTimeout(() => setPinError(false), 2000);
    }
  };

  const handleLogout = () => {
    setCurrentUserId(null);
    localStorage.removeItem(STORE.USER_ID);
  };

  const handleDeletion = useCallback(async (id: string, table: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cet élément ?")) return;
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      showNotif('success', "Supprimé avec succès");
      fetchData();
    } catch (err) {
      console.error(err);
      showNotif('error', "Erreur lors de la suppression");
    }
  }, [supabase, showNotif, fetchData]);

  const filteredHistory = useMemo(() => {
    return entries.filter(e => {
      if (!isAdminOrManager && String(e.collaboratorId) !== String(currentUserId)) return false;
      const matchSearch = e.collaboratorName.toLowerCase().includes(searchQuery.toLowerCase()) || e.folderName.toLowerCase().includes(searchQuery.toLowerCase()) || e.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPole = poleFilter === 'all' || e.service?.toLowerCase() === poleFilter.toLowerCase();
      if (!matchSearch || !matchPole) return false;
      if (timeRange !== 'all') {
        const entryDate = new Date(e.date);
        const today = new Date();
        today.setHours(0,0,0,0);
        if (timeRange === 'day') return e.date === new Date().toISOString().split('T')[0];
        if (timeRange === 'week') {
          const weekAgo = new Date();
          weekAgo.setDate(today.getDate() - 7);
          return entryDate >= weekAgo;
        }
        if (timeRange === 'month') return entryDate.getMonth() === today.getMonth() && entryDate.getFullYear() === today.getFullYear();
      }
      return true;
    });
  }, [entries, searchQuery, poleFilter, timeRange, isAdminOrManager, currentUserId]);

  const handleExport = () => {
    const data = [
      ["DATE", "COLLABORATEUR", "DOSSIER", "N° DOSSIER", "PÔLE", "TRAVAUX", "DURÉE"],
      ...filteredHistory.map(e => [formatDateFR(e.date), e.collaboratorName, e.folderName, e.folderNumber, e.service, e.description, e.duration])
    ];
    exportToExcel("Export_MSO_Historique", data);
  };

  if (!isDataLoaded) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-indigo-500"><Loader2 className="animate-spin" size={48} /></div>;

  if (!currentUserId) {
    if (loginStep) {
      return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-indigo-500/5 blur-[120px] rounded-full"></div>
          <div className="bg-white rounded-[4rem] w-full max-w-sm p-16 text-center shadow-[0_40px_80px_-15px_rgba(0,0,0,0.5)] animate-in zoom-in duration-300 relative z-10">
            <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-indigo-100">
              <ShieldCheck size={48} className="text-white" />
            </div>
            <h3 className="text-4xl font-black text-slate-900 mb-2 leading-none tracking-tight">Vérification PIN</h3>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-12">Session : {loginStep.collab.name}</p>
            <input type="password" maxLength={6} autoFocus className={`w-full p-6 bg-slate-50 border-2 ${pinError ? 'border-rose-500 bg-rose-50 animate-shake' : 'border-slate-100'} rounded-[2rem] font-black text-center text-4xl tracking-[0.4em] text-indigo-600 outline-none mb-12 shadow-inner transition-all`} value={pinInput} onChange={e => setPinInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLoginAttempt()} />
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => { setLoginStep(null); setPinInput(''); }} className="p-5 bg-slate-100 text-slate-900 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Retour</button>
              <button onClick={handleLoginAttempt} className="p-5 bg-indigo-600 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Valider</button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-white relative">
        <div className="text-center mb-16 flex flex-col items-center">
          <Logo variant="both" size={80} showText={false} className="mb-6" />
          <h1 className="text-8xl font-black tracking-tighter text-white mb-2">Management SO</h1>
          <p className="text-indigo-400 font-black text-xs uppercase tracking-[0.5em]">Audit & Conseil • Plateforme Interne</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl max-h-[60vh] overflow-y-auto p-4 hide-scrollbar">
          {collaborators.map(c => (
            <button key={c.id} onClick={() => setLoginStep({collab: c})} className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800 hover:border-indigo-500 transition-all text-left group">
              <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.role === UserRole.COLLABORATOR ? 'bg-slate-800' : 'bg-indigo-600'}`}><UserIcon size={20}/></div>
                <Logo variant="both" size={24} showText={false} />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">{c.name}</h3>
              <p className="text-[9px] uppercase tracking-[0.2em] text-indigo-400 font-black mt-2">{c.department} • {c.role}</p>
              <p className="text-[8px] text-slate-500 font-bold mt-1 uppercase tracking-widest">{c.startTime} - {c.endTime}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      {notif && <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[1000] px-8 py-4 rounded-2xl text-white font-bold text-[10px] uppercase tracking-widest shadow-2xl ${notif.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>{notif.msg}</div>}

      <aside className="w-80 bg-[#0f172a] text-white p-10 flex flex-col shrink-0 relative shadow-2xl">
        <div className="mb-12">
          <Logo variant="both" size={32} showText={false} className="mb-4" />
          <h1 className="text-xl font-black tracking-tighter">MSO Platform</h1>
          <div className="w-8 h-1 bg-indigo-600 mt-2 rounded-full"></div>
        </div>
        <nav className="space-y-3 flex-grow">
          <button onClick={() => setView('log')} className={`w-full flex items-center gap-4 px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${view === 'log' ? 'bg-indigo-600 shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}><PlusCircle size={18}/> Saisie Temps</button>
          <button onClick={() => setView('planning')} className={`w-full flex items-center gap-4 px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${view === 'planning' ? 'bg-indigo-600 shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}><List size={18}/> To-Do List</button>
          <button onClick={() => setView('clocking')} className={`w-full flex items-center gap-4 px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${view === 'clocking' ? 'bg-indigo-600 shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}><Clock size={18}/> Pointage</button>
          <button onClick={() => setView('history')} className={`w-full flex items-center gap-4 px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${view === 'history' ? 'bg-indigo-600 shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}><Table size={18}/> Historique</button>
          
          {isAdminOrManager && (
            <div className="pt-10 border-t border-slate-800 mt-6 space-y-3">
              <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-4 px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${view === 'dashboard' ? 'bg-indigo-600 shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}><LayoutDashboard size={18}/> Dashboard</button>
              <button onClick={() => setView('folders')} className={`w-full flex items-center gap-4 px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${view === 'folders' ? 'bg-indigo-600 shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}><FolderOpen size={18}/> Dossiers</button>
              <button onClick={() => setView('collabs')} className={`w-full flex items-center gap-4 px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${view === 'collabs' ? 'bg-indigo-600 shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}><Users size={18}/> Équipe</button>
            </div>
          )}
        </nav>
        <div className="mt-auto space-y-8">
           <div className="p-6 bg-indigo-950/40 rounded-3xl border border-indigo-500/20 text-center relative overflow-hidden group">
              <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest leading-relaxed italic relative z-10">
                "SO Audit Conseil : la voie de la dématérialisation"
              </p>
           </div>
           <button onClick={handleLogout} className="w-full flex items-center gap-2 text-slate-500 hover:text-rose-400 font-black uppercase text-[9px] tracking-widest transition-colors"><LogOut size={16}/> Déconnexion</button>
        </div>
      </aside>

      <main className="flex-grow p-16 overflow-y-auto relative">
        <header className="mb-12 border-b border-slate-200 pb-10 flex justify-between items-end">
          <div className="flex items-center gap-6">
            <Logo variant="both" size={64} showText={false} />
            <div>
              <h2 className="text-7xl font-black tracking-tighter uppercase text-slate-900 leading-none">{view === 'log' ? 'Saisie' : view === 'planning' ? 'Planning' : view === 'clocking' ? 'Pointage' : view === 'history' ? 'Historique' : view}</h2>
              <p className="text-indigo-600 font-black text-[11px] uppercase tracking-[0.3em] mt-3">
                {currentUser.name} • <span className="text-slate-900">{currentUser.role.toUpperCase()}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {isAdminOrManager && (['history', 'dashboard', 'folders', 'collabs', 'planning'].includes(view)) && (
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                 {['all', 'Audit', 'Expertise'].map(p => (
                   <button key={p} onClick={() => setPoleFilter(p)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${poleFilter === p ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>{p === 'all' ? 'Cabinet' : p}</button>
                 ))}
              </div>
            )}
            <div className="relative">
              <button onClick={() => setShowNotifCenter(!showNotifCenter)} className={`p-4 rounded-2xl border transition-all relative ${systemAlerts.length > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white border-slate-100 text-slate-400'}`}>
                <Bell size={20} className={systemAlerts.length > 0 ? 'animate-bounce' : ''}/>
                {systemAlerts.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">{systemAlerts.length}</span>}
              </button>
              {showNotifCenter && (
                <div className="absolute right-0 mt-4 w-96 bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] border border-slate-100 z-[500] p-8 animate-in slide-in-from-top-4">
                  <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-50">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Notifications</h4>
                    {systemAlerts.length > 0 && (
                      <button onClick={clearAllAlerts} className="text-[9px] font-black uppercase text-indigo-600 hover:text-slate-900 transition-colors">Tout marquer comme lu</button>
                    )}
                  </div>
                  {systemAlerts.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle2 className="mx-auto text-emerald-100 mb-4" size={48}/>
                      <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest italic">Aucun rappel en attente</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {systemAlerts.map((a, i) => (
                        <div key={i} className={`p-5 rounded-3xl flex gap-5 group relative transition-all ${a.type === 'warning' ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${a.type === 'warning' ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white'}`}>
                            {a.icon || (a.type === 'warning' ? <AlertTriangle size={16}/> : <Info size={16}/>)}
                          </div>
                          <div className="flex-grow">
                            <p className="font-black text-[10px] uppercase leading-none mb-1.5">{a.title}</p>
                            <p className="text-[11px] font-bold leading-tight opacity-80">{a.msg}</p>
                          </div>
                          <button onClick={() => markAlertAsRead(a.id)} className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-slate-900 opacity-0 group-hover:opacity-100 transition-all" title="Marquer comme lu">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="space-y-12">
          {view === 'log' && <TimeEntryForm currentUser={currentUser} folders={folders} existingEntries={entries} onAddEntry={async (d) => {
            const f = folders.find(folder => folder.id === d.folderId);
            await supabase.from('time_entries').insert([{ id: `e_${Date.now()}`, collaborator_id: currentUserId, collaborator_name: currentUser.name, folder_id: f?.id, folder_name: f?.name, folder_number: f?.number, duration: d.duration, date: d.date, description: d.description, is_overtime: d.is_overtime, service: f?.serviceType }]);
            showNotif('success', "Enregistré"); fetchData();
          }} />}
          
          {view === 'planning' && <PlanningModule currentUser={currentUser} tasks={tasks} team={collaborators} showNotif={showNotif} onAddTask={async (t) => {
            await supabase.from('tasks').insert([{ id: `t_${Date.now()}`, title: t.title, assigned_to_id: t.assignedToId, assigned_by_id: currentUserId, pole: t.pole || currentUser.department, deadline: t.deadline, status: 'todo', urgency: t.urgency || 'normal' }]);
            fetchData();
          }} onUpdateTask={async (id, updates) => { 
            // Mapping updates keys for DB
            const dbUpdates: any = { ...updates };
            if (updates.assignedToId) { dbUpdates.assigned_to_id = updates.assignedToId; delete dbUpdates.assignedToId; }
            if (updates.assignedById) { dbUpdates.assigned_by_id = updates.assignedById; delete dbUpdates.assignedById; }
            await supabase.from('tasks').update(dbUpdates).eq('id', id); 
            fetchData(); 
          }} onDeleteTask={async (id) => handleDeletion(id, 'tasks')} poleFilter={poleFilter} />}

          {view === 'history' && (
            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
               <div className="p-8 border-b flex justify-between items-center bg-slate-50 gap-6">
                 <div className="flex-grow max-w-md relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                    <input type="text" placeholder="Rechercher..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-900 text-xs outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                 </div>
                 <div className="flex gap-2">
                    {['all', 'day', 'week', 'month'].map(r => (
                      <button key={r} onClick={() => setTimeRange(r as any)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border transition-all flex items-center gap-2 ${timeRange === r ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>
                        {r === 'all' ? 'Tout' : r === 'day' ? "Aujourd'hui" : r === 'week' ? '7 Jours' : 'Ce Mois'}
                      </button>
                    ))}
                 </div>
                 <button onClick={handleExport} className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg hover:bg-slate-900 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"><Download size={18}/> EXPORTER XLS</button>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-900 border-b">
                      <tr>
                        <th className="p-6">Date</th>
                        <th className="p-6">Collaborateur</th>
                        <th className="p-6">Dossier</th>
                        <th className="p-6">Description / Travaux</th>
                        <th className="p-6">Heures</th>
                        <th className="p-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredHistory.map(e => (
                        <tr key={e.id} className="text-xs hover:bg-slate-50 text-slate-900 group transition-all">
                          <td className="p-6 font-bold">{formatDateFR(e.date)}</td>
                          <td className="p-6 font-bold text-indigo-600">{e.collaboratorName}</td>
                          <td className="p-6 font-black">{e.folderName} <span className="block text-[8px] text-slate-400 font-bold">{e.folderNumber}</span></td>
                          <td className="p-6 font-medium italic text-slate-700">{e.description}</td>
                          <td className="p-6 font-black text-slate-900">{e.duration}h</td>
                          <td className="p-6 text-right">
                             <button onClick={() => handleDeletion(e.id, 'time_entries')} className="p-2 text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                               <Trash2 size={16} />
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
                 {filteredHistory.length === 0 && <div className="p-20 text-center text-slate-300 font-bold text-[10px] uppercase tracking-widest">Aucune saisie trouvée</div>}
               </div>
            </div>
          )}

          {view === 'dashboard' && <Dashboard entries={entries} folders={folders} attendance={attendance} collaborators={collaborators} poleFilter={poleFilter} />}
          {view === 'clocking' && <ClockingModule currentUser={currentUser} collaborators={collaborators} attendance={attendance} onCheckIn={async (t) => { await supabase.from('attendance').insert([{ id: `a_${Date.now()}`, collaborator_id: currentUserId, date: new Date().toISOString().split('T')[0], check_in: t }]); fetchData(); }} onCheckOut={async (id, t) => { await supabase.from('attendance').update({ check_out: t }).eq('id', id); fetchData(); }} poleFilter={poleFilter} onExport={() => {
            const data = [["DATE", "COLLABORATEUR", "ENTREE", "SORTIE"], ...attendance.map(a => [formatDateFR(a.date), collaborators.find(c => c.id === a.collaboratorId)?.name || "Inconnu", a.checkIn, a.checkOut || "-"])];
            exportToExcel("Pointage_MSO", data);
          }} />}
          
          {view === 'folders' && (
            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input type="text" placeholder="Rechercher..." className="w-full pl-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                </div>
                <button onClick={() => setEntityModal({type: 'folder'})} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-xl hover:bg-slate-900 transition-all">Ajouter Dossier</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-widest border-b text-slate-900">
                     <tr><th className="p-6">Numéro</th><th className="p-6">Nom</th><th className="p-6">Client</th><th className="p-6">Pôle</th><th className="p-6 text-right">Actions</th></tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {folders.filter(f => (poleFilter === 'all' || f.serviceType.toLowerCase() === poleFilter.toLowerCase()) && (f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.number.toLowerCase().includes(searchQuery.toLowerCase()))).map(f => (
                       <tr key={f.id} className="text-xs hover:bg-slate-50 text-slate-900">
                         <td className="p-6 font-black text-slate-400">{f.number}</td>
                         <td className="p-6 font-bold">{f.name}</td>
                         <td className="p-6 font-medium text-slate-500">{f.clientName}</td>
                         <td className="p-6"><span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full font-black uppercase text-[9px]">{f.serviceType}</span></td>
                         <td className="p-6 text-right"><div className="flex justify-end gap-2">
                           <button onClick={() => setEntityModal({type: 'folder', data: f})} className="p-2 text-slate-300 hover:text-indigo-600 transition-all"><Edit3 size={16}/></button>
                           <button onClick={() => handleDeletion(f.id, 'folders')} className="p-2 text-slate-300 hover:text-rose-500 transition-all"><Trash2 size={16}/></button>
                         </div></td>
                       </tr>
                     ))}
                   </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'collabs' && (
            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50">
                <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input type="text" placeholder="Rechercher..." className="w-full pl-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                <button onClick={() => setEntityModal({type: 'collab'})} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-xl hover:bg-slate-900 transition-all">Nouveau Membre</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-widest border-b text-slate-900">
                     <tr><th className="p-6">Nom</th><th className="p-6">Rôle</th><th className="p-6">Horaires</th><th className="p-6 text-right">Actions</th></tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {collaborators.filter(c => (poleFilter === 'all' || c.department.toLowerCase() === poleFilter.toLowerCase()) && c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(c => (
                       <tr key={c.id} className="text-xs hover:bg-slate-50 text-slate-900">
                         <td className="p-6 font-bold">{c.name}</td>
                         <td className="p-6"><span className={`px-3 py-1 rounded-full font-bold text-[9px] uppercase tracking-widest ${c.role === UserRole.ADMIN ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{c.role}</span></td>
                         <td className="p-6 font-black text-indigo-400">{c.startTime} - {c.endTime}</td>
                         <td className="p-6 text-right"><div className="flex justify-end gap-2">
                           <button onClick={() => setEntityModal({type: 'collab', data: c})} className="p-2 text-slate-300 hover:text-indigo-600 transition-all"><Edit3 size={16}/></button>
                           <button onClick={() => handleDeletion(c.id, 'collaborators')} className="p-2 text-slate-300 hover:text-rose-500 transition-all"><Trash2 size={16}/></button>
                         </div></td>
                       </tr>
                     ))}
                   </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {entityModal && <EntityModal type={entityModal.type} initialData={entityModal.data} onSave={async (data) => {
        const payload: any = entityModal.type === 'collab' 
          ? { id: data.id || `c_${Date.now()}`, name: data.name, department: data.department, role: data.role, password: data.password, hiring_date: data.hiringDate, start_time: data.startTime, end_time: data.endTime }
          : { id: data.id || `f_${Date.now()}`, name: data.name, number: data.number, client_name: data.clientName, service_type: data.serviceType, budget_hours: data.budgetHours };
        await supabase.from(entityModal.type === 'collab' ? 'collaborators' : 'folders').upsert([payload]);
        showNotif('success', "Enregistré"); setEntityModal(null); fetchData();
      }} onClose={() => setEntityModal(null)} />}
    </div>
  );
};

export default App;
