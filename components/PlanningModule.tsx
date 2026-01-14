
import React, { useState, useMemo } from 'react';
import { Plus, CheckCircle2, Calendar, Loader2, Trash2, User, ChevronLeft, ChevronRight, ClipboardList, Inbox, ExternalLink, X, Edit3, Save, Clock, RotateCcw, AlertCircle, History, UserPlus } from 'lucide-react';
import { TaskAssignment, Collaborator, UserRole, ServiceType, TaskUrgency } from '../types';
import { formatDateFR } from '../App';
import ConfirmModal from './ConfirmModal';

const URGENCY_MAP: Record<TaskUrgency, {label: string, color: string, bg: string}> = {
  normal: { label: 'Normal', color: 'text-slate-600', bg: 'bg-slate-100' },
  urgent: { label: 'Urgent', color: 'text-amber-700', bg: 'bg-amber-100' },
  critique: { label: 'Critique', color: 'text-rose-700', bg: 'bg-rose-100' }
};

interface Props {
  currentUser: Collaborator;
  tasks: TaskAssignment[];
  team: Collaborator[];
  onAddTask: (task: Partial<TaskAssignment>) => Promise<void>;
  onUpdateTask: (id: string, updates: Partial<TaskAssignment>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  showNotif: (type: 'success' | 'error', msg: string) => void;
  poleFilter?: string;
}

const PlanningModule: React.FC<Props> = ({ currentUser, tasks, team, onAddTask, onUpdateTask, onDeleteTask, showNotif, poleFilter = 'all' }) => {
  const [activeTab, setActiveTab] = useState<'mine' | 'received' | 'delegated'>('mine');
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState(currentUser.id);
  const [urgency, setUrgency] = useState<TaskUrgency>('normal');
  const [deadline, setDeadline] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [editTask, setEditTask] = useState<TaskAssignment | null>(null);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
  
  // State pour la délégation
  const [delegatingTask, setDelegatingTask] = useState<TaskAssignment | null>(null);
  const [targetAssigneeId, setTargetAssigneeId] = useState<string>('');

  const isAdminOrManager = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;

  const getLocalISODate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = useMemo(() => getLocalISODate(new Date()), []);

  const currentWeek = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = today.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday + (weekOffset * 7));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  }, [weekOffset]);

  const sortedTasks = useMemo(() => {
    const filtered = tasks.filter(t => {
      const tId = String(t.assignedToId);
      const bId = String(t.assignedById);
      const cId = String(currentUser.id);
      let matchContext = false;
      if (activeTab === 'mine') matchContext = tId === cId && bId === cId;
      if (activeTab === 'received') matchContext = tId === cId && bId !== cId;
      if (activeTab === 'delegated') matchContext = bId === cId && tId !== cId;
      if (!matchContext) return false;

      if (isAdminOrManager && poleFilter !== 'all' && t.pole?.toLowerCase() !== poleFilter.toLowerCase()) return false;
      
      const taskDateStr = t.deadline;
      const taskDate = new Date(taskDateStr);
      taskDate.setHours(12, 0, 0, 0);
      
      const inThisWeek = taskDate >= currentWeek.start && taskDate <= currentWeek.end;
      const isPastTodo = t.status === 'todo' && taskDateStr < getLocalISODate(currentWeek.start);
      
      return inThisWeek || isPastTodo;
    });

    return filtered.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'todo' ? -1 : 1;
      }
      return a.deadline.localeCompare(b.deadline);
    });
  }, [tasks, activeTab, currentUser.id, currentWeek, poleFilter, isAdminOrManager, showAllTasks, todayStr]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!title.trim()) return; 
    setLoading(true);

    // Détermination du pôle contextuel (Audit ou Expertise)
    let taskPole = currentUser.department;
    if (poleFilter && poleFilter !== 'all') {
      taskPole = poleFilter as ServiceType;
    } else if (isAdminOrManager) {
      // Si en mode global, on prend le pôle de celui à qui on assigne
      taskPole = team.find(c => String(c.id) === String(assigneeId))?.department || currentUser.department;
    }

    try {
      await onAddTask({ 
        title: title.trim(), 
        assignedToId: isAdminOrManager ? assigneeId : currentUser.id, 
        deadline, 
        pole: taskPole, 
        urgency 
      });
      setTitle(''); 
      showNotif('success', "Mission ajoutée");
    } catch (err) {
      showNotif('error', "Erreur");
    } finally { setLoading(false); }
  };

  const handleToggleStatus = async (t: TaskAssignment) => {
    const newStatus = t.status === 'todo' ? 'done' : 'todo';
    await onUpdateTask(t.id, { status: newStatus });
    showNotif('success', newStatus === 'done' ? "Mission terminée" : "Mission réactivée");
  };

  const handleQuickReport = async (task: TaskAssignment) => {
    const current = new Date(task.deadline);
    current.setDate(current.getDate() + 7);
    await onUpdateTask(task.id, { deadline: getLocalISODate(current) });
    showNotif('success', "Reporté à +7 jours");
  };

  const handleDelegate = async () => {
    if (!delegatingTask || !targetAssigneeId) return;
    setLoading(true);
    try {
      // MISE À JOUR STRICTE DU PROPRIÉTAIRE (assignedToId)
      // On remplace l'ID du Manager par l'ID du collaborateur choisi.
      // Le créateur (assignedById) reste le Manager, ce qui fait passer la tâche dans "Déléguées" pour lui.
      await onUpdateTask(delegatingTask.id, { 
        assignedToId: targetAssigneeId
        // Le pôle reste identique comme demandé par la directive de conservation des données
      });
      setDelegatingTask(null);
      setTargetAssigneeId('');
      showNotif('success', "Mission déléguée avec succès");
    } catch (err) {
      showNotif('error', "Erreur lors de la délégation");
    } finally { setLoading(false); }
  };

  const confirmDeletion = async () => {
    if (taskToDeleteId) {
      await onDeleteTask(taskToDeleteId);
      setTaskToDeleteId(null);
      showNotif('success', "Mission supprimée");
    }
  };

  // Liste des collaborateurs éligibles pour la délégation (même pôle que la tâche ou direction)
  const delegateOptions = useMemo(() => {
    if (!delegatingTask) return [];
    return team.filter(c => {
      if (String(c.id) === String(currentUser.id)) return false;
      const isManagement = c.role === UserRole.ADMIN || c.role === UserRole.MANAGER;
      // Filtrage strict : on ne propose que les membres rattachés au pôle de la mission (Audit ou Expertise)
      const matchesPole = c.department === delegatingTask.pole;
      return isManagement || matchesPole;
    });
  }, [team, currentUser, delegatingTask]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {taskToDeleteId && (
        <ConfirmModal 
          title="Supprimer cette mission ?" 
          message="Cette action est irréversible. Voulez-vous vraiment supprimer cette tâche du planning ?" 
          onConfirm={confirmDeletion} 
          onCancel={() => setTaskToDeleteId(null)} 
          confirmLabel="Oui, supprimer" 
        />
      )}

      {/* Modal de Délégation */}
      {delegatingTask && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[500] p-4">
           <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-8 text-center w-full">
                 <div className="w-full">
                    <UserPlus size={40} className="mx-auto text-indigo-600 mb-4" />
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Déléguer la mission</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">{delegatingTask.title}</p>
                    <span className={`inline-block px-2 py-0.5 mt-2 rounded-md font-black text-[8px] uppercase ${delegatingTask.pole?.toLowerCase() === 'audit' ? 'bg-blue-600 text-white' : 'bg-orange-500 text-white'}`}>{delegatingTask.pole}</span>
                 </div>
              </div>
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Choisir un collaborateur ({delegatingTask.pole})</label>
                    <select 
                      className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 ring-indigo-500/10 transition-all"
                      value={targetAssigneeId}
                      onChange={e => setTargetAssigneeId(e.target.value)}
                    >
                      <option value="">-- Sélectionner --</option>
                      {delegateOptions.map(c => <option key={c.id} value={c.id}>{c.name} {c.role !== UserRole.COLLABORATOR ? `(${c.role})` : ''}</option>)}
                    </select>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-10">
                 <button onClick={() => { setDelegatingTask(null); setTargetAssigneeId(''); }} className="p-5 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-600">Annuler</button>
                 <button 
                  disabled={!targetAssigneeId || loading} 
                  onClick={handleDelegate} 
                  className="p-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg flex items-center justify-center gap-2 hover:bg-slate-900 transition-all disabled:opacity-50"
                 >
                   {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16}/>}
                   Confirmer
                 </button>
              </div>
           </div>
        </div>
      )}

      {editTask && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-[500] p-4">
           <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Détails de la Mission</h3>
                 <button onClick={() => setEditTask(null)} className="p-3 bg-slate-100 text-slate-400 hover:text-rose-600 rounded-2xl transition-all"><X size={20}/></button>
              </div>
              <div className="space-y-6">
                <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Titre</label><input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none" value={editTask.title} onChange={e => setEditTask({...editTask, title: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Échéance</label><input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none" value={editTask.deadline} onChange={e => setEditTask({...editTask, deadline: e.target.value})} /></div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Urgence</label>
                    <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none" value={editTask.urgency} onChange={e => setEditTask({...editTask, urgency: e.target.value as any})}><option value="normal">Normale</option><option value="urgent">Urgente</option><option value="critique">Critique</option></select>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-10">
                 <button onClick={() => setEditTask(null)} className="p-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-600">Annuler</button>
                 <button onClick={async () => { await onUpdateTask(editTask.id, { title: editTask.title, deadline: editTask.deadline, urgency: editTask.urgency }); setEditTask(null); showNotif('success', "Modifié"); }} className="p-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg flex items-center justify-center gap-2"><Save size={16}/> Enregistrer</button>
              </div>
           </div>
        </div>
      )}

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4 space-y-1.5"><label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-widest">Nouvelle Mission</label><input type="text" placeholder="Mission à accomplir..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-[11px] outline-none focus:border-indigo-500 transition-all" value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="md:col-span-2 space-y-1.5"><label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-widest">Urgence</label><select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-[11px]" value={urgency} onChange={e => setUrgency(e.target.value as any)}><option value="normal">Normale</option><option value="urgent">Urgente</option><option value="critique">Critique</option></select></div>
          {isAdminOrManager && (
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-widest">Pour</label>
              <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-[11px]" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                <option value={currentUser.id}>Moi</option>
                {team.filter(c => {
                  if (String(c.id) === String(currentUser.id)) return false;
                  // Afficher si c'est un manager/admin OU si ça correspond au pôle filtré
                  const isManagement = c.role === UserRole.ADMIN || c.role === UserRole.MANAGER;
                  const matchesPole = poleFilter === 'all' || c.department?.toLowerCase() === poleFilter.toLowerCase();
                  return isManagement || matchesPole;
                }).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div className={isAdminOrManager ? "md:col-span-2 space-y-1.5" : "md:col-span-3 space-y-1.5"}><label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-widest">Échéance</label><input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-[11px]" value={deadline} onChange={e => setDeadline(e.target.value)} /></div>
          <div className={isAdminOrManager ? "md:col-span-2" : "md:col-span-3"}><button type="submit" disabled={!title.trim() || loading} className="w-full h-12 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2 hover:bg-slate-900 transition-all">{loading ? <Loader2 className="animate-spin" size={16}/> : <Plus size={16}/>} Ajouter</button></div>
        </form>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
          <button onClick={() => setActiveTab('mine')} className={`px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'mine' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}><ClipboardList size={14}/> Mes Tâches</button>
          <button onClick={() => setActiveTab('received')} className={`px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'received' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}><Inbox size={14}/> Reçues</button>
          {isAdminOrManager && <button onClick={() => setActiveTab('delegated')} className={`px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'delegated' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}><ExternalLink size={14}/> Déléguées</button>}
        </div>
        
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-4 bg-white px-6 py-2 rounded-2xl border border-slate-100 shadow-sm">
             <button onClick={() => setWeekOffset(prev => prev - 1)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"><ChevronLeft size={18}/></button>
             <div className="text-center min-w-[220px]"><p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{formatDateFR(getLocalISODate(currentWeek.start))} — {formatDateFR(getLocalISODate(currentWeek.end))}</p></div>
             <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"><ChevronRight size={18}/></button>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
              <tr><th className="p-5 w-16 text-center">Status</th><th className="p-5">Mission</th>{(activeTab === 'received' || activeTab === 'delegated') && <th className="p-5">{activeTab === 'received' ? 'Par' : 'Pour'}</th>}<th className="p-5">Pôle</th><th className="p-5">Urgence</th><th className="p-5">Échéance</th><th className="p-5 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedTasks.map(t => {
                const isFromPast = t.deadline < getLocalISODate(currentWeek.start) && t.status === 'todo';
                const isLateThisWeek = t.status === 'todo' && t.deadline < todayStr && !isFromPast;

                const canModify = isAdminOrManager || String(t.assignedById) === String(currentUser.id);

                return (
                  <tr key={t.id} className={`group text-[11px] transition-all ${t.status === 'done' ? 'bg-slate-50/50 grayscale opacity-50' : (isFromPast || isLateThisWeek) ? 'bg-rose-50/30' : 'hover:bg-indigo-50/20'}`}>
                    <td className="p-5 text-center">
                      <button onClick={() => handleToggleStatus(t)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center mx-auto transition-all ${t.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-indigo-600'}`}>
                        {t.status === 'done' && <CheckCircle2 size={14} />}
                      </button>
                    </td>
                    <td className="p-5">
                      <p className="font-black text-slate-900 uppercase tracking-tight">{t.title}</p>
                      {isFromPast && (
                        <span className="text-[8px] font-black uppercase text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit mt-1">
                          <History size={8}/> REPORTÉ AUTOMATIQUEMENT
                        </span>
                      )}
                      {isLateThisWeek && (
                        <span className="text-[8px] font-black uppercase text-rose-700 bg-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit mt-1">
                          <AlertCircle size={8}/> EN RETARD
                        </span>
                      )}
                    </td>
                    {(activeTab === 'received' || activeTab === 'delegated') && (
                      <td className="p-5 font-bold text-indigo-700 uppercase tracking-tighter">
                        {activeTab === 'received' ? team.find(c => String(c.id) === String(t.assignedById))?.name : team.find(c => String(c.id) === String(t.assignedToId))?.name}
                      </td>
                    )}
                    <td className="p-5"><span className={`px-2 py-0.5 rounded-md font-black text-[9px] uppercase ${t.pole?.toLowerCase() === 'audit' ? 'bg-blue-600 text-white' : 'bg-orange-500 text-white'}`}>{t.pole}</span></td>
                    <td className="p-5"><span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${URGENCY_MAP[t.urgency].bg} ${URGENCY_MAP[t.urgency].color}`}>{URGENCY_MAP[t.urgency].label}</span></td>
                    <td className="p-5 font-bold text-slate-700">{formatDateFR(t.deadline)}</td>
                    <td className="p-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Bouton Déléguer (uniquement dans "Mes Tâches" pour Manager/Admin) */}
                        {activeTab === 'mine' && isAdminOrManager && t.status === 'todo' && (
                          <button 
                            onClick={() => setDelegatingTask(t)} 
                            title="Déléguer cette mission" 
                            className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                          >
                            <UserPlus size={14}/>
                          </button>
                        )}
                        
                        {canModify && (
                          <>
                            {t.status === 'todo' && <button onClick={() => handleQuickReport(t)} title="Reporter à +7 jours" className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-600 hover:text-white transition-all shadow-sm"><RotateCcw size={14}/></button>}
                            <button onClick={() => setEditTask(t)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><Edit3 size={14}/></button>
                            <button onClick={() => setTaskToDeleteId(t.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-all"><Trash2 size={14}/></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sortedTasks.length === 0 && <div className="p-20 text-center text-slate-300 uppercase text-[9px] font-black tracking-widest italic">Rien à signaler</div>}
        </div>
      </div>
    </div>
  );
};

export default PlanningModule;
