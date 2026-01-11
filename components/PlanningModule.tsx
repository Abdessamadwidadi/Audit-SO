
import React, { useState, useMemo } from 'react';
import { Plus, CheckCircle2, Calendar, Loader2, Trash2, User, ChevronLeft, ChevronRight, ClipboardList, Inbox, ExternalLink, Briefcase, PlusCircle, AlertCircle, RotateCw, History, Eye, EyeOff } from 'lucide-react';
import { TaskAssignment, Collaborator, UserRole, ServiceType, TaskUrgency } from '../types';
import { formatDateFR } from '../App';

const URGENCY_MAP: Record<TaskUrgency, {label: string, color: string, bg: string}> = {
  normal: { label: 'Normal', color: 'text-slate-500', bg: 'bg-slate-100' },
  urgent: { label: 'Urgent', color: 'text-amber-600', bg: 'bg-amber-100' },
  critique: { label: 'Critique', color: 'text-rose-600', bg: 'bg-rose-100' }
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
  const [taskPole, setTaskPole] = useState<string>(currentUser.department);
  const [urgency, setUrgency] = useState<TaskUrgency>('normal');
  const [deadline, setDeadline] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showAllTasks, setShowAllTasks] = useState(false);

  const isAdminOrManager = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;

  const currentWeek = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - (now.getDay() || 7) + 1 + (weekOffset * 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }, [weekOffset]);

  const filteredTasks = useMemo(() => tasks.filter(t => {
    const taskDateStr = t.deadline;
    const taskDate = new Date(taskDateStr);
    const now = new Date();
    
    // Logique de retard : après 18h le jour de l'échéance ou jours passés
    const deadline18h = new Date(taskDateStr);
    deadline18h.setHours(18, 0, 0, 0);
    const isLate = now > deadline18h && t.status === 'todo';
    
    if (!showAllTasks) {
      const inWeek = taskDate >= currentWeek.start && taskDate <= currentWeek.end;
      if (!inWeek && !isLate) return false;
    }
    
    if (isAdminOrManager && poleFilter !== 'all') {
      if (t.pole?.toLowerCase() !== poleFilter.toLowerCase()) return false;
    }

    if (activeTab === 'mine') return String(t.assignedToId) === String(currentUser.id) && String(t.assignedById) === String(currentUser.id);
    if (activeTab === 'received') return String(t.assignedToId) === String(currentUser.id) && String(t.assignedById) !== String(currentUser.id);
    if (activeTab === 'delegated') return String(t.assignedById) === String(currentUser.id) && String(t.assignedToId) !== String(currentUser.id);
    return false;
  }), [tasks, activeTab, currentUser.id, currentWeek, poleFilter, isAdminOrManager, showAllTasks]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); if (!title.trim()) return; setLoading(true);
    try {
      await onAddTask({ title: title.trim(), assignedToId: isAdminOrManager ? assigneeId : currentUser.id, deadline, pole: isAdminOrManager ? taskPole : currentUser.department, urgency });
      setTitle(''); showNotif('success', "Tâche ajoutée");
    } finally { setLoading(false); }
  };

  const handleReport = async (id: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    await onUpdateTask(id, { deadline: todayStr });
    showNotif('success', "Tâche reportée à aujourd'hui");
  };

  const handleBulkReport = async () => {
    const now = new Date();
    const lates = filteredTasks.filter(t => {
      const d = new Date(t.deadline);
      d.setHours(18,0,0,0);
      return now > d && t.status === 'todo';
    });
    if (lates.length === 0) return;
    const todayStr = now.toISOString().split('T')[0];
    for (const t of lates) {
      await onUpdateTask(t.id, { deadline: todayStr });
    }
    showNotif('success', `${lates.length} tâches reportées`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-widest">Travaux / Mission</label>
            <input type="text" placeholder="Description de la mission..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-[11px] outline-none focus:border-indigo-500 transition-all" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-widest">Urgence</label>
            <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-[11px] outline-none" value={urgency} onChange={e => setUrgency(e.target.value as any)}>
              <option value="normal">Normale</option>
              <option value="urgent">Urgente</option>
              <option value="critique">Critique</option>
            </select>
          </div>
          {isAdminOrManager && (
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-widest">Affectation</label>
              <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-[11px] outline-none" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                <option value={currentUser.id}>Moi-même</option>
                {team.filter(c => c.id !== currentUser.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div className={isAdminOrManager ? "md:col-span-2 space-y-1.5" : "md:col-span-3 space-y-1.5"}>
            <label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-widest">Échéance</label>
            <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-[11px] outline-none" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
          <div className={isAdminOrManager ? "md:col-span-2" : "md:col-span-3"}>
            <button type="submit" disabled={!title.trim() || loading} className="w-full h-12 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" size={16}/> : <Plus size={16}/>} <span>Ajouter</span>
            </button>
          </div>
        </form>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto hide-scrollbar">
          <button onClick={() => setActiveTab('mine')} className={`px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'mine' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}><ClipboardList size={14}/> Perso</button>
          <button onClick={() => setActiveTab('received')} className={`px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'received' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}><Inbox size={14}/> Reçues</button>
          {isAdminOrManager && <button onClick={() => setActiveTab('delegated')} className={`px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'delegated' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}><ExternalLink size={14}/> Déléguées</button>}
        </div>

        <div className="flex items-center gap-4">
           <button onClick={() => setShowAllTasks(!showAllTasks)} className={`px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm border ${showAllTasks ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>
              {showAllTasks ? <Eye size={14}/> : <EyeOff size={14}/>} {showAllTasks ? 'Toutes mes tâches' : 'Vue Hebdo'}
           </button>
           
           {!showAllTasks && (
             <div className="flex items-center gap-4 bg-white px-6 py-2 rounded-2xl border border-slate-100 shadow-sm">
               <button onClick={() => setWeekOffset(prev => prev - 1)} className="p-1 text-slate-400 hover:text-indigo-600 transition-all"><ChevronLeft size={18}/></button>
               <div className="text-center min-w-[150px]"><p className="text-[10px] font-black text-slate-900">{formatDateFR(currentWeek.start.toISOString().split('T')[0])} au {formatDateFR(currentWeek.end.toISOString().split('T')[0])}</p></div>
               <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-1 text-slate-400 hover:text-indigo-600 transition-all"><ChevronRight size={18}/></button>
             </div>
           )}

           {filteredTasks.some(t => { const d = new Date(t.deadline); d.setHours(18,0,0,0); return new Date() > d && t.status === 'todo'; }) && (
             <button onClick={handleBulkReport} className="px-4 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all flex items-center gap-2 shadow-sm"><History size={14}/> Tout reporter</button>
           )}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="p-5 w-16 text-center">Statut</th>
                <th className="p-5">Travaux / Mission</th>
                <th className="p-5">Pôle</th>
                <th className="p-5">Urgence</th>
                <th className="p-5">Échéance</th>
                <th className="p-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTasks.map(t => {
                const now = new Date();
                const d = new Date(t.deadline);
                d.setHours(18,0,0,0);
                const isLate = now > d && t.status === 'todo';
                const urgency = URGENCY_MAP[t.urgency] || URGENCY_MAP.normal;

                return (
                  <tr key={t.id} className={`group text-[11px] transition-colors ${t.status === 'done' ? 'bg-slate-50/50 opacity-60' : isLate ? 'bg-rose-50/30' : 'hover:bg-indigo-50/20'}`}>
                    <td className="p-5 text-center">
                       <button onClick={() => onUpdateTask(t.id, { status: t.status === 'todo' ? 'done' : 'todo' })} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center mx-auto transition-all ${t.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 bg-white group-hover:border-indigo-400'}`}>
                         {t.status === 'done' && <CheckCircle2 size={14} />}
                       </button>
                    </td>
                    <td className="p-5">
                       <p className={`font-black tracking-tight ${t.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{t.title}</p>
                    </td>
                    <td className="p-5">
                       <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md font-black text-[9px] uppercase">{t.pole}</span>
                    </td>
                    <td className="p-5">
                       <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${urgency.bg} ${urgency.color}`}>{urgency.label}</span>
                    </td>
                    <td className="p-5 font-bold">
                       <div className="flex flex-col">
                          <span className={isLate ? 'text-rose-600' : 'text-slate-600'}>{formatDateFR(t.deadline)}</span>
                          {isLate && <span className="text-[8px] font-black uppercase text-rose-500 flex items-center gap-1 mt-0.5 animate-pulse"><AlertCircle size={8}/> En retard</span>}
                       </div>
                    </td>
                    <td className="p-5 text-right">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         {isLate && (
                           <button onClick={() => handleReport(t.id)} title="Reporter à aujourd'hui" className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"><RotateCw size={14}/></button>
                         )}
                         <button onClick={() => onDeleteTask(t.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-all"><Trash2 size={14}/></button>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredTasks.length === 0 && (
            <div className="p-20 text-center">
              <ClipboardList size={40} className="mx-auto text-slate-100 mb-4" />
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Aucune tâche disponible dans cette vue</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanningModule;
