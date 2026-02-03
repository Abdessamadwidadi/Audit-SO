
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { TimeEntry, ServiceType, Collaborator, Folder, UserRole, EXERCICES } from './types';
import TimeEntryForm from './components/TimeEntryForm';
import Dashboard from './components/Dashboard';
import EntityModal from './components/EntityModal';
import EntryEditModal from './components/EntryEditModal';
import PinChangeModal from './components/PinChangeModal';
import ConfirmModal from './components/ConfirmModal';
import Logo from './components/Logo';
import { exportSimpleByFolder, exportSummaryCabinet } from './services/csvService';
import { 
  LayoutDashboard, Users, FolderOpen, LogOut, 
  PlusCircle, Loader2, Trash2, Table, Edit3, 
  RefreshCw, FileSpreadsheet, Layers, ShieldCheck, UserCircle, Search, CheckSquare, Square, Sparkles, Menu, X as XIcon, Plus
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const STORE = { USER_ID: 'mgtso_v1_userid' };
const DEFAULT_SUPABASE_URL = "https://cvbovfqbgdchdycqtmpr.supabase.co";
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2Ym92ZnFiZ2RjaGR5Y3F0bXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTcyNDcsImV4cCI6MjA4MjQzMzI0N30.e16pFuNwInvA51q9X1V_0fpAWar8JPVQZD4-tfx0gdk";

const normalizeDate = (dateStr: any): string => {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const s = String(dateStr).trim();
  
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m}-${d}`;
  }
  
  if (s.includes('T')) return s.split('T')[0];
  return s;
};

export const formatDateFR = (dateStr: string) => {
  const pureDate = normalizeDate(dateStr);
  const parts = pureDate.split('-');
  if (parts.length !== 3) return pureDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const App: React.FC = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => localStorage.getItem(STORE.USER_ID));
  const [loginStep, setLoginStep] = useState<{collab: Collaborator} | null>(null);
  const [pinInput, setPinInput] = useState('');
  const pinInputRef = useRef<HTMLInputElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [view, setView] = useState<'log' | 'dashboard' | 'collabs' | 'folders' | 'history'>('log');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notif, setNotif] = useState<{type: 'success'|'error', msg: string} | null>(null);
  const [entityModal, setEntityModal] = useState<{type: 'collab' | 'folder', data?: any} | null>(null);
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [showPinChange, setShowPinChange] = useState(false);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [poleFilter, setPoleFilter] = useState<string>('all');
  const [exerciceFilter, setExerciceFilter] = useState<number>(0); 
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2026-12-31");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());

  const supabase = useMemo(() => createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY), []);

  const showNotif = useCallback((type: 'success' | 'error', msg: string) => {
    setNotif({ type, msg });
    setTimeout(() => setNotif(null), 4000);
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUserId(null);
    localStorage.removeItem(STORE.USER_ID);
    setLoginStep(null);
    setPinInput('');
  }, []);

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [{ data: cData }, { data: fData }, { data: eData }] = await Promise.all([
        supabase.from('collaborators').select('*').order('name'),
        supabase.from('folders').select('*').order('number'),
        supabase.from('time_entries').select('*').order('date', { ascending: false })
      ]);
      
      setCollaborators(cData?.map(c => ({ 
        id: String(c.id), name: c.name, department: c.department as ServiceType, hiringDate: c.hiring_date, role: c.role as UserRole, password: String(c.password || ""), isActive: c.is_active !== false, startTime: c.start_time || "09:00", endTime: c.end_time || "18:00"
      })) || []);

      setFolders(fData?.map(f => ({ 
        id: String(f.id), 
        name: f.name || "Sans nom", 
        number: f.number || "N/A", 
        clientName: f.client_name || "", 
        serviceType: f.service_type as ServiceType, 
        budgetHours: f.budget_hours, 
        isArchived: f.is_archived || false
      })) || []);

      setEntries(eData?.map(e => ({ 
        id: String(e.id), 
        collaboratorId: e.collaborator_id ? String(e.collaborator_id) : "null", 
        folderId: e.folder_id ? String(e.folder_id) : "null", 
        duration: parseFloat(e.duration) || 0, 
        date: normalizeDate(e.date), 
        description: e.description || "", 
        service: (e.service || ServiceType.EXPERTISE) as ServiceType, 
        exercice: Number(e.exercice) || 2025, 
        folderName: e.folder_name || "Dossier Inconnu", 
        folderNumber: e.folder_number || "-"
      })) || []);
      
      setIsDataLoaded(true);
      setSelectedEntryIds(new Set());
    } catch (err) { 
      console.error("Fetch error:", err);
      showNotif('error', "Erreur de chargement"); 
      setIsDataLoaded(true); 
    } finally { setIsRefreshing(false); }
  }, [supabase, showNotif]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentUser = useMemo(() => collaborators.find(c => String(c.id) === String(currentUserId)), [collaborators, currentUserId]);
  const isAdminOrManager = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;

  useEffect(() => {
    if (currentUser && !isAdminOrManager) {
      setPoleFilter(currentUser.department);
    }
  }, [currentUser, isAdminOrManager]);

  const filteredHistory = useMemo(() => {
    let list = entries.filter(e => {
      const matchCollab = isAdminOrManager ? true : String(e.collaboratorId) === String(currentUserId);
      const nameUpper = (e.folderName || "").toUpperCase();
      const isPrunay = nameUpper.includes("PRUNAY") || nameUpper.includes("PRUNNAY");
      const isActuallyAudit = isPrunay || (e.service || "").toLowerCase() === 'audit';
      const effectivePole = isActuallyAudit ? 'Audit' : 'Expertise';
      
      const matchPole = poleFilter === 'all' || effectivePole.toLowerCase() === poleFilter.toLowerCase();
      const matchEx = exerciceFilter === 0 || Number(e.exercice) === exerciceFilter;
      const matchDate = e.date >= startDate && e.date <= endDate;
      return matchCollab && matchPole && matchEx && matchDate;
    });

    if (searchQuery.trim()) {
      const s = searchQuery.toLowerCase();
      list = list.filter(e => (
        (e.folderName?.toLowerCase() || "").includes(s) || 
        (e.description?.toLowerCase() || "").includes(s) ||
        (e.folderNumber?.toLowerCase() || "").includes(s) ||
        (collaborators.find(c => String(c.id) === String(e.collaboratorId))?.name?.toLowerCase() || "").includes(s)
      ));
    }

    return list.sort((a, b) => {
      const dateCompare = sortOrder === 'desc' 
        ? b.date.localeCompare(a.date) 
        : a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return sortOrder === 'desc' ? Number(b.id) - Number(a.id) : Number(a.id) - Number(b.id);
    });
  }, [entries, searchQuery, poleFilter, currentUserId, isAdminOrManager, startDate, endDate, exerciceFilter, collaborators, sortOrder]);

  const filteredFoldersList = useMemo(() => {
    let list = folders.filter(f => !f.isArchived);
    if (poleFilter !== 'all') {
      list = list.filter(f => {
        const nameUpper = (f.name || "").toUpperCase();
        const isPrunay = nameUpper.includes("PRUNAY") || nameUpper.includes("PRUNNAY");
        const isActuallyAudit = isPrunay || (f.serviceType || "").toLowerCase() === 'audit';
        const effectivePole = isActuallyAudit ? 'Audit' : 'Expertise';
        return effectivePole.toLowerCase() === poleFilter.toLowerCase();
      });
    }
    if (searchQuery.trim()) {
      const s = searchQuery.toLowerCase();
      list = list.filter(f => 
        (f.name?.toLowerCase() || "").includes(s) || 
        (f.number?.toLowerCase() || "").includes(s)
      );
    }
    return list;
  }, [folders, poleFilter, searchQuery]);

  const filteredCollaboratorsList = useMemo(() => {
    let list = collaborators;
    if (poleFilter !== 'all') {
      list = list.filter(c => c.department?.toLowerCase() === poleFilter.toLowerCase());
    }
    if (searchQuery.trim()) {
      const s = searchQuery.toLowerCase();
      list = list.filter(c => (c.name?.toLowerCase() || "").includes(s));
    }
    return list;
  }, [collaborators, poleFilter, searchQuery]);

  const toggleEntrySelection = (id: string) => {
    const next = new Set(selectedEntryIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedEntryIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedEntryIds.size === filteredHistory.length) {
      setSelectedEntryIds(new Set());
    } else {
      setSelectedEntryIds(new Set(filteredHistory.map(e => e.id)));
    }
  };

  const handleBulkDelete = () => {
    if (!selectedEntryIds.size) return;
    setIsBulkDeleteModalOpen(true);
  };

  const performBulkDelete = async () => {
    setIsBulkDeleteModalOpen(false);
    setIsRefreshing(true);
    const idsToDelete = Array.from(selectedEntryIds).map(id => Number(id));
    const { error } = await supabase.from('time_entries').delete().in('id', idsToDelete);
    
    if (error) {
      showNotif('error', "Erreur lors de la suppression groupée");
    } else {
      showNotif('success', `${selectedEntryIds.size} saisies supprimées`);
      fetchData();
    }
  };

  const handleDeleteFolderConfirm = async () => {
    if (!deletingFolderId) return;
    setIsRefreshing(true);
    const { error } = await supabase.from('folders').delete().eq('id', Number(deletingFolderId));
    if (error) {
      showNotif('error', "Erreur lors de la suppression du dossier");
    } else {
      showNotif('success', "Dossier et temps associés supprimés");
      fetchData();
    }
    setDeletingFolderId(null);
  };

  const handleExportHistorySimple = () => {
    exportSimpleByFolder(`Export_Simple_Analytique_${new Date().toISOString().split('T')[0]}`, filteredHistory, folders, collaborators);
  };

  const handleExportGroupedCabinet = () => {
    exportSummaryCabinet(`Export_Regroupe_Portefeuille_${new Date().toISOString().split('T')[0]}`, filteredHistory, folders, collaborators);
  };

  if (!isDataLoaded) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white"><Loader2 className="animate-spin mr-3" size={40}/> Chargement...</div>;

  if (!currentUserId || !currentUser) {
    if (loginStep) {
      return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white">
          <div className="bg-white rounded-[3rem] w-full max-w-[440px] p-12 text-center shadow-2xl text-black">
            <h3 className="text-3xl font-black mb-1 tracking-tighter text-[#000000]">ACCÈS PIN</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-10">{loginStep.collab.name}</p>
            <input ref={pinInputRef} type="password" inputMode="numeric" maxLength={6} className="w-full p-5 border-2 border-indigo-100 rounded-2xl text-center text-4xl font-black tracking-[0.5em] text-indigo-600 outline-none" value={pinInput} onChange={e => {
                const v = e.target.value.replace(/\D/g,''); setPinInput(v);
                if(v.length >= 4 && v === loginStep.collab.password) {
                  setCurrentUserId(loginStep.collab.id); localStorage.setItem(STORE.USER_ID, loginStep.collab.id); setLoginStep(null); setPinInput('');
                } else if(v.length >= 4) { setPinInput(''); showNotif('error', 'Code incorrect'); }
            }} autoFocus />
            <button onClick={() => setLoginStep(null)} className="mt-8 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Retour</button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-white overflow-y-auto">
        <Logo variant="both" size={60} showText={false} className="mb-12" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl">
          {collaborators.filter(c => c.isActive).map(c => {
            const isAdmin = c.role === UserRole.ADMIN;
            const isManager = c.role === UserRole.MANAGER;
            const isAudit = c.department === ServiceType.AUDIT;
            const showBothColored = isAdmin || isManager;

            return (
              <button key={c.id} onClick={() => setLoginStep({collab: c})} className={`group p-8 rounded-[3rem] bg-[#111827] border-2 transition-all text-left flex flex-col justify-between h-72 ${isAdmin ? 'border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.15)]' : 'border-white/5 hover:border-white/20'}`}>
                <div className="w-full">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex bg-slate-800/40 p-1 rounded-full border border-white/5">
                      <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tight transition-all ${(isAudit || showBothColored) ? 'bg-[#0056b3] text-white shadow-lg' : 'text-slate-500'}`}>AUDIT</div>
                      <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tight transition-all ${(!isAudit || showBothColored) ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}>EXPERTISE</div>
                    </div>
                    {isAdmin && (
                      <div className="bg-amber-500 p-1.5 rounded-lg shadow-lg">
                        <ShieldCheck size={16} className="text-white" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-2xl font-black mb-1 group-hover:text-indigo-400 uppercase leading-none tracking-tight">{c.name}</h3>
                  {isAdmin ? <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mt-1">ADMINISTRATEUR</p> : isManager ? <p className="text-[8px] font-black text-amber-500/80 uppercase tracking-widest mt-1">MANAGER</p> : null}
                </div>
                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                   <p className={`text-[9px] font-black uppercase ${isAudit ? 'text-[#0056b3]' : 'text-orange-500'}`}>{c.department}</p>
                   <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-white transition-colors">
                     <PlusCircle size={14} />
                   </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#f8fafc] text-[#000000] relative">
      {notif && (<div className={`fixed top-8 right-8 z-[1000] px-8 py-4 rounded-xl text-white font-black text-[10px] uppercase shadow-2xl ${notif.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>{notif.msg}</div>)}
      
      {/* Overlay pour mobile quand sidebar ouverte */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[55] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {deletingFolderId && (
        <ConfirmModal 
          title="Supprimer ce dossier ?"
          message="Attention, supprimer ce dossier effacera toutes ses données. Utilisez l'Export Simple avant de confirmer."
          onConfirm={handleDeleteFolderConfirm}
          onCancel={() => setDeletingFolderId(null)}
          confirmLabel="Confirmer la suppression"
        />
      )}

      {isBulkDeleteModalOpen && (
        <ConfirmModal 
          title="Suppression groupée"
          message={`Supprimer définitivement les ${selectedEntryIds.size} saisies sélectionnées ?`}
          onConfirm={performBulkDelete}
          onCancel={() => setIsBulkDeleteModalOpen(false)}
          confirmLabel="Supprimer"
        />
      )}

      {entityModal && <EntityModal type={entityModal.type} initialData={entityModal.data} currentUser={currentUser} onSave={async (data) => {
        const { id, ...rest } = data;
        const table = entityModal.type === 'collab' ? 'collaborators' : 'folders';
        
        const payload = entityModal.type === 'collab' ? {
          name: data.name,
          department: data.department,
          role: data.role,
          password: data.password,
          is_active: data.isActive
        } : {
          name: data.name,
          number: data.number,
          service_type: data.serviceType,
          budget_hours: data.budgetHours,
          is_archived: data.isArchived || false
        };

        const query = id 
          ? supabase.from(table).update(payload).eq('id', Number(id))
          : supabase.from(table).insert([payload]);

        const { error } = await query;
        if(error) {
          showNotif('error', error.message);
        } else {
          setEntityModal(null); fetchData(); showNotif('success', 'Enregistré');
        }
      }} onClose={() => setEntityModal(null)} />}
      
      {editEntry && (
        <EntryEditModal entry={editEntry} folders={folders} currentUser={currentUser} onClose={() => setEditEntry(null)} onSave={async (updated) => {
          const folder = folders.find(f => String(f.id) === String(updated.folderId));
          await supabase.from('time_entries').update({
            date: updated.date,
            duration: updated.duration,
            description: updated.description,
            folder_id: Number(updated.folderId),
            folder_name: folder?.name,
            folder_number: folder?.number,
            service: folder?.serviceType,
            exercice: updated.exercice
          }).eq('id', Number(updated.id));
          fetchData(); setEditEntry(null); showNotif('success', 'Saisie modifiée');
        }} />
      )}

      {showPinChange && (
        <PinChangeModal collab={currentUser} onClose={() => setShowPinChange(false)} onSave={async (newPin) => {
          await supabase.from('collaborators').update({ password: newPin }).eq('id', Number(currentUser.id));
          fetchData(); setShowPinChange(false); showNotif('success', 'PIN mis à jour');
        }} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-[60] w-72 bg-[#0f172a] text-white p-10 flex flex-col shrink-0 shadow-2xl transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-12 flex justify-between items-center">
          <Logo variant="both" size={42} showText={false} />
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white"><XIcon size={24}/></button>
        </div>
        <nav className="space-y-3 flex-grow overflow-y-auto hide-scrollbar">
          {[{v: 'log', i: <PlusCircle size={18}/>, l: 'Saisie'}, {v: 'dashboard', i: <LayoutDashboard size={18}/>, l: 'Mon Dashboard'}, {v: 'history', i: <Table size={18}/>, l: 'Historique'}].map(m => (
            <button key={m.v} onClick={() => { setView(m.v as any); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${view === m.v ? 'bg-indigo-600' : 'hover:bg-slate-800 text-slate-400'}`}>{m.i} {m.l}</button>
          ))}
          {isAdminOrManager && <div className="pt-10 border-t border-slate-800 mt-6 space-y-3">
            {[{v: 'dashboard', i: <LayoutDashboard size={18}/>, l: 'Dashboard Manager'}, {v: 'folders', i: <FolderOpen size={18}/>, l: 'Dossiers'}, {v: 'collabs', i: <Users size={18}/>, l: 'Équipe'}].map(m => (
              <button key={m.v} onClick={() => { setView(m.v as any); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${view === m.v ? 'bg-indigo-600' : 'hover:bg-slate-800 text-slate-400'}`}>{m.i} {m.l}</button>
            ))}
          </div>}
        </nav>
        <div className="pt-10 border-t border-slate-800 space-y-3">
          <button onClick={() => { setShowPinChange(true); setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 text-slate-400 hover:text-indigo-400 font-black uppercase text-[9px] p-4 transition-colors"><UserCircle size={16}/> Mon Profil / PIN</button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 text-slate-500 hover:text-rose-400 font-black uppercase text-[9px] p-4 transition-colors"><LogOut size={16}/> Déconnexion</button>
        </div>
      </aside>

      <main className="flex-grow p-6 lg:p-12 overflow-y-auto bg-white w-full">
        {/* Note d'accueil humoristique */}
        <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-1000">
           <div className="p-2 bg-white rounded-xl shadow-sm shrink-0"><Sparkles size={18} className="text-indigo-600"/></div>
           <p className="text-xs font-bold text-indigo-900 italic">
             « On m'a dit que tu rêvais de tes dossiers la nuit... Pour éviter l'insomnie, tu peux les saisir directement depuis ton lit. C'est ça, la magie du cloud ! »
           </p>
        </div>

        <header className="mb-10 flex justify-between items-center border-b border-slate-100 pb-8 text-[#0f172a]">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-3 bg-slate-50 border border-slate-100 rounded-2xl text-indigo-600"><Menu size={24}/></button>
            <div>
              <h2 className="text-3xl lg:text-5xl font-black uppercase tracking-tighter leading-none">{view === 'log' ? 'Saisie' : view}</h2>
              <p className="text-indigo-600 font-black text-[10px] lg:text-[11px] uppercase tracking-widest mt-2 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${currentUser.department?.toLowerCase() === 'audit' ? 'bg-[#0056b3]' : 'bg-orange-500'}`}></span>
                {currentUser.name} • {currentUser.department}
              </p>
            </div>
          </div>
          <button onClick={() => fetchData()} className={`p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100 transition-all ${isRefreshing ? 'animate-spin' : ''}`} title="Rafraîchir"><RefreshCw size={22}/></button>
        </header>

        <div className="space-y-10">
          {(view === 'history' || view === 'dashboard' || view === 'folders' || view === 'collabs') && (
            <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex flex-wrap gap-4 items-center">
                {/* Filtre Pôle */}
                {(isAdminOrManager || view === 'history' || view === 'folders' || view === 'collabs') && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtre Pôle</span>
                    <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                      {isAdminOrManager ? (
                        ['all', 'Audit', 'Expertise'].map(p => (
                          <button key={p} onClick={() => setPoleFilter(p)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${poleFilter === p ? (p === 'Audit' ? 'bg-[#0056b3] text-white shadow-md' : p === 'Expertise' ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-900 text-white shadow-md') : 'text-slate-400 hover:text-slate-600'}`}>{p === 'all' ? 'Tous' : p}</button>
                        ))
                      ) : (
                        <div className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${currentUser.department === 'Audit' ? 'bg-[#0056b3] text-white shadow-md' : 'bg-orange-500 text-white shadow-md'}`}>
                          {currentUser.department}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1 flex-grow">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Recherche</span>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input 
                      type="text" 
                      placeholder="Rechercher..." 
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 items-center">
                {(view === 'history' || view === 'dashboard') && (
                  <>
                    {view === 'history' && (
                      <div className="flex flex-col gap-1 min-w-[150px]">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tri</span>
                        <select className="p-2.5 border border-slate-200 rounded-xl font-black text-indigo-600 text-[10px] outline-none shadow-sm" value={sortOrder} onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')}>
                          <option value="desc">Récent → Ancien</option>
                          <option value="asc">Ancien → Récent</option>
                        </select>
                      </div>
                    )}
                    <div className="flex flex-col gap-1 min-w-[120px]">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Exercice</span>
                      <select className="p-2.5 border border-slate-200 rounded-xl font-black text-indigo-600 text-[10px] outline-none shadow-sm" value={exerciceFilter} onChange={e => setExerciceFilter(parseInt(e.target.value))}>
                        <option value={0}>Tous</option>
                        {EXERCICES.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                      </select>
                    </div>
                    {view === 'history' && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Période</span>
                        <div className="flex items-center gap-2">
                          <input type="date" className="p-2 border border-slate-200 rounded-xl font-bold text-[10px]" value={startDate} onChange={e => setStartDate(e.target.value)} />
                          <span className="text-slate-300">→</span>
                          <input type="date" className="p-2 border border-slate-200 rounded-xl font-bold text-[10px]" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {view === 'history' && (
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="flex gap-2">
                  {selectedEntryIds.size > 0 && isAdminOrManager && (
                    <button onClick={handleBulkDelete} className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-rose-700 transition-all">
                      <Trash2 size={14}/> Supprimer ({selectedEntryIds.size})
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleExportHistorySimple} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg transition-all" title="Export Analytique">
                    <FileSpreadsheet size={14}/> Simple
                  </button>
                  <button onClick={handleExportGroupedCabinet} className="flex items-center gap-2 px-4 py-2 bg-[#0056b3] text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-slate-900 transition-all" title="Export Portefeuille">
                    <Layers size={14}/> Regroupe
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-[#1e293b] text-[10px] font-black uppercase text-white border-b">
                      <tr>
                        <th className="p-6 w-10">
                          <button onClick={toggleSelectAll} className="text-white hover:text-indigo-400 transition-colors">
                            {selectedEntryIds.size === filteredHistory.length && filteredHistory.length > 0 ? <CheckSquare size={18}/> : <Square size={18}/>}
                          </button>
                        </th>
                        <th className="p-6">Date</th><th className="p-6">Collaborateur</th><th className="p-6">Dossier</th><th className="p-6">Travaux</th><th className="p-6 text-center">H</th><th className="p-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredHistory.map(e => {
                        const nameUpper = (e.folderName || "").toUpperCase();
                        const isActuallyAudit = nameUpper.includes("PRUNAY") || nameUpper.includes("PRUNNAY") || (e.service || "").toLowerCase() === 'audit';
                        return (
                          <tr key={e.id} className={`text-xs hover:bg-slate-50 transition-all ${selectedEntryIds.has(e.id) ? 'bg-indigo-50/50' : ''} text-[#000000] font-bold`}>
                            <td className="p-6">
                              <button onClick={() => toggleEntrySelection(e.id)} className={`${selectedEntryIds.has(e.id) ? 'text-indigo-600' : 'text-slate-300'}`}>
                                {selectedEntryIds.has(e.id) ? <CheckSquare size={18}/> : <Square size={18}/>}
                              </button>
                            </td>
                            <td className="p-6 whitespace-nowrap" onClick={() => toggleEntrySelection(e.id)}>{formatDateFR(e.date)}</td>
                            <td className="p-6 uppercase whitespace-nowrap">{collaborators.find(c => String(c.id) === String(e.collaboratorId))?.name || "Importé"}</td>
                            <td className="p-6">
                              <span className={`text-[9px] font-black block ${isActuallyAudit ? 'text-[#0056b3]' : 'text-orange-500'}`}>{e.folderNumber}</span>
                              <span className="uppercase text-[10px]">{e.folderName}</span>
                            </td>
                            <td className="p-6 text-slate-600 italic text-[11px] max-w-[200px] truncate">{e.description}</td>
                            <td className="p-6 text-center text-[#000000] text-base">{e.duration}h</td>
                            <td className="p-6 text-right whitespace-nowrap">
                              <button onClick={() => setEditEntry(e)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all mr-2"><Edit3 size={16}/></button>
                              {isAdminOrManager && (
                                <button onClick={async () => { if(confirm("Supprimer cette saisie ?")) { await supabase.from('time_entries').delete().eq('id', Number(e.id)); fetchData(); } }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {filteredHistory.length === 0 && (
                  <div className="p-20 text-center text-slate-400 font-black uppercase text-[10px] italic">Aucune saisie trouvée</div>
                )}
              </div>
            </div>
          )}

          {view === 'folders' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Gestion des Dossiers</h3>
                {isAdminOrManager && (
                  <button onClick={() => setEntityModal({type: 'folder'})} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-900 transition-all flex items-center gap-2">
                    <Plus size={16}/> Ajouter Dossier
                  </button>
                )}
              </div>
              <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl overflow-hidden text-[#000000]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-[#1e293b] text-[10px] font-black uppercase text-white border-b"><tr><th className="p-6">Numéro</th><th className="p-6">Libellé du Dossier</th><th className="p-6 text-center">Pôle</th><th className="p-6 text-right">Actions</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredFoldersList.map(f => {
                          const nameUpper = (f.name || "").toUpperCase();
                          const isPrunay = nameUpper.includes("PRUNAY") || nameUpper.includes("PRUNNAY");
                          const isActuallyAudit = isPrunay || (f.serviceType || "").toLowerCase() === 'audit';
                          const effectivePole = isActuallyAudit ? 'Audit' : 'Expertise';
                          return (
                            <tr key={f.id} className="hover:bg-slate-50 text-[#000000] font-bold">
                              <td className={`p-6 font-black ${effectivePole?.toLowerCase() === 'audit' ? 'text-[#0056b3]' : 'text-orange-500'}`}>{f.number}</td>
                              <td className="p-6 uppercase">{f.name}</td>
                              <td className="p-6 text-center"><span className={`px-2 py-1 rounded text-[8px] font-black text-white ${effectivePole?.toLowerCase() === 'audit' ? 'bg-[#0056b3]' : 'bg-orange-500'}`}>{effectivePole}</span></td>
                              <td className="p-6 text-right">
                                <button onClick={() => setEntityModal({type: 'folder', data: f})} className="p-3 text-slate-400 hover:text-indigo-600 transition-all"><Edit3 size={18}/></button>
                                <button onClick={() => setDeletingFolderId(f.id)} className="p-3 text-slate-400 hover:text-rose-500 transition-all"><Trash2 size={18}/></button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                {filteredFoldersList.length === 0 && (
                  <div className="p-20 text-center text-slate-400 font-black uppercase text-[10px] italic">Aucun dossier trouvé</div>
                )}
              </div>
            </div>
          )}

          {view === 'dashboard' && <Dashboard entries={entries} folders={folders} attendance={[]} collaborators={collaborators} poleFilter={poleFilter} startDate={startDate} endDate={endDate} exerciceFilter={exerciceFilter} currentUser={currentUser} />}
          {view === 'log' && <TimeEntryForm currentUser={currentUser!} folders={folders} existingEntries={entries} onAddEntry={async d => { 
            const folder = folders.find(fl => String(fl.id) === String(d.folderId));
            await supabase.from('time_entries').insert([{ 
              collaborator_id: Number(currentUserId), 
              folder_id: Number(d.folderId), 
              folder_name: folder?.name, 
              folder_number: folder?.number, 
              duration: d.duration, 
              date: d.date, 
              description: d.description, 
              service: folder?.serviceType, 
              exercice: d.exercice 
            }]); 
            fetchData(); showNotif('success', 'Saisie enregistrée'); 
          }} onQuickFolderAdd={() => setView('folders')} />}
          {view === 'collabs' && (
            <div className="space-y-4">
               <div className="flex justify-between items-center">
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Équipe & Collaborateurs</h3>
                {isAdminOrManager && (
                  <button onClick={() => setEntityModal({type: 'collab'})} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-900 transition-all flex items-center gap-2">
                    <Plus size={16}/> Ajouter Collaborateur
                  </button>
                )}
              </div>
              <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl overflow-hidden text-[#000000]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[500px]">
                      <thead className="bg-[#1e293b] text-[10px] font-black uppercase text-white border-b"><tr><th className="p-6">Nom</th><th className="p-6">Pôle</th><th className="p-6">Rôle</th><th className="p-6 text-right w-20">Actions</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCollaboratorsList.map(c => (
                            <tr key={c.id} className={`hover:bg-slate-50 text-[#000000] font-bold ${!c.isActive ? 'opacity-50 grayscale' : ''}`}>
                              <td className="p-6 uppercase">{c.name}</td>
                              <td className="p-6"><span className={`px-3 py-1 rounded-full text-[8px] font-black text-white ${c.department?.toLowerCase() === 'audit' ? 'bg-[#0056b3]' : 'bg-orange-500'}`}>{c.department}</span></td>
                              <td className="p-6 uppercase text-[10px] text-slate-500">{c.role}</td>
                              <td className="p-6 text-right"><button onClick={() => setEntityModal({type: 'collab', data: c})} className="p-3 text-slate-400 hover:text-indigo-600 transition-all"><Edit3 size={18}/></button></td>
                            </tr>
                          ))}
                      </tbody>
                  </table>
                </div>
                {filteredCollaboratorsList.length === 0 && (
                    <div className="p-20 text-center text-slate-400 font-black uppercase text-[10px] italic">Aucun collaborateur trouvé</div>
                  )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
