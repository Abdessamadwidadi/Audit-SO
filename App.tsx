
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { TimeEntry, ServiceType, Collaborator, Folder, UserRole, TaskAssignment, Attendance, EXERCICES } from './types';
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
  Shield, Crown, Plus, FileSpreadsheet, Key, Briefcase, Star,
  TrendingUp, Activity, Award, Gem, ShieldCheck, BarChart3, Settings,
  X, CheckCircle, AlertTriangle, FileText, Calendar
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { exportToExcel, exportGroupedByFolder } from './services/csvService';

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

const getLocalISODate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const App: React.FC = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => localStorage.getItem(STORE.USER_ID));
  const [loginStep, setLoginStep] = useState<{collab: Collaborator} | null>(null);
  const [pinInput, setPinInput] = useState('');
  const pinInputRef = useRef<HTMLInputElement>(null);

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
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [folderSearchQuery, setFolderSearchQuery] = useState('');
  const [collabSearchQuery, setCollabSearchQuery] = useState('');
  
  const [poleFilter, setPoleFilter] = useState<string>('all');
  const [exerciceFilter, setExerciceFilter] = useState<number>(2025);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return getLocalISODate(d);
  });
  const [endDate, setEndDate] = useState("2026-12-31");

  const supabase = useMemo(() => createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY), []);

  const showNotif = useCallback((type: 'success' | 'error', msg: string) => {
    setNotif({ type, msg });
    setTimeout(() => setNotif(null), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [{ data: cData }, { data: fData }, { data: eData }, { data: tData }, { data: aData }] = await Promise.all([
        supabase.from('collaborators').select('*').order('name'),
        supabase.from('folders').select('*').order('number'),
        supabase.from('time_entries').select('*').order('date', { ascending: false }),
        supabase.from('tasks').select('*').order('deadline', { ascending: true }),
        supabase.from('attendance').select('*').order('date', { ascending: false })
      ]);
      
      setCollaborators(cData?.map(c => ({ 
        id: String(c.id).trim(), 
        name: c.name, 
        department: c.department as ServiceType, 
        hiringDate: c.hiring_date, 
        role: c.role as UserRole, 
        password: String(c.password), 
        startTime: c.start_time || "09:00", 
        endTime: c.end_time || "18:00" 
      })) || []);

      setFolders(fData?.map(f => ({ 
        id: String(f.id).trim(), 
        name: f.name, 
        number: f.number, 
        clientName: f.client_name, 
        serviceType: f.service_type as ServiceType, 
        budgetHours: f.budget_hours,
        isArchived: f.is_archived || false
      })) || []);

      setEntries(eData?.map(e => ({ 
        id: String(e.id).trim(), 
        collaboratorId: String(e.collaborator_id).trim(), 
        folderId: e.folder_id ? String(e.folder_id).trim() : '', 
        duration: e.duration, 
        date: e.date, 
        description: e.description, 
        service: e.service as ServiceType, 
        exercice: e.exercice || 2025 
      })) || []);
      
      setTasks(tData?.map((t:any) => ({ 
        id: String(t.id).trim(), 
        title: t.title, 
        assignedToId: String(t.assigned_to_id || "").trim(), 
        assignedById: String(t.assigned_by_id || "").trim(), 
        pole: t.pole || 'Audit', 
        deadline: t.deadline, 
        status: t.status as 'todo' | 'done', 
        urgency: (t.urgency || 'normal') as any, 
        exercice: t.exercice || 2025 
      })) || []);

      setAttendance(aData?.map(a => ({ 
        id: String(a.id).trim(), 
        collaboratorId: String(a.collaborator_id).trim(), 
        date: a.date, 
        checkIn: a.check_in || "", 
        checkOut: a.check_out || "" 
      })) || []);

      setIsDataLoaded(true);
    } catch (err) { 
      showNotif('error', "Erreur de synchronisation"); 
      setIsDataLoaded(true); 
    }
  }, [supabase, showNotif]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentUser = useMemo(() => collaborators.find(c => String(c.id).trim() === String(currentUserId).trim()), [collaborators, currentUserId]);
  const isAdminOrManager = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;

  /**
   * RÉSOLUTION DYNAMIQUE DES DONNÉES
   * On cherche les infos réelles dans l'état actuel pour garantir que si un dossier est renommé,
   * l'affichage change partout.
   */
  const resolveFolder = useCallback((folderId: string) => {
    return folders.find(f => String(f.id).trim() === folderId);
  }, [folders]);

  const resolveCollab = useCallback((collabId: string) => {
    return collaborators.find(c => String(c.id).trim() === String(collabId).trim());
  }, [collaborators]);

  const handleUpdatePin = async () => {
    if ((newPin.length < 4 || newPin.length > 6) || newPin !== confirmPin) return;
    try {
      await supabase.from('collaborators').update({ password: newPin }).eq('id', currentUser?.id);
      showNotif('success', "Code PIN mis à jour");
      setShowProfileModal(false); setNewPin(''); setConfirmPin(''); fetchData();
    } catch (err) {
      showNotif('error', "Erreur technique");
    }
  };

  const handleSaveEntity = useCallback(async (data: any) => {
    try {
      const table = entityModal?.type === 'collab' ? 'collaborators' : 'folders';
      const payload = entityModal?.type === 'collab' 
        ? { name: data.name, department: data.department, hiring_date: data.hiringDate, role: data.role, password: data.password, start_time: data.startTime, end_time: data.endTime }
        : { name: data.name, number: data.number, client_name: data.clientName || data.name, service_type: data.serviceType, budget_hours: parseFloat(data.budgetHours) || 0 };

      if (data.id) await supabase.from(table).update(payload).eq('id', data.id);
      else await supabase.from(table).insert([{ id: generateId(), ...payload }]);

      setEntityModal(null); await fetchData(); showNotif('success', 'Enregistré');
    } catch (err) {
      showNotif('error', 'Erreur de sauvegarde');
    }
  }, [entityModal, supabase, fetchData, showNotif]);

  const filteredHistory = useMemo(() => {
    let list = entries;
    if (exerciceFilter !== 0) list = list.filter(e => e.exercice === exerciceFilter);
    if (!isAdminOrManager) list = list.filter(e => String(e.collaboratorId).trim() === String(currentUserId).trim());
    if (poleFilter !== 'all') list = list.filter(e => e.service?.toLowerCase().trim() === poleFilter.toLowerCase().trim());
    list = list.filter(e => e.date >= startDate && e.date <= endDate);
    if (searchQuery.trim()) {
      const s = searchQuery.toLowerCase();
      list = list.filter(e => {
        const collab = resolveCollab(e.collaboratorId);
        const folder = resolveFolder(e.folderId);
        const cName = collab ? collab.name : "Inconnu";
        const fName = folder ? folder.name : "Inconnu";
        const fNum = folder ? folder.number : "N/A";
        return cName.toLowerCase().includes(s) || fName.toLowerCase().includes(s) || fNum.toLowerCase().includes(s) || e.description.toLowerCase().includes(s);
      });
    }
    return list;
  }, [entries, searchQuery, poleFilter, currentUserId, isAdminOrManager, startDate, endDate, exerciceFilter, resolveCollab, resolveFolder]);

  const handleExportSimple = () => {
    const data = [
      ["DATE", "COLLABORATEUR", "N° DOSSIER", "NOM DOSSIER", "PÔLE", "EXERCICE", "TRAVAUX", "HEURES"],
      ...filteredHistory.map(e => {
        const collab = resolveCollab(e.collaboratorId);
        const folder = resolveFolder(e.folderId);
        return [
          formatDateFR(e.date), 
          collab ? collab.name : "Inconnu", 
          folder ? folder.number : "N/A",
          folder ? folder.name : "Inconnu", 
          e.service, 
          e.exercice, 
          e.description, 
          e.duration
        ];
      })
    ];
    exportToExcel(`Export_Simple_${new Date().toISOString().split('T')[0]}`, data);
  };

  const handleExportGrouped = () => {
    exportGroupedByFolder(`Export_Groupé_${new Date().toISOString().split('T')[0]}`, filteredHistory, folders, collaborators);
  };

  if (!isDataLoaded) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  if (!currentUserId || !currentUser) {
    if (loginStep) {
      return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white overflow-hidden">
          <div className="bg-white rounded-[4rem] w-full max-w-[440px] p-12 text-center shadow-2xl animate-in zoom-in text-black">
            <div className="w-16 h-16 bg-white border-2 border-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-10 shadow-sm"><Shield size={34} className="text-indigo-600" /></div>
            <h3 className="text-[44px] font-black text-[#1e1b4b] mb-1 tracking-tight leading-tight">Code PIN</h3>
            <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] mb-16">{loginStep.collab.name}</p>
            <div className="bg-[#eff6ff] rounded-[3.5rem] p-12 mb-16 flex items-center justify-center gap-6 relative" onClick={() => pinInputRef.current?.focus()}>
              <input ref={pinInputRef} type="password" inputMode="numeric" maxLength={6} className="absolute inset-0 opacity-0" value={pinInput} onChange={e => { const v = e.target.value.replace(/\D/g,''); setPinInput(v); if(v.length >= 4) { if(v === loginStep.collab.password) { setCurrentUserId(loginStep.collab.id); localStorage.setItem(STORE.USER_ID, loginStep.collab.id); setLoginStep(null); setPinInput(''); showNotif('success', 'Bienvenue'); } else if (v.length === loginStep.collab.password?.length) { setPinInput(''); showNotif('error', 'Code faux'); } } }} autoFocus />
              <div className="flex gap-4">{[...Array(loginStep.collab.password?.length || 4)].map((_, i) => (<div key={i} className={`w-5 h-5 rounded-full transition-all ${pinInput.length > i ? 'bg-indigo-900' : 'border-2 border-indigo-200'}`} />))}</div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <button onClick={() => setLoginStep(null)} className="p-8 bg-slate-50 text-slate-900 rounded-[2.5rem] font-black uppercase text-xs">RETOUR</button>
              <button onClick={() => { if(pinInput === loginStep.collab.password) { setCurrentUserId(loginStep.collab.id); localStorage.setItem(STORE.USER_ID, loginStep.collab.id); setLoginStep(null); setPinInput(''); showNotif('success', 'Bienvenue'); } else { setPinInput(''); showNotif('error', 'Code faux'); } }} className="p-8 bg-indigo-600 text-white rounded-[2.5rem] font-black uppercase text-xs">ENTRER</button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-10 text-white">
        <div className="text-center mb-16 flex flex-col items-center"><Logo variant="both" size={60} showText={false} className="mb-6" /><h1 className="text-6xl font-black tracking-tighter mb-2">Management SO</h1><p className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.5em] opacity-60">Cabinet d'Audit & Conseil</p></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-7xl px-4">
          {collaborators.map(c => (
            <button key={c.id} onClick={() => setLoginStep({collab: c})} className={`group p-10 rounded-[4rem] transition-all text-left flex flex-col justify-between min-h-[240px] relative overflow-hidden border-2 ${c.role === UserRole.ADMIN ? 'bg-[#111827] border-amber-400' : 'bg-[#111827] border-white/5 hover:border-indigo-500'}`}>
              {c.role === UserRole.ADMIN && <Crown className="absolute top-6 right-8 text-amber-400" size={32} />}
              <div><h3 className="text-3xl font-black mb-1 leading-tight group-hover:text-indigo-400 transition-colors">{c.name}</h3><p className={`text-[9px] font-black uppercase tracking-[0.2em] ${c.role === UserRole.ADMIN ? 'text-amber-400' : 'text-slate-500'}`}>{c.role}</p></div>
              <div className="mt-auto"><span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${c.department?.toLowerCase() === 'audit' ? 'bg-[#0056b3]' : 'bg-orange-500'} text-white`}>{c.department?.toUpperCase() || ""}</span></div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      {notif && (<div className={`fixed top-8 right-8 z-[1000] flex items-center gap-4 px-8 py-4 rounded-2xl text-white font-black text-[10px] uppercase shadow-2xl animate-in slide-in-from-right-4 ${notif.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>{notif.msg}</div>)}
      {entityModal && <EntityModal type={entityModal.type} initialData={entityModal.data} currentUser={currentUser} onSave={handleSaveEntity} onClose={() => setEntityModal(null)} />}
      {editEntryModal && <EntryEditModal entry={editEntryModal} folders={folders} currentUser={currentUser} onSave={async (u) => { await supabase.from('time_entries').update({ duration: u.duration, description: u.description, date: u.date, folder_id: u.folderId, service: u.service, exercice: u.exercice }).eq('id', u.id); setEditEntryModal(null); fetchData(); showNotif('success', 'Mis à jour'); }} onClose={() => setEditEntryModal(null)} />}
      {deleteConfirm && <ConfirmModal title={deleteConfirm.label} message={deleteConfirm.table === 'folders' ? "Ce dossier sera archivé mais ses temps passés resteront consultables." : "Action irréversible."} onConfirm={async () => { 
        if (deleteConfirm.table === 'folders') {
          await supabase.from('folders').update({ is_archived: true }).eq('id', deleteConfirm.id);
          showNotif('success', 'Dossier archivé');
        } else {
          await supabase.from(deleteConfirm.table).delete().eq('id', deleteConfirm.id);
          showNotif('success', 'Supprimé');
        }
        setDeleteConfirm(null); 
        fetchData(); 
      }} onCancel={() => setDeleteConfirm(null)} />}

      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[500] p-4 text-black">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in">
             <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-black uppercase text-slate-900">Mon Profil</h3><button onClick={() => setShowProfileModal(false)} className="p-2 text-slate-400 hover:text-rose-500"><X size={24}/></button></div>
             <div className="space-y-6">
               <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nouveau PIN (4-6 chiffres)</label><input type="password" maxLength={6} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-center text-indigo-600 text-3xl tracking-[0.5em] outline-none" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g,''))} /></div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmer le PIN</label>
                  <input type="password" maxLength={6} className={`w-full p-4 bg-slate-50 border-2 ${confirmPin && confirmPin !== newPin ? 'border-rose-500' : 'border-slate-100'} rounded-2xl font-black text-center text-indigo-600 text-3xl tracking-[0.5em] outline-none`} value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g,''))} />
               </div>
               <button onClick={handleUpdatePin} disabled={(newPin.length < 4 || newPin.length > 6) || newPin !== confirmPin} className="w-full p-5 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase shadow-xl disabled:bg-slate-100 disabled:text-slate-300">Valider</button>
             </div>
          </div>
        </div>
      )}

      <aside className="w-80 bg-[#0f172a] text-white p-10 flex flex-col shrink-0 shadow-2xl">
        <div className="mb-12 flex justify-center"><Logo variant="both" size={42} showText={false} /></div>
        <nav className="space-y-3 flex-grow">
          {[{v: 'log', i: <PlusCircle size={18}/>, l: 'Saisie'}, {v: 'planning', i: <List size={18}/>, l: 'Planning'}, {v: 'history', i: <Table size={18}/>, l: 'Historique'}].map(m => (
            <button key={m.v} onClick={() => setView(m.v as any)} className={`w-full flex items-center gap-4 px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${view === m.v ? 'bg-indigo-600 shadow-xl' : 'hover:bg-slate-800 text-slate-400'}`}>{m.i} {m.l}</button>
          ))}
          {isAdminOrManager && <div className="pt-10 border-t border-slate-800 mt-6 space-y-3">
            <p className="px-8 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Admin</p>
            {[{v: 'dashboard', i: <LayoutDashboard size={18}/>, l: 'Dashboard'}, {v: 'folders', i: <FolderOpen size={18}/>, l: 'Dossiers'}, {v: 'collabs', i: <Users size={18}/>, l: 'Équipe'}].map(m => (
              <button key={m.v} onClick={() => setView(m.v as any)} className={`w-full flex items-center gap-4 px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${view === m.v ? 'bg-indigo-600 shadow-xl' : 'hover:bg-slate-800 text-slate-400'}`}>{m.i} {m.l}</button>
            ))}
          </div>}
        </nav>
        <button onClick={() => { setCurrentUserId(null); localStorage.removeItem(STORE.USER_ID); }} className="w-full flex items-center gap-3 text-slate-500 hover:text-rose-400 font-black uppercase text-[9px] tracking-widest p-4 transition-colors"><LogOut size={16}/> Déconnexion</button>
      </aside>

      <main className="flex-grow p-16 overflow-y-auto bg-[#fdfdfe] text-slate-900">
        <header className="mb-12 border-b border-slate-100 pb-10 flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="animate-in fade-in slide-in-from-left-4">
             <h2 className="text-6xl font-black tracking-tighter uppercase text-slate-900 leading-none">{view}</h2>
             <div className="flex items-center gap-3 mt-3">
               <p className={`${currentUser.role === UserRole.ADMIN ? 'text-amber-600' : 'text-blue-600'} font-black text-[11px] uppercase tracking-widest flex items-center gap-2`}>
                 {currentUser.role === UserRole.ADMIN && <Crown size={14}/>} {currentUser.name}
               </p>
               <button onClick={() => setShowProfileModal(true)} className="p-2 bg-slate-100 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg"><Settings size={14}/></button>
             </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {(view === 'history' || view === 'dashboard') && (
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                <Calendar size={14} className="text-slate-400"/>
                <select className="text-[10px] font-black uppercase bg-transparent outline-none text-slate-900" value={exerciceFilter} onChange={e => setExerciceFilter(parseInt(e.target.value))}>
                  {EXERCICES.map(ex => <option key={ex} value={ex}>EX {ex}</option>)}
                </select>
              </div>
            )}
            {(view !== 'log' && view !== 'folders' && view !== 'collabs') && (
              <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-[1.5rem] border border-slate-300 shadow-lg text-[11px] font-black uppercase text-slate-900">
                <span className="text-slate-400">Du</span><input type="date" className="bg-slate-100 px-3 py-2 rounded-xl text-slate-900 font-black outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} /><span className="text-slate-400">Au</span><input type="date" className="bg-slate-100 px-3 py-2 rounded-xl text-slate-900 font-black outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            )}
            {isAdminOrManager && <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">{['all', 'Audit', 'Expertise'].map(p => (<button key={p} onClick={() => setPoleFilter(p)} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${poleFilter === p ? (p === 'Audit' ? 'bg-[#0056b3] text-white' : p === 'Expertise' ? 'bg-orange-500 text-white' : 'bg-slate-900 text-white') : 'text-slate-400'}`}>{p}</button>))}</div>}
          </div>
        </header>

        <div className="space-y-12">
          {view === 'log' && <TimeEntryForm currentUser={currentUser} folders={folders} existingEntries={entries} onAddEntry={async d => { 
            // INSERTION PURE SUR ID
            await supabase.from('time_entries').insert([{ 
              id: generateId(), 
              collaborator_id: currentUserId, 
              folder_id: d.folderId, 
              duration: d.duration, 
              date: d.date, 
              description: d.description, 
              service: folders.find(fl => fl.id === d.folderId)?.serviceType, 
              exercice: d.exercice 
            }]); 
            fetchData(); 
            showNotif('success', 'Enregistré'); 
          }} onQuickFolderAdd={() => setView('folders')} />}
          
          {view === 'history' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm">
                 <div className="relative flex-1 max-md:hidden max-w-md"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input type="text" placeholder="Filtrer..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-900 text-xs outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                 <div className="flex gap-3">
                   <button onClick={handleExportSimple} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2"><Download size={14}/> Export Simple</button>
                   <button onClick={handleExportGrouped} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2"><FileText size={14}/> Export Groupé</button>
                 </div>
              </div>
              <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl overflow-hidden text-black">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b"><tr><th className="p-6">Date</th><th className="p-6">Collaborateur</th><th className="p-6">Dossier</th><th className="p-6 text-center">Heures</th><th className="p-6 text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHistory.map(e => {
                      const collab = resolveCollab(e.collaboratorId);
                      const folder = resolveFolder(e.folderId);
                      const isAudit = (e.service || '').toLowerCase() === 'audit';
                      return (
                        <tr key={e.id} className="text-xs hover:bg-indigo-50/20">
                          <td className="p-6 font-bold text-black">{formatDateFR(e.date)}</td>
                          <td className={`p-6 font-black uppercase ${isAudit ? 'text-[#0056b3]' : 'text-orange-600'}`}>
                            {collab ? collab.name : "Inconnu"}
                          </td>
                          <td className="p-6 font-black text-black">
                             {/* AFFICHAGE DU NUMÉRO + NOM */}
                             <span className="text-indigo-600 mr-2">[{folder ? folder.number : 'N/A'}]</span>
                             {folder ? folder.name : "Inconnu"} 
                             {folder?.isArchived && <span className="text-[8px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full ml-2">Archivé</span>}
                          </td>
                          <td className="p-6 text-center font-black text-black text-lg">{e.duration}h</td>
                          <td className="p-6 text-right">
                            <button onClick={() => setEditEntryModal(e)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit3 size={16}/></button>
                            <button onClick={() => setDeleteConfirm({id: e.id, table: 'time_entries', label: 'Supprimer'})} className="p-2 text-slate-400 hover:text-rose-600 ml-2"><Trash2 size={16}/></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'planning' && <PlanningModule currentUser={currentUser} tasks={tasks} team={collaborators} showNotif={showNotif} onAddTask={async t => { await supabase.from('tasks').insert([{ id: generateId(), title: t.title, assigned_to_id: String(t.assignedToId).trim(), assigned_by_id: String(currentUserId).trim(), pole: t.pole, deadline: t.deadline, urgency: t.urgency, status: 'todo' }]); await fetchData(); }} onUpdateTask={async (id, upd) => { const p:any = {}; if (upd.title !== undefined) p.title = upd.title; if (upd.assignedToId !== undefined) p.assigned_to_id = String(upd.assignedToId).trim(); if (upd.deadline !== undefined) p.deadline = upd.deadline; if (upd.pole !== undefined) p.pole = upd.pole; if (upd.urgency !== undefined) p.urgency = upd.urgency; if (upd.status !== undefined) p.status = upd.status; await supabase.from('tasks').update(p).eq('id', id); await fetchData(); }} onDeleteTask={async id => { await supabase.from('tasks').delete().eq('id', id); await fetchData(); }} poleFilter={poleFilter} startDate={startDate} endDate={endDate} />}
          {view === 'dashboard' && <Dashboard entries={entries} folders={folders} attendance={attendance} collaborators={collaborators} poleFilter={poleFilter} startDate={startDate} endDate={endDate} exerciceFilter={exerciceFilter} />}
          {view === 'folders' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm">
                <div className="flex items-center gap-6 flex-1">
                   <h3 className="text-xl font-black uppercase text-slate-900 whitespace-nowrap">Dossiers</h3>
                   <div className="relative flex-1 max-w-sm"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input type="text" placeholder="Rechercher dossier..." className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-black text-xs outline-none focus:border-indigo-500" value={folderSearchQuery} onChange={e => setFolderSearchQuery(e.target.value)} /></div>
                </div>
                <button onClick={() => setEntityModal({type: 'folder'})} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center gap-2 shadow-lg hover:bg-slate-900 transition-all"><Plus size={14}/> Nouveau Dossier</button>
              </div>
              <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl overflow-hidden text-black">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b"><tr><th className="p-6">Numéro</th><th className="p-6">Client / Dossier</th><th className="p-6">Pôle</th><th className="p-6 text-center">Budget</th><th className="p-6 text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {folders
                      .filter(f => !f.isArchived)
                      .filter(f => poleFilter === 'all' || f.serviceType?.toLowerCase() === poleFilter.toLowerCase())
                      .filter(f => !folderSearchQuery.trim() || f.name.toLowerCase().includes(folderSearchQuery.toLowerCase()) || f.number.toLowerCase().includes(folderSearchQuery.toLowerCase()))
                      .map(f => (<tr key={f.id} className="hover:bg-slate-50"><td className="p-6 font-bold text-black">{f.number}</td><td className="p-6 font-black uppercase text-black">{f.name}</td><td className="p-6"><span className={`px-3 py-1 rounded-full text-[8px] font-black text-white ${f.serviceType?.toLowerCase() === 'audit' ? 'bg-[#0056b3]' : 'bg-orange-500'}`}>{f.serviceType}</span></td><td className="p-6 text-center font-black text-black">{f.budgetHours}h</td><td className="p-6 text-right"><button onClick={() => setEntityModal({type: 'folder', data: f})} className="p-2 text-slate-400 hover:text-indigo-600"><Edit3 size={16}/></button><button onClick={() => setDeleteConfirm({id: f.id, table: 'folders', label: 'Archiver'})} className="p-2 text-slate-400 hover:text-rose-600 ml-2"><Trash2 size={16}/></button></td></tr>))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {view === 'collabs' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm">
                <div className="flex items-center gap-6 flex-1">
                   <h3 className="text-xl font-black uppercase text-slate-900 whitespace-nowrap">Équipe</h3>
                   <div className="relative flex-1 max-w-sm"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input type="text" placeholder="Rechercher collaborateur..." className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-black text-xs outline-none focus:border-indigo-500" value={collabSearchQuery} onChange={e => setCollabSearchQuery(e.target.value)} /></div>
                </div>
                <button onClick={() => setEntityModal({type: 'collab'})} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center gap-2 shadow-lg hover:bg-slate-900 transition-all"><Plus size={14}/> Nouveau Collaborateur</button>
              </div>
              <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl overflow-hidden text-black">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b"><tr><th className="p-6">Collaborateur</th><th className="p-6">Pôle</th><th className="p-6">Rôle</th><th className="p-6">Embauche</th><th className="p-6 text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {collaborators
                      .filter(c => poleFilter === 'all' || c.department?.toLowerCase() === poleFilter.toLowerCase())
                      .filter(c => !collabSearchQuery.trim() || c.name.toLowerCase().includes(collabSearchQuery.toLowerCase()))
                      .map(c => (<tr key={c.id} className="hover:bg-slate-50"><td className="p-6 font-black uppercase text-black">{c.name}</td><td className="p-6"><span className={`px-3 py-1 rounded-full text-[8px] font-black text-white ${c.department?.toLowerCase() === 'audit' ? 'bg-[#0056b3]' : 'bg-orange-500'}`}>{c.department}</span></td><td className="p-6 font-bold text-slate-600 uppercase text-[9px]">{c.role}</td><td className="p-6 font-bold text-black">{formatDateFR(c.hiringDate)}</td><td className="p-6 text-right"><button onClick={() => setEntityModal({type: 'collab', data: c})} className="p-2 text-slate-400 hover:text-indigo-600"><Edit3 size={16}/></button><button onClick={() => setDeleteConfirm({id: c.id, table: 'collaborators', label: 'Supprimer'})} className="p-2 text-slate-400 hover:text-rose-600 ml-2"><Trash2 size={16}/></button></td></tr>))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
