
import React, { useState, useMemo } from 'react';
import { 
  Plus, Loader2, Trash2, Search, 
  CheckCircle, Clock, Calendar, AlertTriangle
} from 'lucide-react';
import { TaskAssignment, Collaborator, UserRole, ServiceType } from '../types';

interface Props {
  currentUser: Collaborator;
  tasks: TaskAssignment[];
  team: Collaborator[]; 
  allCollaborators: Collaborator[];
  onAddTask: (task: Partial<TaskAssignment>) => Promise<void>;
  onUpdateTask: (id: string, updates: Partial<TaskAssignment>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onDeleteTasks: (ids: string[]) => Promise<void>;
  showNotif: (type: 'success' | 'error', msg: string) => void;
  poleFilter: string;
  startDate: string;
  endDate: string;
}

const PlanningModule: React.FC<Props> = ({ 
  currentUser, tasks, allCollaborators, onAddTask, onUpdateTask, onDeleteTask, showNotif, poleFilter, startDate, endDate
}) => {
  const [activeTab, setActiveTab] = useState<'mine' | 'received' | 'delegated'>('mine');
  const [taskSearch, setTaskSearch] = useState('');
  const [loading, setLoading] = useState(false);
  
  // États formulaire
  const [title, setTitle] = useState('');
  const [assignedToId, setAssignedToId] = useState<string>(String(currentUser.id).trim());
  const [deadline, setDeadline] = useState(new Date().toISOString().split('T')[0]);
  const [urgency, setUrgency] = useState<any>('normal');

  const currentId = String(currentUser.id).trim();

  const filteredTasks = useMemo(() => {
    // Étape 1 : Filtrage par recherche, pôle et DATES (De/À)
    let list = tasks.filter(t => {
      const taskDate = t.deadline;
      if (startDate && taskDate < startDate) return false;
      if (endDate && taskDate > endDate) return false;
      if (taskSearch && !t.title.toLowerCase().includes(taskSearch.toLowerCase())) return false;
      if (poleFilter !== 'all' && t.pole?.toLowerCase() !== poleFilter.toLowerCase()) return false;
      return true;
    });

    // Étape 2 : Filtrage par Onglet (Mine / Received / Delegated)
    return list.filter(t => {
      const byId = String(t.assignedById || "").trim();
      const toId = String(t.assignedToId || "").trim();

      if (activeTab === 'mine') {
        // Individuel : Créateur == Moi && Responsable == Moi
        return byId === currentId && toId === currentId;
      }
      if (activeTab === 'received') {
        // Reçus : Responsable == Moi (ou mon Pôle) && Créateur != Moi
        const isForMe = toId === currentId || toId === `POLE_${currentUser.department?.toUpperCase()}`;
        return isForMe && byId !== currentId;
      }
      if (activeTab === 'delegated') {
        // Délégués : Créateur == Moi && Responsable != Moi
        return byId === currentId && toId !== currentId;
      }
      return false;
    });
  }, [tasks, activeTab, currentId, poleFilter, taskSearch, currentUser.department, startDate, endDate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      await onAddTask({ 
        title, 
        assignedToId, 
        deadline, 
        pole: currentUser.department, 
        urgency
      });
      setTitle('');
      showNotif('success', 'Mission ajoutée');
    } catch (err) {
      showNotif('error', 'Erreur création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 text-[#000000]">
      {/* Formulaire de création */}
      <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-xl">
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
          <div className="md:col-span-4 space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Titre de la mission</label>
            <input type="text" required placeholder="Ex: Révision Dossier X..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-black outline-none focus:ring-4 focus:ring-indigo-500/10" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="md:col-span-3 space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Responsable</label>
            <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-black" value={assignedToId} onChange={e => setAssignedToId(e.target.value)}>
              {allCollaborators.filter(c => c.isActive).map(c => <option key={c.id} value={String(c.id).trim()}>{c.name}</option>)}
              <option value="POLE_AUDIT">TOUT LE PÔLE AUDIT</option>
              <option value="POLE_EXPERTISE">TOUT LE PÔLE EXPERTISE</option>
            </select>
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Échéance</label>
            <input type="date" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-black" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
          <div className="md:col-span-3">
            <button type="submit" disabled={loading} className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] shadow-lg hover:bg-slate-900 transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" size={16}/> : <Plus size={16}/>} Créer mission
            </button>
          </div>
        </form>
      </div>

      {/* Tabs et Recherche */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
          {[ {id: 'mine', l: 'Individuel'}, {id: 'received', l: 'Reçues'}, {id: 'delegated', l: 'Déléguées'} ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${activeTab === t.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
              {t.l}
            </button>
          ))}
        </div>
        <div className="relative w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
          <input type="text" placeholder="Rechercher..." className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-[11px] text-black outline-none" value={taskSearch} onChange={e => setTaskSearch(e.target.value)} />
        </div>
      </div>

      {/* Liste des missions */}
      <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#1e293b] text-[10px] font-black uppercase text-white border-b">
            <tr><th className="p-6 w-16 text-center">État</th><th className="p-6">Mission</th><th className="p-6">Responsable</th><th className="p-6 text-center">Date</th><th className="p-6 text-right w-20">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTasks.map(t => {
              const assignedCollab = allCollaborators.find(c => String(c.id).trim() === String(t.assignedToId).trim());
              const isAudit = t.assignedToId === 'POLE_AUDIT' || assignedCollab?.department?.toLowerCase() === 'audit';
              return (
                <tr key={t.id} className={`group text-xs font-bold text-[#000000] hover:bg-slate-50 ${t.status === 'done' ? 'opacity-40 grayscale' : ''}`}>
                  <td className="p-6 text-center">
                    <button onClick={() => onUpdateTask(t.id, {status: t.status === 'todo' ? 'done' : 'todo'})} className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center mx-auto ${t.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 text-slate-300'}`}>
                      {t.status === 'done' && <CheckCircle size={16} />}
                    </button>
                  </td>
                  <td className="p-6 uppercase">{t.title}</td>
                  <td className="p-6">
                    <span className={`px-2 py-1 rounded text-[8px] font-black uppercase text-white ${isAudit ? 'bg-[#0056b3]' : 'bg-orange-500'}`}>
                      {t.assignedToId.startsWith('POLE_') ? t.assignedToId.replace('POLE_', 'PÔLE ') : assignedCollab?.name || "Inconnu"}
                    </span>
                  </td>
                  <td className="p-6 text-center font-black">{new Date(t.deadline).toLocaleDateString('fr-FR')}</td>
                  <td className="p-6 text-right">
                    <button onClick={() => { if(confirm("Supprimer ?")) onDeleteTask(t.id); }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredTasks.length === 0 && (
          <div className="p-20 text-center text-slate-400 font-black uppercase text-[10px] italic">Aucune mission trouvée pour la période sélectionnée</div>
        )}
      </div>
    </div>
  );
};

export default PlanningModule;
