
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TimeEntry, ServiceType, Collaborator, Folder, UserRole, TaskAssignment, Attendance } from './types';
import TimeEntryForm from './components/TimeEntryForm';
import Dashboard from './components/Dashboard';
import EntityModal from './components/EntityModal';
import ClockingModule from './components/ClockingModule';
import PlanningModule from './components/PlanningModule';
import { 
  LayoutDashboard, Clock, List, Users, FolderOpen, UserCircle, LogOut, 
  PlusCircle, Loader2, Search, Trash2, Download, Table, Edit3, Filter
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { exportToExcel } from './services/csvService';

const STORE = { USER_ID: 'mgtso_v1_userid' };
const DEFAULT_SUPABASE_URL = "https://cvbovfqbgdchdycqtmpr.supabase.co";
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2Ym92ZnFiZ2RjaGR5Y3F0bXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTcyNDcsImV4cCI6MjA4MjQzMzI0N30.e16pFuNwInvA51q9X1V_0fpAWar8JPVQZD4-tfx0gdk";

const App: React.FC = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => localStorage.getItem(STORE.USER_ID));
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tasks, setTasks] = useState<TaskAssignment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [view, setView] = useState<'log' | 'dashboard' | 'collabs' | 'folders' | 'planning' | 'clocking' | 'history'>('log');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [notif, setNotif] = useState<{type: 'success'|'error', msg: string} | null>(null);
  const [entityModal, setEntityModal] = useState<{type: 'collab' | 'folder', data?: any} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPole, setFilterPole] = useState<string>('all');

  const [loginStep, setLoginStep] = useState<'select' | 'password'>('select');
  const [selectedCollab, setSelectedCollab] = useState<Collaborator | null>(null);
  const [passwordInput, setPasswordInput] = useState('');

  const supabase = useMemo(() => createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY), []);

  const showNotif = useCallback((type: 'success' | 'error', msg: string) => {
    setNotif({ type, msg });
    setTimeout(() => setNotif(null), 3000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const { data: cData } = await supabase.from('collaborators').select('*');
      const { data: fData } = await supabase.from('folders').select('*');
      const { data: eData } = await supabase.from('time_entries').select('*').order('date', { ascending: false });
      const { data: tData } = await supabase.from('tasks').select('*');
      const { data: aData } = await supabase.from('attendance').select('*').order('date', { ascending: false });
      
      setCollaborators(cData?.map(c => ({ ...c, hiringDate: c.hiring_date })) || []);
      setFolders(fData?.map(f => ({ ...f, clientName: f.client_name, serviceType: f.service_type, budgetHours: f.budget_hours })) || []);
      setEntries(eData?.map(e => ({ ...e, collaboratorId: e.collaborator_id, collaboratorName: e.collaborator_name, folderId: e.folder_id, folderName: e.folder_name, folderNumber: e.folder_number, isOvertime: e.is_overtime })) || []);
      setTasks(tData?.map(t => ({ ...t, assignedToId: t.assigned_to_id, assignedById: t.assigned_by_id })) || []);
      setAttendance(aData?.map(a => ({ ...a, collaboratorId: a.collaborator_id, checkIn: a.check_in, checkOut: a.check_out })) || []);
      
      setIsDataLoaded(true);
    } catch (err: any) {
      showNotif('error', "Erreur de connexion base de données");
    }
  }, [supabase, showNotif]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentUser = useMemo(() => 
    collaborators.find(c => String(c.id) === String(currentUserId)),
    [collaborators, currentUserId]
  );

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isManager = currentUser?.role === UserRole.MANAGER;

  // Dossiers visibles selon le pôle et rôle
  const visibleFolders = useMemo(() => {
    if (isAdmin || isManager) return folders;
    return folders.filter(f => f.serviceType === currentUser?.department);
  }, [folders, currentUser, isAdmin, isManager]);

  const filteredFolders = useMemo(() => {
    let list = visibleFolders;
    if ((isAdmin || isManager) && filterPole !== 'all') {
      list = list.filter(f => f.serviceType === filterPole);
    }
    return list.filter(f => 
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      f.number.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [visibleFolders, searchTerm, filterPole, isAdmin, isManager]);

  const handleLogout = () => {
    setCurrentUserId(null);
    setSelectedCollab(null);
    setLoginStep('select');
    setPasswordInput('');
    localStorage.removeItem(STORE.USER_ID);
  };

  const handleLogin = () => {
    if (!selectedCollab) return;
    if (String(selectedCollab.password) === String(passwordInput)) {
      setCurrentUserId(selectedCollab.id);
      localStorage.setItem(STORE.USER_ID, selectedCollab.id);
    } else {
      showNotif('error', 'Code incorrect');
    }
  };

  const handleDeletion = async (id: string, table: string) => {
    if (!confirm('Confirmer la suppression ?')) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) { showNotif('success', "Supprimé"); fetchData(); }
    else showNotif('error', "Échec de suppression");
  };

  const filteredEntries = useMemo(() => {
    let list = entries;
    if (!isAdmin && !isManager) {
      list = list.filter(e => String(e.collaboratorId) === String(currentUserId));
    }
    return list.filter(e => 
      e.collaboratorName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.folderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [entries, isAdmin, isManager, currentUserId, searchTerm]);

  if (!isDataLoaded) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-indigo-500"><Loader2 className="animate-spin" size={48} /></div>;

  if (!currentUserId || !currentUser) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-white">
        <h1 className="text-6xl font-black mb-12 tracking-tighter">Management SO</h1>
        {loginStep === 'select' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl max-h-[60vh] overflow-y-auto p-4 hide-scrollbar">
            {collaborators.map(c => (
              <button key={c.id} onClick={() => { setSelectedCollab(c); setLoginStep('password'); }} className="bg-slate-900/50 p-8 rounded-[2rem] border border-slate-800 hover:border-indigo-500 transition-all text-left">
                <h3 className="text-xl font-bold">{c.name}</h3>
                <p className="text-[10px] uppercase tracking-widest text-indigo-400 mt-2">{c.department}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900 p-12 rounded-[3rem] w-full max-w-md border border-slate-800">
            <h3 className="text-2xl font-black text-center mb-8">{selectedCollab?.name}</h3>
            <input type="password" autoFocus className="w-full p-6 bg-slate-800 rounded-2xl text-center text-4xl mb-8 border border-slate-700 outline-none focus:border-indigo-500 text-white font-black" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            <div className="flex gap-4">
               <button onClick={() => setLoginStep('select')} className="flex-1 py-4 bg-slate-800 rounded-2xl font-bold text-xs uppercase">Retour</button>
               <button onClick={handleLogin} className="flex-[2] py-4 bg-indigo-600 rounded-2xl font-black uppercase text-xs">Valider</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      {notif && <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[1000] px-8 py-4 rounded-2xl text-white font-bold text-xs uppercase tracking-widest shadow-2xl ${notif.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>{notif.msg}</div>}

      <aside className="w-80 bg-[#0f172a] text-white p-10 flex flex-col shrink-0">
        <h1 className="text-xl font-black mb-12">MSO Platform</h1>
        <nav className="space-y-3 flex-grow">
          <button onClick={() => setView('log')} className={`w-full flex items-center gap-4 px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest ${view === 'log' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><PlusCircle size={18}/> Saisie Temps</button>
          <button onClick={() => setView('clocking')} className={`w-full flex items-center gap-4 px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest ${view === 'clocking' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><Clock size={18}/> Pointage</button>
          <button onClick={() => setView('history')} className={`w-full flex items-center gap-4 px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest ${view === 'history' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><Table size={18}/> Historique Temps</button>
          <button onClick={() => setView('planning')} className={`w-full flex items-center gap-4 px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest ${view === 'planning' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><List size={18}/> Ma To-Do</button>
          {(isAdmin || isManager) && (
            <div className="pt-10 space-y-3 border-t border-slate-800 mt-6">
              <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-4 px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest ${view === 'dashboard' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><LayoutDashboard size={18}/> Dashboard</button>
              <button onClick={() => setView('folders')} className={`w-full flex items-center gap-4 px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest ${view === 'folders' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><FolderOpen size={18}/> Dossiers</button>
              <button onClick={() => setView('collabs')} className={`w-full flex items-center gap-4 px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest ${view === 'collabs' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><Users size={18}/> Équipe</button>
            </div>
          )}
        </nav>
        <button onClick={handleLogout} className="mt-auto flex items-center gap-2 text-slate-500 hover:text-red-400 font-bold uppercase text-[9px]"><LogOut size={16}/> Déconnexion</button>
      </aside>

      <main className="flex-grow p-16 overflow-y-auto">
        <header className="mb-12 flex justify-between items-end border-b border-slate-200 pb-10">
          <div>
            <h2 className="text-6xl font-black tracking-tighter uppercase text-slate-900">{view === 'log' ? 'Saisie' : view}</h2>
            <p className="text-indigo-600 font-black text-[11px] uppercase tracking-[0.3em] mt-3">{currentUser.name} • <span className="text-slate-500">{currentUser.role}</span></p>
          </div>
          {(view === 'dashboard' || view === 'history' || view === 'clocking') && (
            <div className="flex gap-4">
               {view === 'history' && (
                 <button onClick={() => exportToExcel('Export_Saisies', [["Collaborateur", "Dossier", "Date", "Heures", "Description"], ...entries.map(e => [e.collaboratorName, e.folderName, e.date, e.duration, e.description])])} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase flex items-center gap-2"><Download size={16}/> Temps (XLS)</button>
               )}
               {view === 'clocking' && (isAdmin || isManager) && (
                 <button onClick={() => exportToExcel('Export_Pointages', [["Collaborateur", "Date", "Entrée", "Sortie"], ...attendance.map(a => [collaborators.find(c => c.id === a.collaboratorId)?.name || '?', a.date, a.checkIn, a.checkOut || '--'])])} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-[10px] uppercase flex items-center gap-2"><Download size={16}/> Pointages (XLS)</button>
               )}
            </div>
          )}
        </header>

        <div className="space-y-8">
          {view === 'log' && <TimeEntryForm collaborators={collaborators} folders={visibleFolders} currentCollabId={currentUserId} existingEntries={entries} onAddEntry={async (d) => {
             const f = folders.find(folder => folder.id === d.folderId);
             const { error } = await supabase.from('time_entries').insert([{ id: `e_${Date.now()}`, collaborator_id: currentUserId, collaborator_name: currentUser.name, folder_id: f?.id, folder_name: f?.name, folder_number: f?.number, duration: d.duration, date: d.date, description: d.description, is_overtime: d.isOvertime }]);
             if (!error) { showNotif('success', "Temps enregistré"); fetchData(); }
             else showNotif('error', "Échec de saisie");
          }} />}
          
          {view === 'history' && (
            <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50 animate-in fade-in zoom-in duration-500">
               <div className="p-8 bg-slate-50 border-b flex justify-between items-center">
                  <div className="relative w-full max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900" size={18}/>
                    <input type="text" placeholder="Rechercher par dossier ou collab..." className="w-full pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-4 ring-indigo-500/10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
               </div>
               <table className="w-full text-left">
                 <thead>
                   <tr className="bg-slate-100 border-b text-[10px] font-black uppercase tracking-widest text-slate-900">
                     <th className="p-8">Date</th>
                     <th className="p-8">Collaborateur</th>
                     <th className="p-8">Dossier</th>
                     <th className="p-8">Travail</th>
                     <th className="p-8 text-center">Durée</th>
                     <th className="p-8 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {filteredEntries.map(e => (
                     <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                       <td className="p-8 font-bold text-slate-900 text-sm">{e.date}</td>
                       <td className="p-8 font-bold text-indigo-900 text-sm">{e.collaboratorName}</td>
                       <td className="p-8 font-bold text-slate-700 text-sm">
                         <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] uppercase font-black text-slate-900">{e.folderNumber}</span> {e.folderName}
                       </td>
                       <td className="p-8 text-slate-900 text-sm max-w-md">{e.description}</td>
                       <td className="p-8 text-center font-black text-indigo-600">{e.duration}h</td>
                       <td className="p-8 text-right">
                         <button onClick={() => handleDeletion(e.id, 'time_entries')} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          )}

          {view === 'dashboard' && <Dashboard entries={entries} folders={folders} attendance={attendance} collaborators={collaborators} />}
          
          {view === 'clocking' && <ClockingModule currentUser={currentUser} collaborators={collaborators} attendance={attendance} onCheckIn={async (t) => {
            await supabase.from('attendance').insert([{ id: `a_${Date.now()}`, collaborator_id: currentUserId, date: new Date().toISOString().split('T')[0], check_in: t }]); fetchData();
          }} onCheckOut={async (id, t) => {
            await supabase.from('attendance').update({ check_out: t }).eq('id', id); fetchData();
          }} />}

          {view === 'planning' && <PlanningModule currentUser={currentUser} tasks={tasks} team={collaborators} showNotif={showNotif} onAddTask={async (t) => {
             await supabase.from('tasks').insert([{ id: `t_${Date.now()}`, title: t.title, assigned_to_id: t.assignedToId, assigned_by_id: currentUserId, deadline: t.deadline, status: 'todo' }]); fetchData();
          }} onUpdateTask={async (id, s) => {
             await supabase.from('tasks').update({ status: s }).eq('id', id); fetchData();
          }} onDeleteTask={async (id) => handleDeletion(id, 'tasks')} />}

          {(view === 'folders' || view === 'collabs') && (
            <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-xl">
               <div className="p-8 bg-slate-50 border-b flex flex-col md:flex-row gap-4 justify-between items-center">
                  <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900" size={18}/>
                      <input type="text" placeholder={`Rechercher ${view === 'folders' ? 'un dossier' : 'un membre'}...`} className="pl-12 pr-6 py-3 bg-white border rounded-xl font-bold text-slate-900 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    {view === 'folders' && (isAdmin || isManager) && (
                      <div className="flex items-center gap-2 bg-white border px-4 py-2 rounded-xl">
                        <Filter size={14} className="text-indigo-600" />
                        <select className="bg-transparent font-bold text-slate-900 outline-none text-xs uppercase" value={filterPole} onChange={e => setFilterPole(e.target.value)}>
                          <option value="all">Tous les Pôles</option>
                          <option value={ServiceType.AUDIT}>Audit</option>
                          <option value={ServiceType.EXPERTISE}>Expertise</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setEntityModal({type: view === 'folders' ? 'folder' : 'collab'})} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] shadow-lg shadow-indigo-200">+ Ajouter</button>
               </div>
              <table className="w-full text-left">
                <thead><tr className="bg-slate-100 border-b text-[10px] font-black uppercase text-slate-900"><th className="p-8">{view === 'folders' ? 'Dossier' : 'Nom'}</th><th className="p-8">Détails</th><th className="p-8 text-right">Actions</th></tr></thead>
                <tbody className="divide-y">
                  {view === 'collabs' && collaborators.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="p-8 font-black text-slate-900">{c.name}</td>
                      <td className="p-8"><span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase">{c.department}</span></td>
                      <td className="p-8 text-right flex justify-end gap-2">
                         <button onClick={() => setEntityModal({type: 'collab', data: c})} className="p-3 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"><Edit3 size={18}/></button>
                         <button onClick={() => handleDeletion(c.id, 'collaborators')} className="p-3 text-slate-300 hover:text-red-500 rounded-xl transition-all"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                  {view === 'folders' && filteredFolders.map(f => (
                    <tr key={f.id} className="hover:bg-slate-50/50">
                      <td className="p-8">
                        <p className="font-black text-slate-900">{f.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{f.number}</p>
                      </td>
                      <td className="p-8">
                        <div className="flex gap-2">
                          <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-lg text-[10px] font-black uppercase">{f.serviceType}</span>
                          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase">{f.budgetHours}h budget</span>
                        </div>
                      </td>
                      <td className="p-8 text-right flex justify-end gap-2">
                         <button onClick={() => setEntityModal({type: 'folder', data: f})} className="p-3 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"><Edit3 size={18}/></button>
                         <button onClick={() => handleDeletion(f.id, 'folders')} className="p-3 text-slate-300 hover:text-red-500 rounded-xl transition-all"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {entityModal && <EntityModal type={entityModal.type} initialData={entityModal.data} onSave={async (data) => {
        const payload = entityModal.type === 'collab' 
          ? { id: data.id || `c_${Date.now()}`, name: data.name, department: data.department, role: data.role, password: data.password, hiring_date: data.hiringDate }
          : { id: data.id || `f_${Date.now()}`, name: data.name, number: data.number, client_name: data.clientName, service_type: data.serviceType, budget_hours: data.budgetHours };
        const { error } = await supabase.from(entityModal.type === 'collab' ? 'collaborators' : 'folders').upsert([payload]);
        if (!error) { showNotif('success', "Enregistré"); setEntityModal(null); fetchData(); }
        else showNotif('error', "Échec de l'enregistrement");
      }} onClose={() => setEntityModal(null)} />}
    </div>
  );
};

export default App;
