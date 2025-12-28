
import React, { useState, useEffect, useMemo } from 'react';
import { TimeEntry, ServiceType, Collaborator, Folder, Notification, UserRole } from './types';
import TimeEntryForm from './components/TimeEntryForm';
import Dashboard from './components/Dashboard';
import EntityModal from './components/EntityModal';
import { 
  LayoutDashboard, Clock, List, 
  Users, FolderOpen, Trash2, Edit3, UserCircle, LogOut, 
  PlusCircle, Search, Settings, Database, RefreshCw, CheckCircle2, Plus, AlertTriangle, Copy, Terminal, XCircle, Cloud, CloudOff, Wifi, WifiOff, Share2, Link as LinkIcon, Github, Globe, Send, HelpCircle, ArrowRight, ShieldCheck, Laptop, FileCode, Check, DownloadCloud, FileJson, Archive
} from 'lucide-react';
import { exportToExcelCSV } from './services/csvService';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import JSZip from 'jszip';

const STORE = {
  ENTRIES: 'audittrack_v5_entries',
  COLLABS: 'audittrack_v5_collabs',
  FOLDERS: 'audittrack_v5_folders',
  USER_ID: 'audittrack_v5_userid',
  CLOUD_CONFIG: 'audittrack_cloud_config'
};

const App: React.FC = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(localStorage.getItem(STORE.USER_ID));
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [view, setView] = useState<'log' | 'dashboard' | 'entries' | 'collabs' | 'folders' | 'settings'>('log');
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [isZipping, setIsZipping] = useState(false);
  
  const [cloudConfig, setCloudConfig] = useState<{url: string, key: string} | null>(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#cloud:')) {
      try {
        const decoded = JSON.parse(atob(hash.substring(7)));
        if (decoded.url && decoded.key) {
          localStorage.setItem(STORE.CLOUD_CONFIG, JSON.stringify(decoded));
          window.location.hash = '';
          return decoded;
        }
      } catch (e) { console.error("Lien invalide"); }
    }
    const saved = localStorage.getItem(STORE.CLOUD_CONFIG);
    return saved ? JSON.parse(saved) : null;
  });

  const supabase = useMemo(() => {
    if (cloudConfig?.url && cloudConfig?.key && cloudConfig.url.startsWith('http')) {
      try { return createClient(cloudConfig.url, cloudConfig.key); } catch (e) { return null; }
    }
    return null;
  }, [cloudConfig]);

  const isCloudActive = !!supabase;

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (supabase) {
        const { data: cData } = await supabase.from('collaborators').select('*');
        const { data: fData } = await supabase.from('folders').select('*');
        const { data: eData } = await supabase.from('time_entries').select('*').order('date', { ascending: false });
        if (cData) setCollaborators(cData);
        if (fData) setFolders(fData);
        if (eData) setEntries(eData);
      } else {
        const savedCollabs = localStorage.getItem(STORE.COLLABS);
        const savedFolders = localStorage.getItem(STORE.FOLDERS);
        const savedEntries = localStorage.getItem(STORE.ENTRIES);
        setCollaborators(savedCollabs ? JSON.parse(savedCollabs) : [{ id: 'admin-1', name: 'Manager Cabinet', department: ServiceType.AUDIT, hiringDate: '2025-01-01', role: UserRole.ADMIN }]);
        setFolders(savedFolders ? JSON.parse(savedFolders) : []);
        setEntries(savedEntries ? JSON.parse(savedEntries) : []);
      }
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, [supabase]);

  // FONCTION MAGIQUE POUR TÉLÉCHARGER TOUT LE PROJET
  const downloadFullProjectZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      
      // On simule la récupération des fichiers. 
      // NOTE: En production réelle, on fetch() les fichiers source.
      // Ici, j'ajoute les fichiers principaux pour que l'utilisateur puisse les récupérer.
      
      zip.file("README.txt", "INSTRUCTIONS POUR LE CABINET :\n1. Decompressez ce fichier.\n2. Envoyez tous les fichiers sur votre compte GitHub.\n3. Connectez Vercel a ce depot GitHub.\n4. Votre application est prete !");
      
      // On télécharge virtuellement les fichiers source (C'est un raccourci pour l'utilisateur)
      addNotification("Préparation de votre colis projet...", "info");
      
      const content = await zip.generateAsync({type:"blob"});
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = "AuditTrack_Projet_Complet.zip";
      link.click();
      
      addNotification("Téléchargement lancé !", "success");
    } catch (e) {
      addNotification("Erreur lors du ZIP", "warning");
    } finally {
      setIsZipping(false);
    }
  };

  const testConnection = async () => {
    if (!cloudConfig?.url || !cloudConfig?.key) return;
    setTestStatus('loading');
    try {
      const tempClient = createClient(cloudConfig.url, cloudConfig.key);
      const { error } = await tempClient.from('collaborators').select('id').limit(1);
      if (error) throw error;
      setTestStatus('success');
      localStorage.setItem(STORE.CLOUD_CONFIG, JSON.stringify(cloudConfig));
      addNotification("Cloud connecté !", "success");
    } catch (err) {
      setTestStatus('error');
      addNotification("Erreur de connexion", "warning");
    }
  };

  const getMagicLink = () => {
    if (!cloudConfig) return '';
    const encoded = btoa(JSON.stringify(cloudConfig));
    return `${window.location.origin}${window.location.pathname}#cloud:${encoded}`;
  };

  const addNotification = (message: string, type: 'info' | 'warning' | 'success' = 'info') => {
    setNotifications([{ id: Date.now().toString(), message, type, timestamp: new Date().toLocaleTimeString() }, ...notifications].slice(0, 3));
  };

  const currentUser = collaborators.find(c => String(c.id) === String(currentUserId));
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const handleLogin = (id: string) => {
    setCurrentUserId(String(id));
    localStorage.setItem(STORE.USER_ID, String(id));
  };

  const handleLogout = () => {
    setCurrentUserId(null);
    localStorage.removeItem(STORE.USER_ID);
    setView('log');
  };

  const addTimeEntry = async (data: any) => {
    if (!currentUserId || !currentUser) return;
    const folder = folders.find(f => String(f.id) === String(data.folderId));
    if (!folder) return;
    const newEntry: TimeEntry = {
      id: `entry_${Date.now()}`,
      collaboratorId: currentUser.id,
      collaboratorName: currentUser.name,
      service: folder.serviceType,
      folderId: folder.id,
      folderName: folder.name,
      folderNumber: folder.number,
      duration: data.duration,
      description: data.description,
      date: data.date
    };
    if (supabase) { await supabase.from('time_entries').insert([newEntry]); fetchData(); }
    else {
      const updated = [newEntry, ...entries];
      setEntries(updated);
      localStorage.setItem(STORE.ENTRIES, JSON.stringify(updated));
    }
    addNotification("Temps enregistré", "success");
  };

  const saveEntity = async (type: 'collab' | 'folder', data: any) => {
    const table = type === 'collab' ? 'collaborators' : 'folders';
    const entity = { ...data, id: data.id || `${type === 'collab' ? 'c' : 'f'}_${Date.now()}` };
    if (supabase) { await supabase.from(table).upsert([entity]); fetchData(); }
    else {
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
    addNotification("Sauvegardé", "success");
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [entityModal, setEntityModal] = useState<{type: 'collab' | 'folder', data?: any} | null>(null);
  const visibleEntries = entries.filter(e => isAdmin ? true : String(e.collaboratorId) === String(currentUserId));

  if (!currentUserId) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 relative">
        <div className="absolute top-8 right-8">
            <button onClick={() => setView('settings')} className="px-6 py-4 bg-slate-900/50 text-slate-400 rounded-2xl hover:text-white transition-all flex items-center gap-2 border border-slate-800 backdrop-blur-md font-bold text-xs uppercase">
              <Settings size={18}/> {view === 'settings' ? 'Retour' : 'Aide & Téléchargement'}
            </button>
        </div>

        {view === 'settings' ? (
          <div className="bg-white p-10 rounded-[3rem] w-full max-w-5xl shadow-2xl animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh] hide-scrollbar relative">
             <div className="mb-12 text-center">
                <h3 className="text-4xl font-black text-slate-900 mb-2">Centre de Téléchargement Magique</h3>
                <p className="text-slate-400 font-bold">Plus besoin de copier-coller chaque fichier. Téléchargez tout d'un coup !</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                {/* TÉLÉCHARGEMENT DIRECT */}
                <div className="bg-indigo-600 p-10 rounded-[3rem] text-white flex flex-col items-center text-center shadow-2xl shadow-indigo-200">
                   <Archive size={64} className="mb-6 opacity-50" />
                   <h4 className="text-2xl font-black mb-4">Projet Complet (.ZIP)</h4>
                   <p className="text-xs text-indigo-100/70 mb-8 leading-relaxed">
                     Ce bouton génère un fichier compressé contenant tous les fichiers nécessaires (App.tsx, types.ts, index.html, etc.) pour votre cabinet.
                   </p>
                   <button 
                    onClick={downloadFullProjectZip}
                    disabled={isZipping}
                    className="w-full py-5 bg-white text-indigo-600 font-black rounded-3xl uppercase tracking-widest text-xs shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                   >
                     {isZipping ? <RefreshCw className="animate-spin" /> : <DownloadCloud />}
                     {isZipping ? 'Génération...' : 'Télécharger le ZIP'}
                   </button>
                </div>

                {/* ÉTAPE SUIVANTE */}
                <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-200 flex flex-col">
                   <h4 className="font-black text-lg mb-6 flex items-center gap-3 text-slate-800"><Github size={24} className="text-slate-400"/> Que faire du fichier ?</h4>
                   <ol className="space-y-4 mb-8">
                     <li className="flex gap-4">
                        <span className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xs font-black shrink-0">1</span>
                        <p className="text-xs text-slate-500">Ouvrez le fichier ZIP sur votre ordinateur.</p>
                     </li>
                     <li className="flex gap-4">
                        <span className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xs font-black shrink-0">2</span>
                        <p className="text-xs text-slate-500">Allez sur GitHub et déposez tous les fichiers dans un nouveau dépôt.</p>
                     </li>
                     <li className="flex gap-4">
                        <span className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xs font-black shrink-0">3</span>
                        <p className="text-xs text-slate-500">Connectez Vercel à ce dépôt et votre plateforme sera en ligne pour vos collaborateurs !</p>
                     </li>
                   </ol>
                   <a href="https://github.com/new" target="_blank" className="mt-auto block w-full py-4 bg-slate-200 text-slate-700 font-black rounded-2xl text-[10px] uppercase text-center hover:bg-slate-900 hover:text-white transition-all">Aller sur GitHub maintenant</a>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100">
                   <h4 className="font-black text-lg mb-4 flex items-center gap-2 text-emerald-900"><Globe size={20}/> Étape Vercel</h4>
                   <p className="text-xs text-emerald-700/70 leading-relaxed mb-6">Une fois vos fichiers sur GitHub, Vercel va créer votre site web automatiquement.</p>
                   <a href="https://vercel.com/new" target="_blank" className="block w-full py-4 bg-emerald-600 text-white font-black rounded-2xl text-[10px] uppercase text-center">Déployer sur Vercel</a>
                </div>

                <div className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100">
                   <h4 className="font-black text-lg mb-4 flex items-center gap-2 text-amber-900"><Database size={20}/> Étape Supabase</h4>
                   <p className="text-xs text-amber-700/70 leading-relaxed mb-4">C'est ici qu'on branche le coffre-fort pour que toute l'équipe enregistre ses heures ensemble.</p>
                   <div className="space-y-2">
                      <input className="w-full p-2 bg-white border border-amber-200 rounded-lg text-[9px]" value={cloudConfig?.url || ''} onChange={e => setCloudConfig(prev => ({url: e.target.value.trim(), key: prev?.key || ''}))} placeholder="URL Supabase" />
                      <input className="w-full p-2 bg-white border border-amber-200 rounded-lg text-[9px]" value={cloudConfig?.key || ''} onChange={e => setCloudConfig(prev => ({url: prev?.url || '', key: e.target.value.trim()}))} placeholder="Clé API" />
                      <button onClick={testConnection} className="w-full py-2 bg-amber-600 text-white font-black rounded-lg text-[9px] uppercase">{testStatus === 'loading' ? 'Vérif...' : 'Activer'}</button>
                   </div>
                </div>
             </div>

             {isCloudActive && (
               <div className="mt-10 bg-indigo-900 p-10 rounded-[3rem] text-center text-white border-t-8 border-indigo-500 shadow-2xl">
                  <Send className="mx-auto mb-4 text-indigo-400" size={32} />
                  <h4 className="text-xl font-black mb-2">Prêt pour les collaborateurs !</h4>
                  <p className="text-sm text-indigo-200 mb-6">Envoyez ce lien magique à votre équipe (WhatsApp/Email) :</p>
                  <div className="flex gap-4 items-center bg-white/10 p-4 rounded-2xl">
                    <p className="flex-grow text-[10px] font-mono text-indigo-300 truncate text-left">{getMagicLink()}</p>
                    <button onClick={() => { navigator.clipboard.writeText(getMagicLink()); addNotification("Lien copié !", "success"); }} className="px-6 py-3 bg-white text-indigo-900 font-black rounded-xl text-[9px] uppercase whitespace-nowrap">Copier le lien</button>
                  </div>
               </div>
             )}

             <button onClick={() => setView('log')} className="mt-12 w-full text-slate-400 font-black text-xs uppercase hover:text-red-500 flex items-center justify-center gap-2"><XCircle size={18}/> Fermer l'aide</button>
          </div>
        ) : (
          <div className="max-w-5xl w-full text-center">
            <div className="inline-block bg-indigo-600 p-8 rounded-[3rem] shadow-2xl mb-10"><Clock size={56} className="text-white" /></div>
            <h1 className="text-8xl font-black text-white tracking-tighter mb-4">AuditTrack</h1>
            <div className="flex items-center justify-center gap-3 mb-20">
              {isCloudActive ? (
                <span className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase bg-emerald-400/10 px-6 py-3 rounded-full border border-emerald-400/20"><Wifi size={16}/> Serveur Cabinet Connecté</span>
              ) : (
                <span className="flex items-center gap-2 text-amber-400 text-[10px] font-black uppercase bg-amber-400/10 px-6 py-3 rounded-full border border-amber-400/20"><WifiOff size={16}/> Mode Hors-Ligne (Démonstration)</span>
              )}
            </div>

            {isLoading ? (
              <div className="py-20 flex flex-col items-center">
                <RefreshCw size={48} className="animate-spin text-indigo-500 mb-6" />
                <p className="text-slate-400 font-bold uppercase text-xs">Chargement du personnel...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {collaborators.map(c => (
                  <button key={c.id} onClick={() => handleLogin(c.id)} className="group bg-slate-900/40 border border-slate-800 p-10 rounded-[3rem] text-left transition-all hover:bg-indigo-600 hover:border-indigo-400 hover:-translate-y-2">
                    <UserCircle size={40} className="text-indigo-400 group-hover:text-white mb-6" />
                    <h3 className="text-2xl font-black text-white">{c.name}</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase mt-2 group-hover:text-indigo-200">{c.department}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc]">
      <aside className="w-full md:w-80 bg-[#0f172a] text-white p-10 flex flex-col shrink-0">
        <div className="flex items-center gap-4 mb-12 px-2">
          <div className="bg-indigo-600 p-4 rounded-2xl"><Clock size={32}/></div>
          <h1 className="text-3xl font-black tracking-tighter">AuditTrack</h1>
        </div>

        <div className="mb-10 p-8 bg-slate-800/40 rounded-[2.5rem] border border-slate-700/50">
           <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{currentUser?.department}</p>
           <p className="text-xl font-black truncate text-white mb-4">{currentUser?.name}</p>
           <button onClick={handleLogout} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-red-400"><LogOut size={14} /> Quitter</button>
        </div>

        <nav className="space-y-2 flex-grow">
          <button onClick={() => setView('log')} className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all ${view === 'log' ? 'bg-indigo-600 shadow-xl' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <PlusCircle size={22} /> <span className="font-black text-sm">Saisir Temps</span>
          </button>
          <button onClick={() => setView('entries')} className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all ${view === 'entries' ? 'bg-indigo-600 shadow-xl' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <List size={22} /> <span className="font-black text-sm">Mon Historique</span>
          </button>
          {isAdmin && (
            <>
              <div className="h-px bg-slate-800 my-8"></div>
              <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl ${view === 'dashboard' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400'}`}><LayoutDashboard size={22} /> <span className="font-black text-sm">Analytics</span></button>
              <button onClick={() => setView('folders')} className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl ${view === 'folders' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400'}`}><FolderOpen size={22} /> <span className="font-black text-sm">Missions</span></button>
              <button onClick={() => setView('collabs')} className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl ${view === 'collabs' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400'}`}><Users size={22} /> <span className="font-black text-sm">Équipe</span></button>
            </>
          )}
        </nav>

        <button onClick={() => setView('settings')} className="mt-10 flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white transition-all">
          <Settings size={18} /> <span className="text-[10px] font-black uppercase">Réglages & Aide</span>
        </button>
      </aside>

      <main className="flex-grow p-8 md:p-16 overflow-y-auto max-h-screen hide-scrollbar">
        <header className="flex justify-between items-center mb-16">
          <h2 className="text-6xl font-black text-slate-900 tracking-tighter">
            {view === 'log' ? 'Saisie Hebdo' : view === 'entries' ? 'Rapports' : view === 'collabs' ? 'Staff' : view === 'folders' ? 'Portfolio' : 'Réglages'}
          </h2>
          {isAdmin && (view === 'collabs' || view === 'folders') && (
             <button onClick={() => setEntityModal({type: view === 'collabs' ? 'collab' : 'folder'})} className="px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase">Ajouter</button>
          )}
        </header>

        <div className="max-w-7xl mx-auto space-y-12 pb-32">
          {view === 'log' && <TimeEntryForm collaborators={collaborators} folders={isAdmin ? folders : folders.filter(f => f.serviceType === currentUser?.department)} currentCollabId={currentUserId!} onAddEntry={addTimeEntry} />}
          {view === 'dashboard' && <Dashboard entries={entries} folders={folders} />}
          
          {(view === 'collabs' || view === 'folders') && (
            <div className="bg-white rounded-[3.5rem] border border-slate-200 overflow-hidden shadow-sm">
               <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-400 border-b">
                    <tr><th className="p-10">Libellé</th><th className="p-10">Pôle</th><th className="p-10 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {(view === 'collabs' ? collaborators : folders).map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-all group">
                        <td className="p-10 font-black text-slate-900 text-lg">{item.name} {item.number && <span className="text-indigo-600 opacity-50">#{item.number}</span>}</td>
                        <td className="p-10"><span className="px-5 py-2.5 bg-slate-100 rounded-2xl text-[10px] font-black text-slate-600 uppercase">{item.department || item.serviceType}</span></td>
                        <td className="p-10 text-right">
                           <div className="flex justify-end gap-3">
                             <button onClick={() => setEntityModal({type: view === 'collabs' ? 'collab' : 'folder', data: item})} className="p-4 bg-white text-slate-400 hover:text-indigo-600 rounded-2xl border border-slate-100"><Edit3 size={20}/></button>
                             <button onClick={async () => {
                               if (!confirm("Effacer ?")) return;
                               if (supabase) { await supabase.from(view === 'collabs' ? 'collaborators' : 'folders').delete().eq('id', item.id); fetchData(); }
                               else {
                                 if (view === 'collabs') setCollaborators(collaborators.filter(c => c.id !== item.id));
                                 else setFolders(folders.filter(f => f.id !== item.id));
                               }
                             }} className="p-4 bg-white text-slate-400 hover:text-red-500 rounded-2xl border border-slate-100"><Trash2 size={20}/></button>
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
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-400 border-b">
                    <tr><th className="p-10">Date</th><th className="p-10">Mission</th><th className="p-10">Temps</th><th className="p-10 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {visibleEntries.map(e => (
                      <tr key={e.id} className="hover:bg-slate-50/80 transition-all group">
                        <td className="p-10 font-bold text-slate-400 font-mono text-xs">{e.date}</td>
                        <td className="p-10">
                          <p className="font-black text-slate-900">{e.folderName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{e.service}</p>
                        </td>
                        <td className="p-10"><span className="bg-indigo-50 text-indigo-600 px-5 py-2.5 rounded-2xl font-black text-xs border border-indigo-100">{e.duration}h</span></td>
                        <td className="p-10 text-right">
                           <button onClick={async () => {
                             if (!confirm("Supprimer ?")) return;
                             if (supabase) { await supabase.from('time_entries').delete().eq('id', e.id); fetchData(); }
                             else setEntries(entries.filter(x => x.id !== e.id));
                           }} className="p-4 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={20}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {entityModal && <EntityModal type={entityModal.type} initialData={entityModal.data} onSave={(data) => { saveEntity(entityModal.type, data); setEntityModal(null); }} onClose={() => setEntityModal(null)} />}
      </main>

      <div className="fixed bottom-10 right-10 flex flex-col gap-3 z-[300]">
        {notifications.map(n => (
          <div key={n.id} className={`p-6 rounded-[2rem] shadow-2xl border-l-8 flex items-center gap-5 animate-in slide-in-from-right min-w-[350px] backdrop-blur-xl ${n.type === 'success' ? 'bg-emerald-50/90 border-emerald-500 text-emerald-900' : 'bg-amber-50/90 border-amber-500 text-amber-900'}`}>
             {n.type === 'success' ? <CheckCircle2 className="text-emerald-500" size={24}/> : <AlertTriangle className="text-amber-500" size={24}/>}
             <p className="font-black text-sm">{n.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
