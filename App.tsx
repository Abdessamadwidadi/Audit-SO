
import React, { useState, useEffect, useMemo } from 'react';
import { TimeEntry, ServiceType, Collaborator, Folder, Notification, UserRole } from './types';
import TimeEntryForm from './components/TimeEntryForm';
import Dashboard from './components/Dashboard';
import EntityModal from './components/EntityModal';
import ImportModal from './components/ImportModal';
import { 
  LayoutDashboard, Clock, List, 
  Users, FolderOpen, Trash2, Edit3, UserCircle, LogOut, 
  PlusCircle, Plus, AlertTriangle, RefreshCw, CheckCircle2, XCircle, Wifi, WifiOff, Send, ExternalLink, Key, Sparkles, Settings, ShieldCheck, Download, Filter, Upload, Database,
  Calendar as CalendarIcon, Code, Copy, LifeBuoy, ShieldAlert
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const STORE = {
  ENTRIES: 'mgtso_v1_entries',
  COLLABS: 'mgtso_v1_collabs',
  FOLDERS: 'mgtso_v1_folders',
  USER_ID: 'mgtso_v1_userid',
  CLOUD_CONFIG: 'mgtso_cloud_config_v2'
};

const DEFAULT_SUPABASE_URL = "https://cvbovfqbgdchdycqtmpr.supabase.co";
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2Ym92ZnFiZ2RjaGR5Y3F0bXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTcyNDcsImV4cCI6MjA4MjQzMzI0N30.e16pFuNwInvA51q9X1V_0fpAWar8JPVQZD4-tfx0gdk";

const SQL_SETUP = `-- SCRIPT DE DÉBLOCAGE TOTAL (SQL EDITOR SUPABASE)
-- 1. DÉSACTIVER LES VERROUS DE SÉCURITÉ (RLS)
ALTER TABLE collaborators DISABLE ROW LEVEL SECURITY;
ALTER TABLE folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries DISABLE ROW LEVEL SECURITY;

-- 2. AJOUTER LA COLONNE PASSWORD SI MANQUANTE
ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS password TEXT DEFAULT '0000';
UPDATE collaborators SET password = '0000' WHERE password IS NULL;

-- 3. S'ASSURER QUE TOUTES LES TABLES EXISTENT
CREATE TABLE IF NOT EXISTS collaborators (id TEXT PRIMARY KEY, name TEXT, department TEXT, hiringDate TEXT, role TEXT, password TEXT DEFAULT '0000');
CREATE TABLE IF NOT EXISTS folders (id TEXT PRIMARY KEY, name TEXT, number TEXT, clientName TEXT, serviceType TEXT, budgetHours NUMERIC);
CREATE TABLE IF NOT EXISTS time_entries (id TEXT PRIMARY KEY, collaboratorId TEXT, collaboratorName TEXT, service TEXT, folderId TEXT, folderName TEXT, folderNumber TEXT, duration NUMERIC, description TEXT, date TEXT);`;

const App: React.FC = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => localStorage.getItem(STORE.USER_ID));
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [view, setView] = useState<'log' | 'dashboard' | 'entries' | 'collabs' | 'folders' | 'settings'>('log');
  const [isLoading, setIsLoading] = useState(false);
  const [entityModal, setEntityModal] = useState<{ type: 'collab' | 'folder'; data?: any } | null>(null);
  const [showImport, setShowImport] = useState<{ type: 'collabs' | 'folders' } | null>(null);
  const [activePole, setActivePole] = useState<ServiceType | 'TOUS'>('TOUS');

  const [loginStep, setLoginStep] = useState<'select' | 'password'>('select');
  const [selectedCollab, setSelectedCollab] = useState<Collaborator | null>(null);
  const [passwordInput, setPasswordInput] = useState('');

  const [cloudConfig, setCloudConfig] = useState<{url: string, key: string}>(() => {
    try {
      const saved = localStorage.getItem(STORE.CLOUD_CONFIG);
      return saved ? JSON.parse(saved) : { url: DEFAULT_SUPABASE_URL, key: DEFAULT_SUPABASE_KEY };
    } catch (e) { return { url: DEFAULT_SUPABASE_URL, key: DEFAULT_SUPABASE_KEY }; }
  });

  const supabase = useMemo(() => {
    if (cloudConfig.url && cloudConfig.key && cloudConfig.url.startsWith('http')) {
      try { return createClient(cloudConfig.url, cloudConfig.key); } catch (e) { return null; }
    }
    return null;
  }, [cloudConfig]);

  const isCloudActive = !!supabase;

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (supabase) {
        const { data: cData, error: cErr } = await supabase.from('collaborators').select('*');
        const { data: fData, error: fErr } = await supabase.from('folders').select('*');
        const { data: eData, error: eErr } = await supabase.from('time_entries').select('*').order('date', { ascending: false });
        
        if (cErr || fErr || eErr) {
          throw new Error(cErr?.message || fErr?.message || eErr?.message || "Erreur base de données");
        }

        const cloudCollabs = cData || [];
        if (cloudCollabs.length === 0) {
          setCollaborators([{ id: 'admin-1', name: 'Abdessamad Balatif (Secours)', department: ServiceType.AUDIT, hiringDate: '2025-01-01', role: UserRole.ADMIN, password: '0000' }]);
        } else {
          setCollaborators(cloudCollabs);
        }
        setFolders(fData || []);
        setEntries(eData || []);
      } else {
        const savedCollabs = localStorage.getItem(STORE.COLLABS);
        setCollaborators(savedCollabs ? JSON.parse(savedCollabs) : [{ id: 'admin-1', name: 'Abdessamad Balatif', department: ServiceType.AUDIT, hiringDate: '2025-01-01', role: UserRole.ADMIN, password: '0000' }]);
        setFolders(JSON.parse(localStorage.getItem(STORE.FOLDERS) || '[]'));
        setEntries(JSON.parse(localStorage.getItem(STORE.ENTRIES) || '[]'));
      }
    } catch (err: any) { 
      addNotification("Erreur Cloud : " + (err.message || "Inaccessible"), "warning");
      setCollaborators([{ id: 'admin-1', name: 'Abdessamad Balatif (Mode Secours)', department: ServiceType.AUDIT, hiringDate: '2025-01-01', role: UserRole.ADMIN, password: '0000' }]);
    } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, [supabase]);

  const addNotification = (message: string, type: 'info' | 'warning' | 'success' = 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [{ id, message, type, timestamp: new Date().toLocaleTimeString() }, ...prev].slice(0, 3));
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 6000);
  };

  const saveEntity = async (type: 'collab' | 'folder', data: any) => {
    const table = type === 'collab' ? 'collaborators' : 'folders';
    const entity = { ...data, id: data.id || `${type === 'collab' ? 'c' : 'f'}_${Date.now()}` };
    if (type === 'collab' && !entity.password) entity.password = '0000';

    if (supabase) { 
      const { error } = await supabase.from(table).upsert([entity]); 
      if (error) { 
        if (error.message.includes('row-level security')) {
          addNotification("ALERTE SÉCURITÉ : Vous devez désactiver RLS sur Supabase. Allez dans Paramètres Cloud.", "warning");
        } else {
          addNotification(`Erreur : ${error.message}`, "warning");
        }
        return; 
      }
      fetchData(); 
    } else {
      if (type === 'collab') {
        const updated = data.id ? collaborators.map(c => c.id === data.id ? entity : c) : [...collaborators, entity];
        setCollaborators(updated);
        localStorage.setItem(STORE.COLLABS, JSON.stringify(updated));
      } else {
        const updated = data.id ? folders.map(f => f.id === data.id ? entity : f) : [...folders, entity];
        setFolders(updated);
        localStorage.setItem(STORE.FOLDERS, JSON.stringify(updated));
      }
    }
    addNotification("Enregistré avec succès", "success");
  };

  const handleLogin = () => {
    if (!selectedCollab) return;
    const correctPassword = selectedCollab.password || '0000';
    if (passwordInput === correctPassword) {
      setCurrentUserId(selectedCollab.id);
      localStorage.setItem(STORE.USER_ID, selectedCollab.id);
      addNotification(`Bienvenue ${selectedCollab.name}`, "success");
    } else {
      addNotification("Code d'accès incorrect", "warning");
      setPasswordInput('');
    }
  };

  const handleLogout = () => {
    setCurrentUserId(null);
    localStorage.removeItem(STORE.USER_ID);
    setLoginStep('select');
    setSelectedCollab(null);
    setPasswordInput('');
    setView('log');
  };

  const currentUser = collaborators.find(c => String(c.id) === String(currentUserId));
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const filteredFolders = useMemo(() => activePole === 'TOUS' ? folders : folders.filter(f => f.serviceType === activePole), [folders, activePole]);
  const filteredCollabs = useMemo(() => activePole === 'TOUS' ? collaborators : collaborators.filter(c => c.department === activePole), [collaborators, activePole]);

  if (!currentUserId) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]"></div>

        <div className="absolute top-8 right-8 z-50">
            <button onClick={() => setView(view === 'settings' ? 'log' : 'settings')} className="px-5 py-3 bg-slate-900/50 text-slate-400 rounded-xl hover:text-white transition-all flex items-center gap-2 border border-slate-800 backdrop-blur-md font-bold text-[10px] uppercase shadow-2xl">
              <Database size={16}/> {view === 'settings' ? 'Retour' : 'Paramètres Cloud'}
            </button>
        </div>

        {view === 'settings' ? (
           <div className="bg-white p-10 rounded-[3rem] w-full max-w-3xl shadow-2xl animate-in zoom-in duration-300 relative z-10 border border-slate-100 text-slate-900 overflow-y-auto max-h-[90vh]">
              <h3 className="text-3xl font-black mb-6 text-center">Déblocage Supabase</h3>
              <div className="space-y-6">
                  <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-red-800 text-[11px] leading-relaxed">
                    <p className="font-black mb-2 flex items-center gap-2 text-xs text-red-600"><ShieldAlert size={16}/> ACTION REQUISE : DÉSACTIVER RLS</p>
                    L'erreur "Row-level security policy" signifie que Supabase bloque les ajouts par sécurité.
                    <br/><br/>
                    1. Copiez le script ci-dessous.
                    <br/>
                    2. Allez dans votre tableau de bord Supabase -> <b>SQL Editor</b>.
                    <br/>
                    3. Collez et cliquez sur <b>RUN</b>.
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Script de Déblocage</label>
                    <button onClick={() => { navigator.clipboard.writeText(SQL_SETUP); addNotification("Script copié !", "success"); }} className="flex items-center gap-1 text-[10px] font-black text-indigo-600 uppercase"><Copy size={12}/> Copier</button></div>
                    <pre className="bg-slate-900 text-emerald-400 p-4 rounded-2xl text-[9px] font-mono overflow-x-auto h-48 border border-slate-800">{SQL_SETUP}</pre>
                  </div>
                  <div className="pt-6">
                    <button onClick={() => setView('log')} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl text-xs uppercase shadow-xl hover:bg-indigo-700">J'ai exécuté le script, retourner à l'accueil</button>
                  </div>
              </div>
           </div>
        ) : (
          <div className="max-w-5xl w-full text-center animate-in fade-in duration-700">
            <div className="mb-12">
               <h1 className="text-7xl md:text-8xl font-black text-white tracking-tighter mb-2">Management SO</h1>
               <h2 className="text-4xl font-bold text-indigo-400 tracking-tight">Audit Conseil</h2>
            </div>
            <div className="flex justify-center mb-16">
              <span className={`flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] px-10 py-4 rounded-full border transition-all ${isCloudActive ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20 shadow-[0_0_15px_rgba(52,211,153,0.1)]' : 'text-amber-400 bg-amber-400/10 border-amber-400/20'}`}>
                {isCloudActive ? <><div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div> Session Cloud Active</> : <><WifiOff size={14}/> Mode Hors-Ligne</>}
              </span>
            </div>

            {loginStep === 'select' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[50vh] overflow-y-auto px-4 hide-scrollbar">
                {collaborators.map(c => (
                  <button key={c.id} onClick={() => { setSelectedCollab(c); setLoginStep('password'); }} className="group bg-slate-900/40 backdrop-blur-md border border-slate-800 p-8 rounded-[2.5rem] text-left transition-all hover:bg-indigo-600 hover:-translate-y-2 hover:shadow-2xl">
                    <UserCircle size={40} className="text-indigo-400 group-hover:text-white mb-6" />
                    <h3 className="text-xl font-black text-white">{c.name}</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase mt-2 group-hover:text-indigo-200">{c.department}</p>
                  </button>
                ))}
                {collaborators.length === 0 && (
                  <div className="col-span-full py-20 flex flex-col items-center gap-6">
                    <p className="text-slate-500 font-bold uppercase text-xs tracking-widest animate-pulse">Initialisation des accès...</p>
                    <button onClick={fetchData} className="px-8 py-4 bg-indigo-600 rounded-2xl text-white text-[10px] font-black uppercase flex items-center gap-2"><RefreshCw size={14}/> Forcer le rechargement</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-900/60 p-12 rounded-[3.5rem] border border-slate-800 max-w-md mx-auto animate-in zoom-in duration-200">
                <div className="mb-10 text-center">
                  <div className="w-20 h-20 bg-indigo-600/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6"><UserCircle size={48} className="text-indigo-400" /></div>
                  <h3 className="text-2xl font-black text-white mb-1">{selectedCollab?.name}</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{selectedCollab?.department}</p>
                </div>
                <div className="space-y-6">
                  <input type="password" autoFocus className="w-full p-5 bg-slate-800 border border-slate-700 rounded-2xl text-white font-black text-center text-3xl outline-none" placeholder="••••" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                  <button onClick={handleLogin} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest">Entrer au Cabinet</button>
                  <button onClick={() => setLoginStep('select')} className="w-full text-slate-500 font-bold uppercase text-[9px]">Retour à la liste</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc] text-slate-900">
      <aside className="w-full md:w-80 bg-[#0f172a] text-white p-10 flex flex-col shrink-0 shadow-2xl z-50">
        <div className="flex flex-col mb-16 px-2">
          <h1 className="text-2xl font-black tracking-tighter leading-none">Management SO</h1>
          <h2 className="text-lg font-bold text-indigo-400 tracking-tighter mt-1">Audit Conseil</h2>
        </div>
        <div className="mb-12 p-8 bg-slate-800/40 rounded-[2.5rem] border border-slate-700/50">
           <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{currentUser?.department}</p>
           <p className="text-xl font-black truncate text-white mb-6">{currentUser?.name}</p>
           <button onClick={handleLogout} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-red-400 transition-colors"><LogOut size={16} /> Déconnexion</button>
        </div>
        <nav className="space-y-3 flex-grow">
          <button onClick={() => setView('log')} className={`w-full flex items-center gap-4 px-6 py-6 rounded-2xl transition-all ${view === 'log' ? 'bg-indigo-600 shadow-2xl text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}><PlusCircle size={22} /> <span className="font-black text-sm text-left">Saisir Temps</span></button>
          <button onClick={() => setView('entries')} className={`w-full flex items-center gap-4 px-6 py-6 rounded-2xl transition-all ${view === 'entries' ? 'bg-indigo-600 shadow-2xl text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}><List size={22} /> <span className="font-black text-sm text-left">Mon Journal</span></button>
          {isAdmin && (
            <>
              <div className="h-px bg-slate-800 my-10 mx-6 opacity-30"></div>
              <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-4 px-6 py-6 rounded-2xl transition-all ${view === 'dashboard' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400'}`}><LayoutDashboard size={22} /> <span className="font-black text-sm">Analytique</span></button>
              <button onClick={() => setView('folders')} className={`w-full flex items-center gap-4 px-6 py-6 rounded-2xl transition-all ${view === 'folders' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400'}`}><FolderOpen size={22} /> <span className="font-black text-sm">Dossiers</span></button>
              <button onClick={() => setView('collabs')} className={`w-full flex items-center gap-4 px-6 py-6 rounded-2xl transition-all ${view === 'collabs' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400'}`}><Users size={22} /> <span className="font-black text-sm">Équipe</span></button>
            </>
          )}
        </nav>
      </aside>

      <main className="flex-grow p-10 md:p-20 overflow-y-auto max-h-screen bg-[#f8fafc] hide-scrollbar">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-20">
          <div>
            <div className="flex items-center gap-4 mb-2"><span className="w-10 h-1 bg-indigo-600 rounded-full"></span><p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Management SO Audit Conseil</p></div>
            <h2 className="text-6xl font-black text-slate-900 tracking-tighter">
                {view === 'log' ? 'Nouvelle Saisie' : view === 'entries' ? 'Journal Personnel' : view === 'collabs' ? 'Gestion Équipe' : view === 'folders' ? 'Portefeuille Dossiers' : 'Pilotage Cabinet'}
            </h2>
          </div>
          {isAdmin && (view === 'collabs' || view === 'folders') && (
             <div className="flex gap-4">
                <button onClick={() => setShowImport({type: view === 'collabs' ? 'collabs' : 'folders'})} className="px-8 py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl"><Upload size={18}/> Importer</button>
                <button onClick={() => setEntityModal({type: view === 'collabs' ? 'collab' : 'folder'})} className="px-8 py-5 bg-indigo-600 text-white rounded-3xl font-black text-xs uppercase shadow-2xl hover:bg-indigo-700 transition-all flex items-center gap-2"><Plus size={18}/> Nouveau</button>
             </div>
          )}
        </header>

        <div className="max-w-7xl mx-auto space-y-16 pb-40">
          {view === 'log' && <TimeEntryForm collaborators={collaborators} folders={isAdmin ? folders : folders.filter(f => f.serviceType === currentUser?.department)} currentCollabId={currentUserId!} onAddEntry={async (data) => {
              if (!currentUserId || !currentUser) return;
              const folder = folders.find(f => String(f.id) === String(data.folderId));
              if (!folder) return;
              const newEntry = { id: `entry_${Date.now()}`, collaboratorId: currentUser.id, collaboratorName: currentUser.name, service: folder.serviceType, folderId: folder.id, folderName: folder.name, folderNumber: folder.number, duration: data.duration, description: data.description, date: data.date };
              if (supabase) { 
                const { error } = await supabase.from('time_entries').insert([newEntry]); 
                if (error) { 
                    if (error.message.includes('row-level security')) addNotification("RLS bloqué sur table time_entries. Voir Paramètres.", "warning");
                    else addNotification(error.message, "warning"); 
                    return; 
                } 
                fetchData(); 
              } else { const updated = [newEntry, ...entries]; setEntries(updated); localStorage.setItem(STORE.ENTRIES, JSON.stringify(updated)); }
              addNotification("Temps enregistré", "success");
          }} />}
          {view === 'dashboard' && <Dashboard entries={entries} folders={folders} />}
          
          {(view === 'collabs' || view === 'folders') && (
            <div className="bg-white rounded-[3.5rem] border border-slate-200 overflow-hidden shadow-sm">
               <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-400 border-b">
                    <tr><th className="p-10">Désignation</th><th className="p-10">Pôle</th><th className="p-10 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {(view === 'collabs' ? filteredCollabs : filteredFolders).map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-all group">
                        <td className="p-10">
                           <div className="flex items-center gap-5">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${view === 'collabs' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>{item.name.charAt(0)}</div>
                              <div><p className="font-black text-slate-900 text-xl group-hover:text-indigo-600 transition-colors">{item.name}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.clientName || item.role}</p></div>
                           </div>
                        </td>
                        <td className="p-10">
                          <span className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${item.department === ServiceType.AUDIT || item.serviceType === ServiceType.AUDIT ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>{item.department || item.serviceType}</span>
                        </td>
                        <td className="p-10 text-right">
                           <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                             <button onClick={() => setEntityModal({type: view === 'collabs' ? 'collab' : 'folder', data: item})} className="p-4 bg-white text-slate-400 hover:text-indigo-600 rounded-2xl border border-slate-100 shadow-sm transition-all"><Edit3 size={18}/></button>
                             <button onClick={async () => {
                               if (!confirm("Voulez-vous supprimer cet élément ?")) return;
                               if (supabase) { await supabase.from(view === 'collabs' ? 'collaborators' : 'folders').delete().eq('id', item.id); fetchData(); }
                               else { if (view === 'collabs') setCollaborators(collaborators.filter(c => c.id !== item.id)); else setFolders(folders.filter(f => f.id !== item.id)); }
                             }} className="p-4 bg-white text-slate-400 hover:text-red-500 rounded-2xl border border-slate-100 shadow-sm transition-all"><Trash2 size={18}/></button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          )}

          {view === 'entries' && (
            <div className="bg-white rounded-[3.5rem] border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-400 border-b">
                    <tr><th className="p-10">Date</th><th className="p-10">Dossier</th><th className="p-10">Durée</th><th className="p-10 text-right">Action</th></tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {entries.filter(e => e.collaboratorId === currentUserId).map(e => (
                      <tr key={e.id} className="hover:bg-slate-50 transition-all group">
                        <td className="p-10 font-bold text-slate-700">{e.date}</td>
                        <td className="p-10">
                          <p className="font-black text-slate-900">{e.folderName}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest">{e.description}</p>
                        </td>
                        <td className="p-10"><span className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-black text-xs">{e.duration}h</span></td>
                        <td className="p-10 text-right">
                           <button onClick={async () => {
                             if (!confirm("Effacer cette ligne ?")) return;
                             if (supabase) { await supabase.from('time_entries').delete().eq('id', e.id); fetchData(); }
                             else { setEntries(entries.filter(x => x.id !== e.id)); }
                           }} className="p-4 text-slate-200 hover:text-red-500 transition-all"><Trash2 size={18}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          )}
        </div>

        {entityModal && <EntityModal type={entityModal.type} initialData={entityModal.data} onSave={(data) => { saveEntity(entityModal.type, data); setEntityModal(null); }} onClose={() => setEntityModal(null)} />}
        {showImport && <ImportModal title={`Importer des ${showImport.type === 'collabs' ? 'Collaborateurs' : 'Dossiers'}`} type={showImport.type} onImport={(data) => {
            const rows = data.slice(1);
            rows.forEach(row => {
              if (showImport.type === 'collabs') saveEntity('collab', { name: row[0], department: row[1] || ServiceType.AUDIT, hiringDate: row[2] || new Date().toISOString().split('T')[0], role: UserRole.COLLABORATOR, password: '0000' });
              else saveEntity('folder', { name: row[0], number: row[1], clientName: row[2], serviceType: row[3] || ServiceType.AUDIT, budgetHours: parseFloat(row[4]) || 0 });
            });
            setShowImport(null);
            addNotification(`${rows.length} éléments importés`, "success");
        }} onClose={() => setShowImport(null)} />}
      </main>

      <div className="fixed bottom-12 right-12 flex flex-col gap-4 z-[300]">
        {notifications.map(n => (
          <div key={n.id} className={`p-8 rounded-[2.5rem] shadow-2xl border-l-[12px] flex items-center gap-6 animate-in slide-in-from-right min-w-[400px] backdrop-blur-2xl ${n.type === 'success' ? 'bg-emerald-50/95 border-emerald-500 text-emerald-900' : 'bg-amber-50/95 border-amber-500 text-amber-900'}`}>
             {n.type === 'success' ? <CheckCircle2 className="text-emerald-500" size={32}/> : <AlertTriangle className="text-amber-500" size={32}/>}
             <p className="font-black text-lg tracking-tight leading-tight">{n.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
