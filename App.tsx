
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TimeEntry, ServiceType, Collaborator, Folder, UserRole, TaskAssignment, Attendance } from './types';
import TimeEntryForm from './components/TimeEntryForm';
import Dashboard from './components/Dashboard';
import EntityModal from './components/EntityModal';
import ClockingModule from './components/ClockingModule';
import PlanningModule from './components/PlanningModule';
import EntryEditModal from './components/EntryEditModal';
import ConfirmModal from './components/ConfirmModal';
import Logo from './components/Logo';
import { 
  LayoutDashboard, Clock, List, Users, FolderOpen, LogOut, 
  PlusCircle, Loader2, Search, Trash2, Download, Table, Edit3, 
  Bell, AlertTriangle, CheckCircle2, Shield
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { exportToExcel } from './services/csvService';

const STORE = { USER_ID: 'mgtso_v1_userid' };
const DEFAULT_SUPABASE_URL = "https://cvbovfqbgdchdycqtmpr.supabase.co";
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2Ym92ZnFiZ2RjaGR5Y3F0bXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTcyNDcsImV4cCI6MjA4MjQzMzI0N30.e16pFuNwInvA51q9X1V_0fpAWar8JPVQZD4-tfx0gdk";

const generateId = () => crypto.randomUUID();

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

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tasks, setTasks] = useState<TaskAssignment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [view, setView] = useState<'log' | 'dashboard' | 'collabs' | 'folders' | 'planning' | 'clocking' | 'history'>('log');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [notif, setNotif] = useState<{type: 'success'|'error', msg: string} | null>(null);
  const [entityModal, setEntityModal] = useState<{type: 'collab' | 'folder', data?: any} | null>(null);
  const [editEntryModal, setEditEntryModal] = useState<TimeEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, table: string, label: string} | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [poleFilter, setPoleFilter] = useState<string>('all');
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const supabase = useMemo(() => createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY), []);

  const showNotif = useCallback((type: 'success' | 'error', msg: string) => {
    setNotif({ type, msg });
    setTimeout(() => setNotif(null), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const { data: cData } = await supabase.from('collaborators').select('*').order('name');
      const { data: fData } = await supabase.from('folders').select('*').order('number');
      const { data: eData = [] } = await supabase.from('time_entries').select('*').order('date', { ascending: false });
      const { data: tData = [] } = await supabase.from('tasks').select('*').order('deadline', { ascending: true });
      const { data: aData = [] } = await supabase.from('attendance').select('*').order('date', { ascending: false });
      
      setCollaborators(cData?.map(c => ({ id: String(c.id), name: c.name, department: c.department as ServiceType, hiringDate: c.hiring_date, role: c.role as UserRole, password: String(c.password), startTime: c.start_time || "09:00", endTime: c.end_time || "18:00" })) || []);
      setFolders(fData?.map(f => ({ id: String(f.id), name: f.name, number: f.number, clientName: f.client_name, serviceType: f.service_type as ServiceType, budgetHours: f.budget_hours })) || []);
      setEntries(eData?.map(e => ({ id: String(e.id), collaboratorId: String(e.collaborator_id), collaboratorName: e.collaborator_name, folderId: e.folder_id ? String(e.folder_id) : '', folderName: e.folder_name, folderNumber: e.folder_number, duration: e.duration, date: e.date, description: e.description, isOvertime: e.is_overtime, service: e.service as ServiceType })) || []);
      setTasks(tData?.map((t:any) => ({ id: String(t.id), title: t.title, assignedToId: String(t.assigned_to_id), assignedById: String(t.assigned_by_id), pole: t.pole || 'Audit', deadline: t.deadline, status: t.status as 'todo' | 'done', urgency: (t.urgency || 'normal') as any })) || []);
      setAttendance(aData?.map(a => ({ id: String(a.id), collaboratorId: String(a.collaborator_id), date: a.date, checkIn: a.check_in || "", checkOut: a.check_out || "" })) || []);
      setIsDataLoaded(true);
    } catch (err) { showNotif('error', "Erreur de chargement"); setIsDataLoaded(true); }
  }, [supabase, showNotif]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentUser = useMemo(() => collaborators.find(c => String(c.id) === String(currentUserId)), [collaborators, currentUserId]);
  const isAdminOrManager = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;

  // Support clavier PIN physique (optimisé)
  useEffect(() => {
    if (!loginStep) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        setPinInput(prev => {
          const next = prev.length < 6 ? prev + e.key : prev;
          return next;
        });
      } else if (e.key === 'Backspace') {
        setPinInput(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        setPinInput(prev => {
          if (prev.length >= 4) handleLoginAttempt(prev);
          return prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loginStep, pinInput]);

  const handleLoginAttempt = useCallback((input: string) => {
    if (!loginStep) return;
    if (String(loginStep.collab.password) === input) {
      setCurrentUserId(String(loginStep.collab.id));
      localStorage.setItem(STORE.USER_ID, String(loginStep.collab.id));
      setLoginStep(null); setPinInput('');
      showNotif('success', "Connexion réussie");
    } else {
      setPinInput('');
      showNotif('error', "Code PIN incorrect");
    }
  }, [loginStep, showNotif]);

  const notifications = useMemo(() => {
    if (!currentUser) return [];
    const list = [];
    
    // 1. Missions reçues des autres uniquement
    const othersTasks = tasks.filter(t => 
      String(t.assignedToId) === String(currentUser.id) && 
      String(t.assignedById) !== String(currentUser.id) && 
      t.status === 'todo'
    );
    othersTasks.forEach(t => {
      const assigner = collaborators.find(c => String(c.id) === String(t.assignedById));
      list.push({ 
        id: t.id, type: 'task', title: 'MISSION REÇUE', msg: t.title, 
        detail: assigner ? `Assignée par ${assigner.name}` : "Assignée par Manager",
        icon: <List size={18}/>, color: 'bg-blue-600' 
      });
    });

    const today = new Date().toISOString().split('T')[0];
    
    // 2. Oubli de pointage
    const todayAtt = attendance.find(a => a.date === today && String(a.collaboratorId) === String(currentUser.id));
    if (!todayAtt) {
      list.push({ 
        id: 'att-missing', type: 'clock', title: 'POINTAGE MANQUANT', msg: 'Pensez à pointer votre arrivée.', 
        detail: today, icon: <Clock size={18}/>, color: 'bg-rose-500' 
      });
    }

    // 3. Oubli de saisie de temps
    const todayEntries = entries.filter(e => e.date === today && String(e.collaboratorId) === String(currentUser.id));
    if (todayEntries.length === 0) {
      list.push({ 
        id: 'log-missing', type: 'log', title: 'SAISIE MANQUANTE', msg: 'Vous n\'avez pas encore saisi vos heures aujourd\'hui.', 
        detail: today, icon: <PlusCircle size={18}/>, color: 'bg-orange-500' 
      });
    }

    return list;
  }, [tasks, attendance, currentUser, collaborators, entries]);

  const filteredHistory = useMemo(() => {
    let list = entries;
    if (!isAdminOrManager) list = list.filter(e => String(e.collaboratorId) === String(currentUserId));
    if (poleFilter !== 'all') list = list.filter(e => e.service?.toLowerCase() === poleFilter.toLowerCase());
    if (searchQuery.trim()) {
      const s = searchQuery.toLowerCase();
      list = list.filter(e => e.collaboratorName.toLowerCase().includes(s) || e.folderName.toLowerCase().includes(s) || e.description.toLowerCase().includes(s));
    }
    return list;
  }, [entries, searchQuery, poleFilter, currentUserId, isAdminOrManager]);

  const handleExport = (customData?: any[][]) => {
    const fileName = `Export_MSO_${new Date().toISOString().split('T')[0]}`;
    if (customData) { exportToExcel(fileName, customData); return; }
    const data = [["DATE", "COLLABORATEUR", "DOSSIER", "DESCRIPTION", "HEURES"], ...filteredHistory.map(e => [formatDateFR(e.date), e.collaboratorName, e.folderName, e.description, e.duration])];
    exportToExcel(fileName, data);
  };

  if (!isDataLoaded) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  // LOGIN PIN (STYLE PHOTO)
  if (!currentUserId || !currentUser) {
    if (loginStep) {
      return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white overflow-hidden">
          <div className="bg-white rounded-[4rem] w-full max-w-[440px] p-12 text-center shadow-2xl animate-in zoom-in">
            <div className="w-16 h-16 bg-white border-2 border-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-10 shadow-sm">
              <Shield size={34} className="text-indigo-600" />
            </div>
            <h3 className="text-[44px] font-black text-[#1e1b4b] mb-1 tracking-tight">PIN Code</h3>
            <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] mb-16">{loginStep.collab.name}</p>
            <div className="bg-[#eff6ff] rounded-[3.5rem] p-12 mb-16 flex items-center justify-center gap-6 relative">
              <div className="flex gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={`w-5 h-5 rounded-full transition-all duration-200 ${pinInput.length > i ? 'bg-black' : 'bg-transparent'}`} />
                ))}
              </div>
              <div className="w-[2px] h-10 bg-[#1e1b4b]/20 animate-pulse ml-3"></div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <button onClick={() => { setLoginStep(null); setPinInput(''); }} className="p-8 bg-[#f8fafc] text-[#0f172a] rounded-[2.5rem] font-black text-[14px] uppercase tracking-wider transition-all hover:bg-slate-200">RETOUR</button>
              <button onClick={() => handleLoginAttempt(pinInput)} disabled={pinInput.length < 4} className="p-8 bg-indigo-600 text-white rounded-[2.5rem] font-black text-[14px] uppercase tracking-wider shadow-2xl shadow-indigo-200 disabled:opacity-50 transition-all hover:bg-indigo-700">VALIDER</button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-10 text-white relative">
        <div className="text-center mb-16 flex flex-col items-center animate-in fade-in">
          <Logo variant="both" size={80} showText={false} className="mb-8" />
          <h1 className="text-7xl font-black tracking-tighter mb-4">Management SO</h1>
          <p className="text-indigo-400 font-black text-[11px] uppercase tracking-[0.6em] opacity-60">Cabinet d'Audit & Conseil</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full max-w-7xl">
          {collaborators.map(c => (
            <button key={c.id} onClick={() => setLoginStep({collab: c})} className="group bg-white/5 backdrop-blur-sm p-8 rounded-[3rem] border border-white/10 hover:border-indigo-500 hover:bg-white/10 transition-all text-left">
              <h3 className="text-2xl font-black text-white group-hover:text-indigo-400">{c.name}</h3>
              <div className="flex items-center gap-3 mt-4">
                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${c.department === ServiceType.AUDIT ? 'bg-blue-600 text-white' : 'bg-orange-500 text-white'}`}>{c.department}</span>
                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{c.role}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      {notif && (
        <div className={`fixed top-8 right-8 z-[1000] flex items-center gap-4 px-8 py-4 rounded-2xl text-white font-black text-[10px] uppercase tracking-widest shadow-2xl animate-in slide-in-from-right-4 ${notif.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {notif.type === 'success' ? <CheckCircle2 size={18}/> : <AlertTriangle size={18}/>} {notif.msg}
        </div>
      )}

      <aside className="w-80 bg-[#0f172a] text-white p-10 flex flex-col shrink-0 shadow-2xl">
        <div className="mb-12 flex justify-center"><Logo variant="both" size={42} showText={false} /></div>
        <nav className="space-y-3 flex-grow">
          {[{v: 'log', i: <PlusCircle size={18}/>, l: 'Saisie Temps'}, {v: 'planning', i: <List size={18}/>, l: 'Planning'}, {v: 'clocking', i: <Clock size={18}/>, l: 'Pointage'}, {v: 'history', i: <Table size={18}/>, l: 'Historique'}].map(m => (
            <button key={m.v} onClick={() => setView(m.v as any)} className={`w-full flex items-center gap-4 px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${view === m.v ? 'bg-indigo-600 shadow-xl' : 'hover:bg-slate-800 text-slate-400'}`}>{m.i} {m.l}</button>
          ))}
          {isAdminOrManager && <div className="pt-10 border-t border-slate-800 mt-6 space-y-3">
            <p className="px-8 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Administration</p>
            {[{v: 'dashboard', i: <LayoutDashboard size={18}/>, l: 'Dashboard'}, {v: 'folders', i: <FolderOpen size={18}/>, l: 'Dossiers'}, {v: 'collabs', i: <Users size={18}/>, l: 'Équipe'}].map(m => (
              <button key={m.v} onClick={() => setView(m.v as any)} className={`w-full flex items-center gap-4 px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${view === m.v ? 'bg-indigo-600 shadow-xl' : 'hover:bg-slate-800 text-slate-400'}`}>{m.i} {m.l}</button>
            ))}
          </div>}
        </nav>
        <button onClick={() => { setCurrentUserId(null); localStorage.removeItem(STORE.USER_ID); }} className="mt-auto w-full flex items-center gap-2 text-slate-500 hover:text-rose-400 font-black uppercase text-[9px] tracking-widest p-4"><LogOut size={16}/> Déconnexion</button>
      </aside>

      <main className="flex-grow p-16 overflow-y-auto relative bg-[#fdfdfe]">
        <header className="mb-12 border-b border-slate-100 pb-10 flex justify-between items-end">
          <div className="flex items-center gap-6">
            <Logo variant="both" size={64} showText={false} />
            <div>
              <h2 className="text-6xl font-black tracking-tighter uppercase text-slate-900 leading-none">
                {view === 'log' ? 'Saisie' : view === 'history' ? 'Historique' : view === 'planning' ? 'Planning' : view === 'clocking' ? 'Pointage' : view === 'collabs' ? 'Équipe' : view === 'folders' ? 'Dossiers' : 'Dashboard'}
              </h2>
              <p className="text-blue-600 font-black text-[11px] uppercase tracking-[0.3em] mt-3">{currentUser.name} • {currentUser.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
              <button onClick={() => setShowNotifPanel(!showNotifPanel)} className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm relative transition-all hover:bg-blue-100">
                <Bell size={24} />
                {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg animate-bounce">{notifications.length}</span>}
              </button>
              {showNotifPanel && (
                <div className="absolute right-0 top-16 w-80 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-6 z-[200]">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6">Notifications</p>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto hide-scrollbar">
                    {notifications.length === 0 ? <p className="text-center py-10 text-slate-300 font-black text-[10px] uppercase">Aucune alerte</p> : notifications.map(n => (
                      <div key={n.id} className="flex gap-4 p-5 rounded-[2rem] bg-slate-50 border border-slate-100 hover:border-blue-300 transition-all">
                        <div className={`w-12 h-12 ${n.color} text-white rounded-[1.2rem] flex items-center justify-center shrink-0 shadow-md`}>{n.icon}</div>
                        <div>
                          <p className={`text-[9px] font-black uppercase tracking-widest ${n.type === 'clock' ? 'text-rose-600' : n.type === 'log' ? 'text-orange-500' : 'text-blue-600'}`}>{n.title}</p>
                          <p className="text-[11px] font-bold text-slate-800 leading-tight mt-1">{n.msg}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase mt-1 opacity-60">{n.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {isAdminOrManager && (
              <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                {['all', ServiceType.AUDIT, ServiceType.EXPERTISE].map(p => (
                  <button key={p} onClick={() => setPoleFilter(p)} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${poleFilter === p ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>{p === 'all' ? 'Global' : p}</button>
                ))}
              </div>
            )}
          </div>
        </header>

        <div className="space-y-12">
          {view === 'log' && <TimeEntryForm currentUser={currentUser} folders={folders} existingEntries={entries} onAddEntry={async (d) => {
            const f = folders.find(fl => String(fl.id) === String(d.folderId));
            const p = { id: generateId(), collaborator_id: currentUserId, collaborator_name: currentUser.name, folder_id: f?.id, folder_name: f?.name, folder_number: f?.number, duration: d.duration, date: d.date, description: d.description, is_overtime: d.isOvertime || false, service: f?.serviceType };
            await supabase.from('time_entries').insert([p]); fetchData(); showNotif('success', "Enregistré");
          }} onQuickFolderAdd={() => setEntityModal({type: 'folder'})} />}
          
          {view === 'history' && (
            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden animate-in fade-in">
               <div className="p-8 border-b flex justify-between items-center bg-slate-50 gap-6">
                 <div className="flex-grow max-w-md relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input type="text" placeholder="Rechercher..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-xs text-slate-900 outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                 <button onClick={() => handleExport()} className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-600 transition-all"><Download size={18}/> EXPORTER XLS</button>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-900 border-b">
                      <tr><th className="p-6">Date</th><th className="p-6">Collaborateur</th><th className="p-6">Dossier</th><th className="p-6">Description</th><th className="p-6 text-center">Heures</th><th className="p-6 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">{filteredHistory.map(e => (
                      <tr key={e.id} className="text-xs hover:bg-blue-50/20 text-slate-900 transition-all">
                        <td className="p-6 font-bold">{formatDateFR(e.date)}</td>
                        <td className="p-6 font-bold text-blue-600">{e.collaboratorName}</td>
                        <td className="p-6 font-black">{e.folderName}</td>
                        <td className="p-6 font-medium max-w-[300px] truncate italic text-slate-500">{e.description}</td>
                        <td className="p-6 text-center font-black text-lg text-blue-600">{e.duration}h</td>
                        <td className="p-6 text-right">
                          <button onClick={() => setEditEntryModal(e)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg transition-colors"><Edit3 size={16}/></button>
                        </td>
                      </tr>
                    ))}</tbody>
                 </table>
               </div>
            </div>
          )}

          {view === 'dashboard' && <Dashboard entries={entries} folders={folders} attendance={attendance} collaborators={collaborators} poleFilter={poleFilter} />}
          
          {view === 'collabs' && (
            <div className="bg-white rounded-[3rem] shadow-xl overflow-hidden border border-slate-200 animate-in fade-in">
              <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Liste de l'équipe</h3>
                <button onClick={() => setEntityModal({type: 'collab'})} className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 hover:bg-slate-900 transition-all"><PlusCircle size={16}/> Ajouter Collaborateur</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-[10px] font-black uppercase border-b text-slate-400">
                    <tr><th className="p-8">Nom</th><th className="p-8">Pôle</th><th className="p-8">Rôle</th><th className="p-8">Pointage</th><th className="p-8 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {collaborators.filter(c => poleFilter === 'all' || c.department?.toLowerCase() === poleFilter.toLowerCase()).map(c => {
                       const att = attendance.find(a => a.date === new Date().toISOString().split('T')[0] && String(a.collaboratorId) === String(c.id));
                       return (
                        <tr key={c.id} className="text-xs hover:bg-blue-50/20 transition-all">
                          <td className="p-8 font-bold text-slate-900 text-sm">{c.name}</td>
                          <td className="p-8"><span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${c.department === ServiceType.AUDIT ? 'bg-blue-600 text-white' : 'bg-orange-500 text-white'}`}>{c.department}</span></td>
                          <td className="p-8"><span className="px-4 py-1.5 bg-slate-100 rounded-full font-black text-[9px] uppercase text-slate-500">{c.role}</span></td>
                          <td className="p-8">
                             {att ? <span className="text-emerald-600 font-black">Présent ({att.checkIn})</span> : <span className="text-rose-400 font-black">Absent</span>}
                          </td>
                          <td className="p-8 text-right space-x-2">
                            <button onClick={() => setEntityModal({type: 'collab', data: c})} className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all shadow-sm"><Edit3 size={16}/></button>
                            <button onClick={() => setDeleteConfirm({id: c.id, table: 'collaborators', label: `le collaborateur ${c.name}`})} className="p-3 bg-slate-50 text-slate-300 hover:text-rose-600 rounded-xl transition-all shadow-sm"><Trash2 size={16}/></button>
                          </td>
                        </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'folders' && (
            <div className="bg-white rounded-[3rem] shadow-xl overflow-hidden border border-slate-200 animate-in fade-in">
              <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Dossiers Clients</h3>
                <button onClick={() => setEntityModal({type: 'folder'})} className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 hover:bg-slate-900 transition-all"><PlusCircle size={16}/> Nouveau Dossier</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-[10px] font-black uppercase border-b text-slate-400">
                    <tr><th className="p-8">Numéro</th><th className="p-8">Dossier</th><th className="p-8">Pôle</th><th className="p-8 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {folders.filter(f => poleFilter === 'all' || f.serviceType?.toLowerCase() === poleFilter.toLowerCase()).map(f => (
                      <tr key={f.id} className="text-xs hover:bg-blue-50/20 transition-all">
                        <td className="p-8 font-black text-blue-600">{f.number}</td>
                        <td className="p-8 font-bold text-slate-900 text-sm">{f.name}</td>
                        <td className="p-8"><span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${f.serviceType === ServiceType.AUDIT ? 'bg-blue-600 text-white' : 'bg-orange-500 text-white'}`}>{f.serviceType}</span></td>
                        <td className="p-8 text-right space-x-2">
                          <button onClick={() => setEntityModal({type: 'folder', data: f})} className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all shadow-sm"><Edit3 size={16}/></button>
                          <button onClick={() => setDeleteConfirm({id: f.id, table: 'folders', label: `le dossier ${f.name}`})} className="p-3 bg-slate-50 text-slate-300 hover:text-rose-600 rounded-xl transition-all shadow-sm"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'clocking' && <ClockingModule currentUser={currentUser} collaborators={collaborators} attendance={attendance} onCheckIn={async (t) => { 
            const p = { id: generateId(), collaborator_id: currentUserId, date: new Date().toISOString().split('T')[0], check_in: t };
            await supabase.from('attendance').insert([p]); fetchData(); showNotif('success', "Arrivée enregistrée");
          }} onCheckOut={async (id, t) => { 
            await supabase.from('attendance').update({ check_out: t }).eq('id', id); fetchData(); showNotif('success', "Départ enregistré");
          }} onUpdateAttendance={async (id, upd) => { 
            const p = { date: upd.date, check_in: upd.checkIn, check_out: upd.checkOut };
            await supabase.from('attendance').update(p).eq('id', id); fetchData(); showNotif('success', "Mis à jour"); 
          }} onExport={handleExport} poleFilter={poleFilter} />}
          
          {view === 'planning' && <PlanningModule currentUser={currentUser} tasks={tasks} team={collaborators} showNotif={showNotif} onAddTask={async (t) => {
            const p = { id: generateId(), title: t.title, assigned_to_id: t.assignedToId, assigned_by_id: currentUserId, pole: t.pole || currentUser.department, deadline: t.deadline, status: 'todo', urgency: t.urgency || 'normal' };
            await supabase.from('tasks').insert([p]); fetchData();
          }} onUpdateTask={async (id, upd) => { await supabase.from('tasks').update(upd).eq('id', id); fetchData(); }} onDeleteTask={async (id) => { await supabase.from('tasks').delete().eq('id', id); fetchData(); }} poleFilter={poleFilter} />}
        </div>
      </main>
      
      {entityModal && <EntityModal type={entityModal.type} initialData={entityModal.data} onSave={async (d) => {
        if (entityModal.type === 'collab') {
          const p = { name: d.name, department: d.department, hiring_date: d.hiringDate, role: d.role, password: d.password, start_time: d.startTime, end_time: d.endTime };
          if (d.id) await supabase.from('collaborators').update(p).eq('id', d.id);
          else await supabase.from('collaborators').insert([{ ...p, id: generateId() }]);
        } else {
          const p = { name: d.name, number: d.number, client_name: d.clientName, service_type: d.serviceType, budget_hours: d.budgetHours };
          if (d.id) await supabase.from('folders').update(p).eq('id', d.id);
          else await supabase.from('folders').insert([{ ...p, id: generateId() }]);
        }
        setEntityModal(null); fetchData(); showNotif('success', "Enregistré");
      }} onClose={() => setEntityModal(null)} />}
      
      {editEntryModal && <EntryEditModal entry={editEntryModal} folders={folders} currentUser={currentUser} onSave={async (u) => { await supabase.from('time_entries').update({ folder_id: u.folderId, folder_name: u.folderName, folder_number: u.folderNumber, duration: u.duration, date: u.date, description: u.description, service: u.service }).eq('id', u.id); setEditEntryModal(null); fetchData(); showNotif('success', "Mis à jour"); }} onClose={() => setEditEntryModal(null)} />}
      
      {deleteConfirm && <ConfirmModal title="Supprimer ?" message={`Confirmer la suppression pour ${deleteConfirm.label}`} onConfirm={async () => { await supabase.from(deleteConfirm.table).delete().eq('id', deleteConfirm.id); setDeleteConfirm(null); fetchData(); showNotif('success', "Supprimé"); }} onCancel={() => setDeleteConfirm(null)} />}
    </div>
  );
};

export default App;
