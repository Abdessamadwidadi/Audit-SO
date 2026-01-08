
import React, { useState } from 'react';
import { Plus, CheckCircle2, Calendar, Send, Loader2, Trash2, User, UserCheck, Star, Briefcase } from 'lucide-react';
import { TaskAssignment, Collaborator, UserRole } from '../types';

interface Props {
  currentUser: Collaborator;
  tasks: TaskAssignment[];
  team: Collaborator[];
  onAddTask: (task: Partial<TaskAssignment>) => Promise<void>;
  onUpdateTask: (id: string, status: 'todo' | 'done') => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  // Fix: Added showNotif to Props
  showNotif: (type: 'success' | 'error', msg: string) => void;
}

// Fix: Destructured showNotif from Props
const PlanningModule: React.FC<Props> = ({ currentUser, tasks, team, onAddTask, onUpdateTask, onDeleteTask, showNotif }) => {
  const [taskTitle, setTaskTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState(currentUser?.id || '');
  const [deadline, setDeadline] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'perso' | 'assigned' | 'given'>('perso');

  const isAdminOrManager = currentUser.role !== UserRole.COLLABORATOR;

  // Filtrage intelligent
  const personalTasks = tasks.filter(t => String(t.assignedToId) === String(currentUser.id) && String(t.assignedById) === String(currentUser.id));
  const tasksForMe = tasks.filter(t => String(t.assignedToId) === String(currentUser.id) && String(t.assignedById) !== String(currentUser.id));
  const tasksIGave = tasks.filter(t => String(t.assignedById) === String(currentUser.id) && String(t.assignedToId) !== String(currentUser.id));

  const handleAdd = async () => {
    if (!taskTitle) return;
    setLoading(true);
    await onAddTask({ title: taskTitle, assignedToId: assigneeId, deadline });
    setTaskTitle('');
    setLoading(false);
    // Fix: showNotif is now available from props
    showNotif('success', 'Tâche enregistrée');
  };

  const TaskCard = ({ t, showAssignee = false }: { t: TaskAssignment, showAssignee?: boolean }) => (
    <div className={`p-6 rounded-2xl border transition-all flex items-center justify-between group ${t.status === 'done' ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 shadow-sm hover:border-indigo-300'}`}>
      <div className="flex items-center gap-4">
        <button 
          onClick={() => onUpdateTask(t.id, t.status === 'todo' ? 'done' : 'todo')} 
          className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${t.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 hover:border-indigo-500 text-transparent'}`}
        >
          <CheckCircle2 size={20} className={t.status === 'done' ? 'opacity-100' : 'opacity-0'} />
        </button>
        <div>
          <p className={`font-black text-sm ${t.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{t.title}</p>
          <div className="flex gap-4 mt-1">
            <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><Calendar size={12}/> {t.deadline}</span>
            {showAssignee && (
               <span className="text-[10px] font-black text-indigo-500 uppercase flex items-center gap-1">
                 <User size={12}/> {team.find(c => String(c.id) === String(t.assignedToId))?.name || 'Inconnu'}
               </span>
            )}
          </div>
        </div>
      </div>
      <button onClick={() => onDeleteTask(t.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18}/></button>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Création */}
      <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-200/50">
        <h3 className="text-xl font-black mb-8 flex items-center gap-3 uppercase tracking-tighter text-slate-900">
           <Send size={20} className="text-indigo-600"/> Nouvelle Mission / Tâche
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <input type="text" placeholder="Description..." className="md:col-span-2 p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 ring-indigo-500/10" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} />
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Pour qui ?</label>
            <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
              {team.map(c => <option key={c.id} value={c.id}>{c.id === currentUser.id ? 'Moi-même' : c.name}</option>)}
            </select>
          </div>
          <button onClick={handleAdd} disabled={!taskTitle || loading} className="h-full bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-200 hover:bg-slate-900 transition-all flex items-center justify-center">
            {loading ? <Loader2 className="animate-spin" size={20}/> : 'Ajouter'}
          </button>
        </div>
        <div className="mt-4 flex items-center gap-4">
           <span className="text-[10px] font-black uppercase text-slate-400 ml-2">Échéance :</span>
           <input type="date" className="p-2 bg-slate-50 border rounded-xl font-bold text-xs text-slate-900" value={deadline} onChange={e => setDeadline(e.target.value)} />
        </div>
      </div>

      {/* Navigation Onglets */}
      <div className="flex gap-4 p-2 bg-slate-200/50 rounded-3xl w-fit">
        <button onClick={() => setActiveTab('perso')} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'perso' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Ma To-Do</button>
        <button onClick={() => setActiveTab('assigned')} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'assigned' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Assigné par Cabinet</button>
        {isAdminOrManager && (
          <button onClick={() => setActiveTab('given')} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'given' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Missions Données</button>
        )}
      </div>

      {/* Listes */}
      <div className="space-y-6">
        {activeTab === 'perso' && (
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Star size={14} className="text-amber-500"/> Mes notes personnelles</h4>
            {personalTasks.length > 0 ? personalTasks.map(t => <TaskCard key={t.id} t={t} />) : <p className="p-10 text-center text-slate-300 font-bold uppercase text-[10px] bg-white rounded-3xl border border-dashed">Aucune tâche perso</p>}
          </div>
        )}

        {activeTab === 'assigned' && (
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Briefcase size={14} className="text-indigo-500"/> Travaux confiés par le management</h4>
            {tasksForMe.length > 0 ? tasksForMe.map(t => <TaskCard key={t.id} t={t} />) : <p className="p-10 text-center text-slate-300 font-bold uppercase text-[10px] bg-white rounded-3xl border border-dashed">Rien de prévu pour le moment</p>}
          </div>
        )}

        {activeTab === 'given' && (
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><UserCheck size={14} className="text-emerald-500"/> Suivi des missions envoyées aux collaborateurs</h4>
            {tasksIGave.length > 0 ? tasksIGave.map(t => <TaskCard key={t.id} t={t} showAssignee />) : <p className="p-10 text-center text-slate-300 font-bold uppercase text-[10px] bg-white rounded-3xl border border-dashed">Vous n'avez assigné aucune mission</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanningModule;
