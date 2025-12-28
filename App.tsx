
import React, { useState, useEffect, useMemo } from 'react';
import { TimeEntry, ServiceType, Collaborator, Folder, Notification, UserRole } from './types';
import TimeEntryForm from './components/TimeEntryForm';
import Dashboard from './components/Dashboard';
import EntityModal from './components/EntityModal';
import { 
  LayoutDashboard, Clock, List, 
  Users, FolderOpen, Trash2, Edit3, UserCircle, LogOut, 
  PlusCircle, Plus, AlertTriangle, RefreshCw, CheckCircle2, XCircle, Wifi, WifiOff, Send, ExternalLink, Key, Sparkles, Settings
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

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
  const [entityModal, setEntityModal] = useState<{ type: 'collab' | 'folder'; data?: any } | null>(null);
  
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
        if (cData) setCollaborators(cData || []);
        if (fData) setFolders(fData || []);
        if (eData) setEntries(eData || []);
      } else {
        const savedCollabs = localStorage.getItem(STORE.COLLABS);
        const savedFolders = localStorage.getItem(STORE.FOLDERS);
        const savedEntries = localStorage.getItem(STORE.ENTRIES);
        setCollaborators(savedCollabs ? JSON.parse(savedCollabs) : [{ id: 'admin-1', name: 'Manager Cabinet', department: ServiceType.AUDIT, hiringDate: '2025-01-01', role: UserRole.ADMIN }]);
        setFolders(savedFolders ? JSON.parse(savedFolders) : []);
        setEntries(savedEntries ? JSON.parse(savedEntries) : []);
      }
    } catch (err) { 
      console.error(err); 
      addNotification("Erreur de chargement", "warning");
    } finally { 
      setIsLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, [supabase]);

  const visibleEntries = useMemo(() => {
    return entries.filter(e => String(e.collaboratorId) === String(currentUserId));
  }, [entries, currentUserId]);

  const testConnection = async () => {
    if (!cloudConfig?.url || !cloudConfig?.key) return;
    setTestStatus('loading');
    try {
      const tempClient = createClient(cloudConfig.url, cloudConfig.key);
      const { error } = await tempClient.from('collaborators').select('id').limit(1);
      if (error) throw error;
      setTestStatus('success');
      localStorage.setItem(STORE.CLOUD_CONFIG, JSON.stringify(cloudConfig));
      addNotification("Serveur Cabinet connecté !", "success");
      fetchData();
    } catch (err) {
      setTestStatus('error');
      addNotification("Vérifiez vos clés Supabase", "warning");
    }
  };

  const getMagicLink = () => {
    if (!cloudConfig) return '';
    const encoded = btoa(JSON.stringify(cloudConfig));
    return `${window.location.origin}${window.location.pathname}#cloud:${encoded}`;
  };

  const addNotification = (message: string, type: 'info' | 'warning' | 'success' = 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [{ id, message, type, timestamp: new Date().toLocaleTimeString() }, ...prev].slice(0, 3));
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
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
    if (supabase) { 
      const { error } = await supabase.from('time_entries').insert([newEntry]); 
      if (!error) fetchData(); 
    } else {
      const updated = [newEntry, ...entries];
      setEntries(updated);
      localStorage.setItem(STORE.ENTRIES, JSON.stringify(updated));
    }
    addNotification("Temps enregistré", "success");
  };

  const saveEntity = async (type: 'collab' | 'folder', data: any) => {
    const table = type === 'collab' ? 'collaborators' : 'folders';
    const entity = { ...data, id: data.id || `${type === 'collab' ? 'c' : 'f'}_${Date.now()}` };
    if (supabase) { 
      const { error } = await supabase.from(table).upsert([entity]); 
      if (!error) fetchData(); 
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
    addNotification("Données mises à jour", "success");
  };

  if (!currentUserId) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>

        <div className="absolute top-8 right-8 z-50">
            <button onClick={() => setView('settings')} className="px-6 py-4 bg-slate-900/50 text-slate-400 rounded-2xl hover:text-white transition-all flex items-center gap-2 border border-slate-800 backdrop-blur-md font-bold text-xs uppercase shadow-2xl">
              <Key size={18}/> {view === 'settings' ? 'Retour' : 'Aide & Configuration'}
            </button>
        </div>

        {view === 'settings' ? (
          <div className="bg-white p-12 rounded-[3.5rem] w-full max-w-5xl shadow-2xl animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh] hide-scrollbar relative z-10 border border-slate-100">
             <div className="mb-16 text-center">
                <h3 className="text-5xl font-black text-slate-900 mb-4 tracking-tight">Configuration Cabinet</h3>
                <p className="text-slate-500 font-medium text-lg">Suivez ces étapes pour que l'application fonctionne en ligne.</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <div className="bg-indigo-50 p-10 rounded-[3rem] border border-indigo-100 flex flex-col">
                   <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                      <Sparkles size={28}/>
                   </div>
                   <h4 className="font-black text-xl mb-3 text-indigo-950">1. Clé IA (Vercel)</h4>
                   <p className="text-sm text-indigo-700/70 leading-relaxed mb-8 flex-grow">
                     Allez dans les réglages de votre projet sur <b>Vercel</b>, ajoutez une variable d'environnement nommée <code>API_KEY</code> avec votre clé Gemini.
                   </p>
                   <a href="https://aistudio.google.com/app/apikey" target="_blank" className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase text-center hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                      Obtenir Clé Gemini <ExternalLink size={14}/>
                   </a>
                </div>

                <div className="bg-emerald-50 p-10 rounded-[3rem] border border-emerald-100 flex flex-col">
                   <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                      <Clock size={28}/>
                   </div>
                   <h4 className="font-black text-xl mb-3 text-emerald-950">2. Base de Données</h4>
                   <p className="text-sm text-emerald-700/70 leading-relaxed mb-4">Collez ici les clés trouvées dans <b>Settings &gt; API</b> sur votre projet Supabase.</p>
                   <div className="space-y-2 mb-6">
                      <input className="w-full p-3 bg-white border border-emerald-200 rounded-xl text-[10px]" value={cloudConfig?.url || ''} onChange={e => setCloudConfig(prev => ({url: e.target.value.trim(), key: prev?.key || ''}))} placeholder="URL Supabase (https://...)" />
                      <input className="w-full p-3 bg-white border border-emerald-200 rounded-xl text-[10px]" value={cloudConfig?.key || ''} onChange={e => setCloudConfig(prev => ({url: prev?.url || '', key: e.target.value.trim()}))} placeholder="Clé anon public" />
                      <button onClick={testConnection} className="w-full py-3 bg-emerald-600 text-white font-black rounded-xl text-[10px] uppercase hover:bg-emerald-700 transition-all">Connecter & Sauvegarder</button>
                   </div>
                </div>
             </div>

             {isCloudActive && (
               <div className="bg-slate-900 p-10 rounded-[3rem] text-white text-center shadow-2xl">
                  <Send className="mx-auto mb-4 text-indigo-400" size={32} />
                  <h4 className="text-xl font-black mb-2">Prêt pour l'équipe !</h4>
                  <p className="text-sm text-slate-400 mb-8">Envoyez ce lien magique à vos collaborateurs pour les connecter en 1 clic :</p>
                  <div className="flex gap-4 items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                    <p className="flex-grow text-[9px] font-mono text-indigo-300 truncate text-left">{getMagicLink()}</p>
                    <button onClick={() => { navigator.clipboard.writeText(getMagicLink()); addNotification("Lien copié !", "success"); }} className="px-6 py-3 bg-indigo-600 text-white font-black rounded-xl text-[9px] uppercase">Copier</button>
                  </div>
               </div>
             )}

             <button onClick={() => setView('log')} className="mt-12 w-full text-slate-400 font-black text-xs uppercase hover:text-red-500 flex items-center justify-center gap-2 py-4"><XCircle size={18}/> Fermer</button>
          </div>
        ) : (
          <div className="max-w-5xl w-full text-center animate-in fade-in slide-in-from-bottom-10 duration-700">
            <div className="inline-block bg-indigo-600 p-10 rounded-[3.5rem] shadow-2xl mb-12 border-4 border-white/10"><Clock size={64} className="text-white" /></div>
            <h1 className="text-9xl font-black text-white tracking-tighter mb-4 select-none">AuditTrack</h1>
            
            <div className="flex items-center justify-center gap-3 mb-24">
              {isCloudActive ? (
                <span className="flex items-center gap-2 text-emerald-400 text-[11px] font-black uppercase tracking-[0.3em] bg-emerald-400/10 px-8 py-4 rounded-full border border-emerald-400/20"><Wifi size={18} className="animate-pulse"/> Cabinet Connecté</span>
              ) : (
                <span className="flex items-center gap-2 text-amber-400 text-[11px] font-black uppercase tracking-[0.3em] bg-amber-400/10 px-8 py-4 rounded-full border border-amber-400/20"><WifiOff size={18}/> Mode Local (Démo)</span>
              )}
            </div>

            {isLoading ? (
              <div className="py-20 flex flex-col items-center">
                <RefreshCw size={56} className="animate-spin text-indigo-500 mb-8" />
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Authentification...</p>
              </div>
            ) : collaborators.length === 0 ? (
               <div className="bg-slate-900/50 p-12 rounded-[3.5rem] border border-slate-800 max-w-xl mx-auto">
                  <AlertTriangle className="text-amber-500 mx-auto mb-6" size={48} />
                  <h3 className="text-white text-xl font-black mb-4">Aucun collaborateur trouvé</h3>
                  <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                    Si c'est votre premier lancement, cliquez sur "Aide" en haut à droite pour configurer votre base de données Supabase.
                  </p>
                  <button onClick={() => setView('settings')} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase">Configurer le Cloud</button>
               </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {collaborators.map(c => (
                  <button key={c.id} onClick={() => handleLogin(c.id)} className="group bg-slate-900/40 backdrop-blur-md border border-slate-800 p-12 rounded-[3.5rem] text-left transition-all hover:bg-indigo-600 hover:border-indigo-400 hover:-translate-y-3 shadow-2xl hover:shadow-indigo-500/40">
                    <UserCircle size={48} className="text-indigo-400 group-hover:text-white mb-8 transition-colors" />
                    <h3 className="text-3xl font-black text-white">{c.name}</h3>
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mt-3 group-hover:text-indigo-200">{c.department}</p>
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
        <div className="flex items-center gap-4 mb-16 px-2">
          <div className="bg-indigo-600 p-4 rounded-2xl"><Clock size={32}/></div>
          <h1 className="text-3xl font-black tracking-tighter">AuditTrack</h1>
        </div>

        <div className="mb-12 p-8 bg-slate-800/40 rounded-[2.5rem] border border-slate-700/50">
           <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{currentUser?.department}</p>
           <p className="text-2xl font-black truncate text-white mb-6">{currentUser?.name}</p>
           <button onClick={handleLogout} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-red-400"><LogOut size={16} /> Quitter</button>
        </div>

        <nav className="space-y-2 flex-grow">
          <button onClick={() => setView('log')} className={`w-full flex items-center gap-4 px-6 py-6 rounded-2xl transition-all ${view === 'log' ? 'bg-indigo-600 shadow-2xl text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <PlusCircle size={24} /> <span className="font-black text-sm">Saisir Heures</span>
          </button>
          <button onClick={() => setView('entries')} className={`w-full flex items-center gap-4 px-6 py-6 rounded-2xl transition-all ${view === 'entries' ? 'bg-indigo-600 shadow-2xl text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
            <List size={24} /> <span className="font-black text-sm">Mon Journal</span>
          </button>
          {isAdmin && (
            <>
              <div className="h-px bg-slate-800 my-10 mx-6"></div>
              <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-4 px-6 py-6 rounded-2xl transition-all ${view === 'dashboard' ? 'bg-slate-800 text-indigo-400 shadow-lg' : 'text-slate-400 hover:text-white'}`}><LayoutDashboard size={24} /> <span className="font-black text-sm">Analytique</span></button>
              <button onClick={() => setView('folders')} className={`w-full flex items-center gap-4 px-6 py-6 rounded-2xl transition-all ${view === 'folders' ? 'bg-slate-800 text-indigo-400 shadow-lg' : 'text-slate-400 hover:text-white'}`}><FolderOpen size={24} /> <span className="font-black text-sm">Portefeuille</span></button>
              <button onClick={() => setView('collabs')} className={`w-full flex items-center gap-4 px-6 py-6 rounded-2xl transition-all ${view === 'collabs' ? 'bg-slate-800 text-indigo-400 shadow-lg' : 'text-slate-400 hover:text-white'}`}><Users size={24} /> <span className="font-black text-sm">Effectifs</span></button>
            </>
          )}
        </nav>

        <button onClick={() => setView('settings')} className="mt-12 flex items-center gap-3 px-6 py-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white transition-all shadow-xl">
          <Settings size={20} /> <span className="text-[10px] font-black uppercase tracking-widest">Réglages</span>
        </button>
      </aside>

      <main className="flex-grow p-10 md:p-20 overflow-y-auto max-h-screen hide-scrollbar">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-20">
          <h2 className="text-7xl font-black text-slate-900 tracking-tighter">
            {view === 'log' ? 'Nouvelle Saisie' : view === 'entries' ? 'Mon Journal' : view === 'collabs' ? 'Effectifs' : view === 'folders' ? 'Missions' : 'Aide'}
          </h2>
          {isAdmin && (view === 'collabs' || view === 'folders') && (
             <button onClick={() => setEntityModal({type: view === 'collabs' ? 'collab' : 'folder'})} className="px-12 py-6 bg-indigo-600 text-white rounded-[2.5rem] font-black text-xs uppercase shadow-2xl hover:-translate-y-1 transition-all">Ajouter</button>
          )}
        </header>

        <div className="max-w-7xl mx-auto space-y-16 pb-40">
          {view === 'log' && <TimeEntryForm collaborators={collaborators} folders={isAdmin ? folders : folders.filter(f => f.serviceType === currentUser?.department)} currentCollabId={currentUserId!} onAddEntry={addTimeEntry} />}
          {view === 'dashboard' && <Dashboard entries={entries} folders={folders} />}
          
          {(view === 'collabs' || view === 'folders') && (
            <div className="bg-white rounded-[3.5rem] border border-slate-200 overflow-hidden shadow-sm">
               <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[11px] font-black uppercase text-slate-400 border-b">
                    <tr><th className="p-12">Désignation</th><th className="p-12">Secteur</th><th className="p-12 text-right">Gestion</th></tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {(view === 'collabs' ? collaborators : folders).map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-all group">
                        <td className="p-12">
                           <div className="flex items-center gap-4">
                              <p className="font-black text-slate-900 text-xl">{item.name}</p>
                              {item.number && <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase">#{item.number}</p>}
                           </div>
                        </td>
                        <td className="p-12"><span className="px-6 py-3 bg-slate-100 rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-widest">{item.department || item.serviceType}</span></td>
                        <td className="p-12 text-right">
                           <div className="flex justify-end gap-3">
                             <button onClick={() => setEntityModal({type: view === 'collabs' ? 'collab' : 'folder', data: item})} className="p-5 bg-white text-slate-400 hover:text-indigo-600 rounded-2xl border border-slate-100 shadow-sm transition-all"><Edit3 size={20}/></button>
                             <button onClick={async () => {
                               if (!confirm("Effacer ?")) return;
                               if (supabase) { await supabase.from(view === 'collabs' ? 'collaborators' : 'folders').delete().eq('id', item.id); fetchData(); }
                               else {
                                 if (view === 'collabs') setCollaborators(collaborators.filter(c => c.id !== item.id));
                                 else setFolders(folders.filter(f => f.id !== item.id));
                               }
                             }} className="p-5 bg-white text-slate-400 hover:text-red-500 rounded-2xl border border-slate-100 shadow-sm transition-all"><Trash2 size={20}/></button>
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
                  <thead className="bg-slate-50/50 text-[11px] font-black uppercase text-slate-400 border-b">
                    <tr><th className="p-12">Date</th><th className="p-12">Dossier</th><th className="p-12">Durée</th><th className="p-12 text-right">Action</th></tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {visibleEntries.map(e => (
                      <tr key={e.id} className="hover:bg-slate-50 transition-all group">
                        <td className="p-12 font-bold text-slate-400 font-mono text-xs">{e.date}</td>
                        <td className="p-12">
                          <p className="font-black text-slate-900 text-lg mb-1">{e.folderName}</p>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{e.description}</p>
                        </td>
                        <td className="p-12"><span className="bg-indigo-50 text-indigo-600 px-6 py-3 rounded-2xl font-black text-xs border border-indigo-100">{e.duration}h</span></td>
                        <td className="p-12 text-right">
                           <button onClick={async () => {
                             if (!confirm("Supprimer ?")) return;
                             if (supabase) { await supabase.from('time_entries').delete().eq('id', e.id); fetchData(); }
                             else setEntries(entries.filter(x => x.id !== e.id));
                           }} className="p-5 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={20}/></button>
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

      <div className="fixed bottom-12 right-12 flex flex-col gap-4 z-[300]">
        {notifications.map(n => (
          <div key={n.id} className={`p-8 rounded-[2.5rem] shadow-2xl border-l-[12px] flex items-center gap-6 animate-in slide-in-from-right min-w-[400px] backdrop-blur-2xl ${n.type === 'success' ? 'bg-emerald-50/95 border-emerald-500 text-emerald-900' : 'bg-amber-50/95 border-amber-500 text-amber-900'}`}>
             {n.type === 'success' ? <CheckCircle2 className="text-emerald-500" size={32}/> : <AlertTriangle className="text-amber-500" size={32}/>}
             <div>
               <p className="font-black text-lg tracking-tight">{n.message}</p>
               <p className="text-[10px] font-bold uppercase opacity-40">{n.timestamp}</p>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
