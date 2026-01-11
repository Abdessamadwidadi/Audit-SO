
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
  PlusCircle, Loader2, Search, Trash2, Download, Table, Edit3, ShieldCheck, User as UserIcon,
  Bell, AlertTriangle, Info, CheckCircle2, X, Briefcase, ChevronRight
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { exportToExcel } from './services/csvService';

const STORE = { 
  USER_ID: 'mgtso_v1_userid', 
  READ_ALERTS: 'mgtso_v1_read_alerts'
};
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
  const [editEntryModal, setEditEntryModal] = useState<TimeEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, table: string, label: string} | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [poleFilter, setPoleFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'all' | 'day' | 'week' | 'month'>('all');
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  const supabase = useMemo(() => createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY), []);

  const showNotif = useCallback((type: 'success' | 'error', msg: string) => {
    setNotif({ type, msg });
    setTimeout(() => setNotif(null), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const { data: cData } = await supabase.from('collaborators').select('*').order('name');
      const { data: fData } = await supabase.from('folders').select('*').order('number');
      const { data: eData } = await supabase.from('time_entries').select('*').order('date', { ascending: false });
      const { data: tData } = await supabase.from('tasks').select('*').order('deadline', { ascending: true });
      const { data: aData } = await supabase.from('attendance').select('*').order('date', { ascending: false });
      
      setCollaborators(cData?.map(c => ({ 
        id: String(c.id), name: c.name, department: c.department as ServiceType, hiringDate: c.hiring_date, role: c.role as UserRole, password: String(c.password), startTime: c.start_time || "09:00", endTime: c.end_time || "18:00"
      })) || []);
      setFolders(fData?.map(f => ({ id: String(f.id), name: f.name, number: f.number, clientName: f.client_name, serviceType: f.service_type as ServiceType, budgetHours: f.budget_hours })) || []);
      setEntries(eData?.map(e => ({ id: String(e.id), collaboratorId: String(e.collaborator_id), collaboratorName: e.collaborator_name, folderId: e.folder_id ? String(e.folder_id) : '', folderName: e.folder_name, folderNumber: e.folder_number, duration: e.duration, date: e.date, description: e.description, isOvertime: e.is_overtime, service: e.service as ServiceType })) || []);
      setTasks(tData?.map(t => ({ id: String(t.id), title: t.title, assignedToId: String(t.assigned_to_id), assignedById: String(t.assigned_by_id), pole: t.pole || 'Audit', deadline: t.deadline, status: t.status as 'todo' | 'done', urgency: (t.urgency || 'normal') as any })) || []);
      setAttendance(aData?.map(a => ({ id: String(a.id), collaboratorId: String(a.collaborator_id), date: a.date, checkIn: a.check_in || "", checkOut: a.check_out })) || []);
      setIsDataLoaded(true);
    } catch (err) {
      showNotif('error', "Erreur chargement données");
      setIsDataLoaded(true);
    }
  }, [supabase, showNotif]);

  const handleLoginAttempt = useCallback(() => {
    if (!loginStep) return;
    if (String(loginStep.collab.password) === pinInput) {
      const userId = String(loginStep.collab.id);
      setCurrentUserId(userId);
      localStorage.setItem(STORE.USER_ID, userId);
      setLoginStep(null);
      setPinInput('');
      setPinError(false);
      showNotif('success', `Bienvenue ${loginStep.collab.name}`);
    } else {
      setPinError(true);
      setPinInput('');
      showNotif('error', "Code PIN incorrect");
    }
  }, [loginStep, pinInput, showNotif]);

  const handleLogout = useCallback(() => {
    setCurrentUserId(null);
    localStorage.removeItem(STORE.USER_ID);
    showNotif('success', "Déconnexion réussie");
  }, [showNotif]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentUser = useMemo(() => collaborators.find(c => String(c.id) === String(currentUserId)), [collaborators, currentUserId]);
  const isAdminOrManager = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;

  const handleDeletionConfirmed = async () => {
    if (!deleteConfirm) return;
    try {
      const { error } = await supabase.from(deleteConfirm.table).delete().eq('id', deleteConfirm.id);
      if (error) throw error;
      showNotif('success', "Supprimé avec succès");
      setDeleteConfirm(null);
      fetchData();
    } catch (err) {
      showNotif('error', "Erreur lors de la suppression");
    }
  };

  const handleUpdateEntry = async (updated: TimeEntry) => {
    try {
      const { error } = await supabase.from('time_entries').update({
        folder_id: updated.folderId,
        folder_name: updated.folderName,
        folder_number: updated.folderNumber,
        duration: updated.duration,
        date: updated.date,
        description: updated.description,
        service: updated.service
      }).eq('id', updated.id);
      
      if (error) throw error;
      showNotif('success', "Saisie mise à jour");
      setEditEntryModal(null);
      fetchData();
    } catch (err) {
      showNotif('error', "Erreur mise à jour");
    }
  };

  const filteredHistory = useMemo(() => entries.filter(e => {
    if (!isAdminOrManager && String(e.collaboratorId) !== String(currentUserId)) return false;
    if (showOnlyMine && String(e.collaboratorId) !== String(currentUserId)) return false;
    const matchSearch = (e.collaboratorName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || (e.folderName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || (e.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchPole = (showOnlyMine) ? true : (poleFilter === 'all' || e.service?.toLowerCase() === poleFilter.toLowerCase());
    if (!matchSearch || !matchPole) return false;
    if (timeRange !== 'all') {
      const entryDate = new Date(e.date);
      const today = new Date();
      today.setHours(0,0,0,0);
      if (timeRange === 'day') return e.date === new Date().toISOString().split('T')[0];
      if (timeRange === 'week') {
        const weekAgo = new Date(); weekAgo.setDate(today.getDate() - 7);
        return entryDate >= weekAgo;
      }
      if (timeRange === 'month') return entryDate.getMonth() === today.getMonth() && entryDate.getFullYear() === today.getFullYear();
    }
    return true;
  }), [entries, searchQuery, poleFilter, timeRange, isAdminOrManager, currentUserId, showOnlyMine]);

  const handleExport = useCallback((customData?: any[][]) => {
    const fileName = customData ? "Export_MSO" : `Historique_MSO_${new Date().toISOString().split('T')[0]}`;
    const data = customData || [
      ["DATE", "COLLABORATEUR", "DOSSIER", "NUMÉRO", "DESCRIPTION", "HEURES"],
      ...filteredHistory.map(e => [formatDateFR(e.date), e.collaboratorName, e.folderName, e.folderNumber, e.description, e.duration])
    ];
    exportToExcel(fileName, data);
  }, [filteredHistory]);

  if (!isDataLoaded) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-indigo-50"><Loader2 className="animate-spin" size={48} /></div>;

  if (!currentUserId || !currentUser) {
    if (loginStep) {
      return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white overflow-hidden relative">
          <div className="bg-white rounded-[4rem] w-full max-w-sm p-16 text-center shadow-2xl animate-in zoom-in duration-300 relative z-10">
            <ShieldCheck size={48} className="text-indigo-600 mx-auto mb-10" />
            <h3 className="text-4xl font-black text-slate-900 mb-2 leading-none">Vérification</h3>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-12">{loginStep.collab.name}</p>
            <input type="password" maxLength={6} autoFocus className={`w-full p-6 bg-slate-50 border-2 ${pinError ? 'border-rose-500 animate-shake' : 'border-slate-100'} rounded-[2rem] font-black text-center text-4xl tracking-[0.4em] text-indigo-600 outline-none mb-12`} value={pinInput} onChange={e => setPinInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLoginAttempt()} />
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => { setLoginStep(null); setPinInput(''); }} className="p-5 bg-slate-100 text-slate-900 rounded-3xl font-black text-[10px] uppercase">Retour</button>
              <button onClick={handleLoginAttempt} className="p-5 bg-indigo-600 text-white rounded-3xl font-black text-[10px] uppercase">Valider</button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-10 text-white relative">
        <div className="text-center mb-16 flex flex-col items-center animate-in fade-in duration-1000">
          <Logo variant="both" size={80} showText={false} className="mb-8" />
          <h1 className="text-7xl font-black tracking-tighter mb-4">Management SO</h1>
          <p className="text-indigo-400 font-black text-[11px] uppercase tracking-[0.6em] opacity-60">Audit & Conseil • Plateforme Interne</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full max-w-7xl animate-in slide-in-from-bottom-10 duration-700">
          {collaborators.map(c => (
            <button key={c.id} onClick={() => setLoginStep({collab: c})} className="group relative bg-white/5 backdrop-blur-sm p-8 rounded-[3rem] border border-white/10 hover:border-indigo-500 hover:bg-white/10 transition-all text-left overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="text-indigo-500" size={24} />
              </div>
              <h3 className="text-2xl font-black text-white group-hover:text-indigo-400 transition-colors">{c.name}</h3>
              <div className="flex items-center gap-3 mt-4">
                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${c.department === ServiceType.AUDIT ? 'bg-indigo-600 text-white' : 'bg-amber-600 text-white'}`}>{c.department}</span>
                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{c.role}</span>
              </div>
            </button>
          ))}
        </div>
        <p className="mt-20 text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">© 2025 MANAGEMENT SO AUDIT CONSEIL</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      {/* Bandeau de Notification System (Rétabli et mis en évidence) */}
      {notif && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-4 px-10 py-5 rounded-[2rem] text-white font-black text-[11px] uppercase tracking-widest shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in slide-in-from-top-4 transition-all duration-300 bg-slate-900 border border-white/10">
          {notif.type === 'success' ? <CheckCircle2 className="text-emerald-400" size={20}/> : <AlertTriangle className="text-rose-400" size={20}/>}
          {notif.msg}
          <button onClick={() => setNotif(null)} className="ml-4 p-1 hover:bg-white/10 rounded-full"><X size={14}/></button>
        </div>
      )}

      <aside className="w-80 bg-[#0f172a] text-white p-10 flex flex-col shrink-0 relative shadow-2xl">
        <div className="mb-12 flex justify-center">
          <Logo variant="both" size={42} showText={false} />
        </div>
        <nav className="space-y-3 flex-grow">
          {[{v: 'log', i: <PlusCircle size={18}/>, l: 'Saisie Temps'}, {v: 'planning', i: <List size={18}/>, l: 'To-Do List'}, {v: 'clocking', i: <Clock size={18}/>, l: 'Pointage'}, {v: 'history', i: <Table size={18}/>, l: 'Historique'}].map(m => (
            <button key={m.v} onClick={() => setView(m.v as any)} className={`w-full flex items-center gap-4 px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${view === m.v ? 'bg-indigo-600' : 'hover:bg-slate-800 text-slate-400'}`}>{m.i} {m.l}</button>
          ))}
          {isAdminOrManager && <div className="pt-10 border-t border-slate-800 mt-6 space-y-3">
            <p className="px-8 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Administration</p>
            {[{v: 'dashboard', i: <LayoutDashboard size={18}/>, l: 'Dashboard'}, {v: 'folders', i: <FolderOpen size={18}/>, l: 'Dossiers'}, {v: 'collabs', i: <Users size={18}/>, l: 'Équipe'}].map(m => (
              <button key={m.v} onClick={() => setView(m.v as any)} className={`w-full flex items-center gap-4 px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${view === m.v ? 'bg-indigo-600' : 'hover:bg-slate-800 text-slate-400'}`}>{m.i} {m.l}</button>
            ))}
          </div>}
        </nav>
        <button onClick={handleLogout} className="mt-auto w-full flex items-center gap-2 text-slate-500 hover:text-rose-400 font-black uppercase text-[9px] tracking-widest p-4 transition-colors"><LogOut size={16}/> Déconnexion</button>
      </aside>

      <main className="flex-grow p-16 overflow-y-auto relative bg-[#fdfdfe]">
        <header className="mb-12 border-b border-slate-100 pb-10 flex justify-between items-end">
          <div className="flex items-center gap-6">
            <Logo variant="both" size={64} showText={false} />
            <div>
              <h2 className="text-5xl font-black tracking-tighter uppercase text-slate-900 leading-none">{view === 'log' ? 'Saisie' : view === 'planning' ? 'Planning' : view === 'clocking' ? 'Pointage' : view === 'history' ? 'Historique' : view === 'folders' ? 'Dossiers' : view === 'collabs' ? 'Équipe' : 'Dashboard'}</h2>
              <p className="text-indigo-600 font-black text-[11px] uppercase tracking-[0.3em] mt-3">{currentUser.name} • {currentUser.role}</p>
            </div>
          </div>
          {isAdminOrManager && (
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
              <button onClick={() => setPoleFilter('all')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${poleFilter === 'all' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>Tout</button>
              <button onClick={() => setPoleFilter(ServiceType.AUDIT)} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${poleFilter === ServiceType.AUDIT ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>Audit</button>
              <button onClick={() => setPoleFilter(ServiceType.EXPERTISE)} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${poleFilter === ServiceType.EXPERTISE ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>Expertise</button>
            </div>
          )}
        </header>

        <div className="space-y-12">
          {view === 'log' && <TimeEntryForm currentUser={currentUser} folders={folders} existingEntries={entries} onAddEntry={async (d) => {
            const folder = folders.find(f => String(f.id) === String(d.folderId));
            const payload = { id: generateId(), collaborator_id: currentUserId, collaborator_name: currentUser.name, folder_id: folder?.id, folder_name: folder?.name, folder_number: folder?.number, duration: d.duration, date: d.date, description: d.description, is_overtime: d.isOvertime || false, service: folder?.serviceType };
            const { error } = await supabase.from('time_entries').insert([payload]);
            if (error) showNotif('error', "Erreur lors de l'enregistrement"); else { showNotif('success', "Temps enregistré avec succès"); fetchData(); }
          }} />}
          
          {view === 'planning' && <PlanningModule currentUser={currentUser} tasks={tasks} team={collaborators} showNotif={showNotif} onAddTask={async (t) => {
            const payload = { id: generateId(), title: t.title, assigned_to_id: t.assignedToId, assigned_by_id: currentUserId, pole: t.pole || currentUser.department, deadline: t.deadline, status: 'todo', urgency: t.urgency || 'normal' };
            const { error } = await supabase.from('tasks').insert([payload]);
            if (error) throw error; else { fetchData(); }
          }} onUpdateTask={async (id, updates) => { 
            const dbUpdates: any = { ...updates };
            if (updates.assignedToId) { dbUpdates.assigned_to_id = updates.assignedToId; delete dbUpdates.assignedToId; }
            await supabase.from('tasks').update(dbUpdates).eq('id', id); fetchData(); 
          }} onDeleteTask={async (id) => setDeleteConfirm({id, table: 'tasks', label: 'cette tâche'})} poleFilter={poleFilter} />}

          {view === 'history' && (
            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden animate-in fade-in duration-500">
               <div className="p-8 border-b flex flex-wrap justify-between items-center bg-slate-50 gap-6">
                 <div className="flex-grow max-w-md relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input type="text" placeholder="Rechercher..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-900 text-xs outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                 
                 <div className="flex items-center gap-4">
                    {isAdminOrManager && (
                      <button 
                        onClick={() => setShowOnlyMine(!showOnlyMine)} 
                        className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border shadow-sm ${showOnlyMine ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-100' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                      >
                        {showOnlyMine ? 'Voir tout le pôle' : 'Mes saisies perso'}
                      </button>
                    )}
                    <button onClick={() => handleExport()} className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-2"><Download size={18}/> EXPORTER XLS</button>
                 </div>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-900 border-b"><tr><th className="p-6">Date</th><th className="p-6">Collaborateur</th><th className="p-6">Dossier</th><th className="p-6">Description</th><th className="p-6">Heures</th><th className="p-6 text-right">Actions</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">{filteredHistory.map(e => (
                      <tr key={e.id} className="text-xs hover:bg-indigo-50/30 text-slate-900 group transition-all">
                        <td className="p-6 font-bold">{formatDateFR(e.date)}</td>
                        <td className="p-6 font-bold text-indigo-600">{e.collaboratorName}</td>
                        <td className="p-6 font-black">{e.folderName}</td>
                        <td className="p-6 italic">{e.description}</td>
                        <td className="p-6 font-black text-indigo-600">{e.duration}h</td>
                        <td className="p-6 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            {(isAdminOrManager || String(e.collaboratorId) === String(currentUserId)) && (
                              <button onClick={() => setEditEntryModal(e)} className="p-2 text-slate-400 hover:text-indigo-600 transition-all bg-slate-50 rounded-lg"><Edit3 size={16}/></button>
                            )}
                            {(isAdminOrManager || String(e.collaboratorId) === String(currentUserId)) && (
                              <button onClick={() => setDeleteConfirm({id: e.id, table: 'time_entries', label: 'cette saisie'})} className="p-2 text-slate-400 hover:text-rose-500 transition-all bg-slate-50 rounded-lg"><Trash2 size={16}/></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}</tbody>
                 </table>
               </div>
            </div>
          )}

          {view === 'dashboard' && <Dashboard entries={entries} folders={folders} attendance={attendance} collaborators={collaborators} poleFilter={poleFilter} />}
          {view === 'clocking' && <ClockingModule currentUser={currentUser} collaborators={collaborators} attendance={attendance} onCheckIn={async (t) => { 
            const payload = { id: generateId(), collaborator_id: currentUserId, date: new Date().toISOString().split('T')[0], check_in: t };
            const { error } = await supabase.from('attendance').insert([payload]);
            if (error) showNotif('error', "Erreur Pointage"); else { showNotif('success', "Arrivée validée"); fetchData(); }
          }} onCheckOut={async (id, t) => { 
            const { error } = await supabase.from('attendance').update({ check_out: t }).eq('id', id); if (error) showNotif('error', 'Erreur lors du départ'); else { showNotif('success', 'Départ validé'); fetchData(); }
          }} onExport={(customData) => handleExport(customData)} poleFilter={poleFilter} />}
          
          {view === 'folders' && (
            <div className="bg-white rounded-[3rem] shadow-xl overflow-hidden border border-slate-200 animate-in fade-in">
              <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Base de données Dossiers</h3>
                <button onClick={() => setEntityModal({type: 'folder'})} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center gap-2 hover:bg-slate-900 transition-all"><PlusCircle size={16}/> Ajouter Dossier</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-[10px] font-black uppercase border-b tracking-widest text-slate-400">
                    <tr><th className="p-8">Numéro</th><th className="p-8">Nom du Dossier</th><th className="p-8">Client</th><th className="p-8">Pôle</th><th className="p-8 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {folders.filter(f => poleFilter === 'all' || f.serviceType?.toLowerCase() === poleFilter.toLowerCase()).map(f => (
                      <tr key={f.id} className="text-xs hover:bg-indigo-50/20 group transition-all">
                        <td className="p-8 font-black text-indigo-600">{f.number}</td>
                        <td className="p-8 font-bold text-slate-900 text-sm">{f.name}</td>
                        <td className="p-8 text-slate-500">{f.clientName || '-'}</td>
                        <td className="p-8">
                          <span className={`px-4 py-1.5 rounded-full font-black uppercase text-[8px] tracking-widest ${f.serviceType === ServiceType.AUDIT ? 'bg-indigo-600 text-white' : 'bg-amber-600 text-white'}`}>{f.serviceType}</span>
                        </td>
                        <td className="p-8 text-right">
                          <div className="flex justify-end gap-3">
                            <button onClick={() => setEntityModal({type: 'folder', data: f})} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"><Edit3 size={16}/></button>
                            <button onClick={() => setDeleteConfirm({id: f.id, table: 'folders', label: 'ce dossier'})} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all"><Trash2 size={16}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'collabs' && (
            <div className="bg-white rounded-[3rem] shadow-xl overflow-hidden border border-slate-200 animate-in fade-in">
              <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Gestion d'équipe</h3>
                <button onClick={() => setEntityModal({type: 'collab'})} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center gap-2 hover:bg-slate-900 transition-all"><PlusCircle size={16}/> Nouveau Membre</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-[10px] font-black uppercase border-b tracking-widest text-slate-400">
                    <tr><th className="p-8">Nom</th><th className="p-8">Rôle</th><th className="p-8">Pôle</th><th className="p-8 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {collaborators.filter(c => poleFilter === 'all' || c.department?.toLowerCase() === poleFilter.toLowerCase()).map(c => (
                      <tr key={c.id} className="text-xs hover:bg-indigo-50/20 group transition-all">
                        <td className="p-8 font-bold text-slate-900 text-sm">{c.name}</td>
                        <td className="p-8"><span className="px-4 py-1.5 bg-slate-100 rounded-full font-black text-[9px] uppercase tracking-widest text-slate-500">{c.role}</span></td>
                        <td className="p-8">
                          <span className={`px-4 py-1.5 rounded-full font-black uppercase text-[8px] tracking-widest ${c.department === ServiceType.AUDIT ? 'bg-indigo-600 text-white' : 'bg-amber-600 text-white'}`}>{c.department}</span>
                        </td>
                        <td className="p-8 text-right">
                          <div className="flex justify-end gap-3">
                            <button onClick={() => setEntityModal({type: 'collab', data: c})} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"><Edit3 size={16}/></button>
                            <button onClick={() => setDeleteConfirm({id: c.id, table: 'collaborators', label: 'ce collaborateur'})} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all"><Trash2 size={16}/></button>
                          </div>
                        </td>
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
        const payload: any = entityModal.type === 'collab' ? { name: data.name, department: data.department, role: data.role, password: data.password, hiring_date: data.hiringDate, start_time: data.startTime, end_time: data.endTime } : { name: data.name, number: data.number, client_name: data.clientName, service_type: data.serviceType, budget_hours: data.budgetHours };
        if (data.id) await supabase.from(entityModal.type === 'collab' ? 'collaborators' : 'folders').update(payload).eq('id', data.id); else { payload.id = generateId(); await supabase.from(entityModal.type === 'collab' ? 'collaborators' : 'folders').insert([payload]); }
        showNotif('success', "Enregistré avec succès"); setEntityModal(null); fetchData();
      }} onClose={() => setEntityModal(null)} />}

      {editEntryModal && (
        <EntryEditModal 
          entry={editEntryModal} 
          folders={folders} 
          currentUser={currentUser}
          onSave={handleUpdateEntry} 
          onClose={() => setEditEntryModal(null)} 
        />
      )}

      {deleteConfirm && (
        <ConfirmModal 
          title="Confirmation" 
          message={`Êtes-vous sûr de vouloir supprimer ${deleteConfirm.label} ? Cette action est irréversible.`} 
          onConfirm={handleDeletionConfirmed} 
          onCancel={() => setDeleteConfirm(null)} 
        />
      )}
    </div>
  );
};

export default App;
