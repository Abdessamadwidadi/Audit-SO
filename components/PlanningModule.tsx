
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, CheckCircle2, Loader2, Trash2, Search, 
  AlertCircle, X, CheckCircle, ChevronDown, Users as UsersIcon,
  CheckSquare, Square, Clock, Calendar, AlertTriangle, UserPlus
} from 'lucide-react';
import { TaskAssignment, Collaborator, UserRole, ServiceType, TaskUrgency } from '../types';
import ConfirmModal from './ConfirmModal';

interface Props {
  currentUser: Collaborator;
  tasks: TaskAssignment[];
  team: Collaborator[];
  onAddTask: (task: Partial<TaskAssignment>) => Promise<void>;
  onUpdateTask: (id: string, updates: Partial<TaskAssignment>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  showNotif: (type: 'success' | 'error', msg: string) => void;
  poleFilter: string;
  startDate: string;
  endDate: string;
}

const PlanningModule: React.FC<Props> = ({ 
  currentUser, tasks, team, onAddTask, onUpdateTask, onDeleteTask, showNotif, poleFilter, startDate, endDate
}) => {
  const [activeTab, setActiveTab] = useState<'mine' | 'received' | 'delegated'>('mine');
  const [taskSearch, setTaskSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showOnlyRemaining, setShowOnlyRemaining] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [assignedToIds, setAssignedToIds] = useState<string[]>([currentUser.id]);
  const [urgency, setUrgency] = useState<TaskUrgency>('normal');
  const [deadline, setDeadline] = useState(new Date().toISOString().split('T')[0]);
  const [isFormDropdownOpen, setIsFormDropdownOpen] = useState(false);

  // Reassign State
  const [reassigningTaskId, setReassigningTaskId] = useState<string | null>(null);
  const [newAssignments, setNewAssignments] = useState<string[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFormDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isAdminOrManager = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;

  const isIdInCsv = (csv: string, targetId: string, userDept?: ServiceType) => {
    const ids = (csv || "").split(',').map(id => id.trim().toLowerCase()).filter(Boolean);
    const target = targetId.trim().toLowerCase();
    if (ids.includes(target)) return true;
    if (ids.includes('pole_audit') && userDept === ServiceType.AUDIT) return true;
    if (ids.includes('pole_expertise') && userDept === ServiceType.EXPERTISE) return true;
    return false;
  };

  const displayTasks = useMemo(() => {
    return tasks.filter(t => {
      // 1. Filtre par pôle
      if (poleFilter !== 'all' && t.pole?.toLowerCase() !== poleFilter.toLowerCase()) return false;
      // 2. Filtre par recherche texte
      if (taskSearch.trim() && !t.title.toLowerCase().includes(taskSearch.toLowerCase())) return false;
      
      // Suppression du filtre de date restrictif (startDate/endDate) pour afficher tout le planning

      const creatorId = String(t.assignedById || "").trim().toLowerCase();
      const currentId = String(currentUser.id || "").trim().toLowerCase();
      const csv = t.assignedToId || "";
      const taskAssignedIds = csv.split(',').map(i => i.trim().toLowerCase()).filter(Boolean);
      
      const amIExplicitlyResponsible = taskAssignedIds.includes(currentId);
      const amIResponsibleByPole = isIdInCsv(csv, currentId, currentUser.department);
      const isActuallyAssignedToMe = amIExplicitlyResponsible || amIResponsibleByPole;
      
      const isMeCreator = creatorId === currentId;

      if (activeTab === 'mine') {
        // Tâches créées par moi POUR moi
        return isMeCreator && isActuallyAssignedToMe;
      } 
      if (activeTab === 'received') {
        // Tâches créées par AUTRUI pour moi (Indiv ou Pôle)
        return !isMeCreator && isActuallyAssignedToMe;
      }
      if (activeTab === 'delegated') {
        // Tâches créées par moi POUR autrui (et je ne suis pas dedans)
        return isMeCreator && !isActuallyAssignedToMe;
      }
      return true;
    }).filter(t => !showOnlyRemaining || t.status === 'todo');
  }, [tasks, activeTab, poleFilter, taskSearch, currentUser, showOnlyRemaining]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    if (currentUser.role === UserRole.COLLABORATOR) {
        if (assignedToIds.length !== 1 || assignedToIds[0] !== currentUser.id) {
            showNotif('error', "Un collaborateur ne peut s'assigner que lui-même.");
            return;
        }
    }

    setLoading(true);
    try {
      await onAddTask({
        title: title.trim(),
        assignedToId: assignedToIds.join(','),
        deadline,
        pole: (poleFilter !== 'all' ? poleFilter : currentUser.department),
        urgency,
        status: 'todo'
      });
      setTitle(''); 
      setAssignedToIds([currentUser.id]); 
      setIsFormDropdownOpen(false);
      showNotif('success', "Mission créée");
    } catch (err) { showNotif('error', "Erreur"); }
    finally { setLoading(false); }
  };

  const canDeleteTask = (task: TaskAssignment) => {
    if (currentUser.role === UserRole.ADMIN) return true;
    return String(task.assignedById).trim().toLowerCase() === String(currentUser.id).trim().toLowerCase();
  };

  const handleMassDelete = async () => {
    const deletableIds = selectedIds.filter(id => {
      const task = tasks.find(t => t.id === id);
      return task && canDeleteTask(task);
    });

    if (deletableIds.length === 0) {
      showNotif('error', "Seul le donneur d'ordre ou l'admin peut supprimer.");
      return;
    }

    if (!window.confirm(`Supprimer ${deletableIds.length} missions ?`)) return;
    setLoading(true);
    try {
      for (const id of deletableIds) await onDeleteTask(id);
      setSelectedIds([]); showNotif('success', 'Missions supprimées');
    } catch (e) { showNotif('error', 'Erreur suppression'); }
    finally { setLoading(false); }
  };

  const getCollabInfo = (id: string) => {
    const cleanId = id.trim().toLowerCase();
    if (cleanId === 'pole_audit') return { name: 'Pôle Audit', dept: ServiceType.AUDIT };
    if (cleanId === 'pole_expertise') return { name: 'Pôle Expertise', dept: ServiceType.EXPERTISE };
    const found = team.find(c => String(c.id).trim().toLowerCase() === cleanId);
    return found ? { name: found.name, dept: found.department } : { name: "INCONNU", dept: ServiceType.EXPERTISE };
  };

  const getUrgencyLabel = (u: string) => {
    switch (u) {
      case 'critique': return 'Urgente';
      case 'urgent': return 'Haute';
      case 'normal': return 'Normale';
      default: return 'Faible';
    }
  };

  const handleReassign = async (taskId: string) => {
    if (newAssignments.length === 0) return;
    setLoading(true);
    try {
      await onUpdateTask(taskId, { assignedToId: newAssignments.join(',') });
      setReassigningTaskId(null);
      setNewAssignments([]);
      showNotif('success', "Mission réassignée");
    } catch (err) { showNotif('error', "Erreur de réaffectation"); }
    finally { setLoading(false); }
  };

  const toggleAssignment = (id: string, currentList: string[], setter: (val: string[]) => void) => {
    if (currentList.includes(id)) {
      setter(currentList.filter(i => i !== id));
    } else {
      setter([...currentList, id]);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in text-black">
      {taskToDeleteId && <ConfirmModal title="Supprimer ?" message="Seul le créateur ou l'admin peut supprimer." onConfirm={async () => { await onDeleteTask(taskToDeleteId); setTaskToDeleteId(null); showNotif('success', 'Supprimé'); }} onCancel={() => setTaskToDeleteId(null)} />}

      <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-xl relative">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600 rounded-l-[2rem]"></div>
        <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
          <div className="md:col-span-4 space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Intitulé de la mission</label>
            <input type="text" required placeholder="Ex: Révision..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-black text-xs outline-none focus:border-indigo-600" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          
          <div className="md:col-span-3 space-y-2 relative" ref={dropdownRef}>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Responsables ({assignedToIds.length})</label>
            <div 
              onClick={() => currentUser.role !== UserRole.COLLABORATOR && setIsFormDropdownOpen(!isFormDropdownOpen)}
              className={`w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl min-h-[52px] flex flex-wrap gap-1.5 items-center cursor-pointer ${currentUser.role === UserRole.COLLABORATOR ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
                {assignedToIds.map(id => {
                  const info = getCollabInfo(id);
                  return (
                    <div key={id} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase text-white ${info.dept?.toLowerCase() === 'audit' ? 'bg-[#0056b3]' : 'bg-orange-500'}`}>
                      {info.name.split(' ')[0]}
                      {currentUser.role !== UserRole.COLLABORATOR && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); setAssignedToIds(prev => prev.filter(i => i !== id)); }}><X size={10}/></button>
                      )}
                    </div>
                  );
                })}
                {assignedToIds.length === 0 && <span className="text-slate-400 text-[10px]">Choisir...</span>}
                <ChevronDown size={14} className="ml-auto text-slate-300" />
            </div>
            {isFormDropdownOpen && (
              <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 shadow-2xl rounded-2xl p-2 z-[999] max-h-60 overflow-y-auto">
                <div className="p-2 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b mb-1">Équipe</div>
                {team.map(c => (
                  <div key={c.id} onClick={() => toggleAssignment(c.id, assignedToIds, setAssignedToIds)} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${assignedToIds.includes(c.id) ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-900'}`}>
                    <span className="text-[10px] font-bold">{c.name}</span>
                    {assignedToIds.includes(c.id) ? <CheckCircle size={16} className="text-indigo-600" /> : <div className="w-4 h-4 border-2 border-slate-200 rounded-full"></div>}
                  </div>
                ))}
                <div className="p-2 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-t mt-2 mb-1">Pôles</div>
                {['pole_audit', 'pole_expertise'].map(pid => (
                  <div key={pid} onClick={() => toggleAssignment(pid, assignedToIds, setAssignedToIds)} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${assignedToIds.includes(pid) ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-900'}`}>
                    <span className="text-[10px] font-black uppercase">{pid.replace('_', ' ')}</span>
                    {assignedToIds.includes(pid) ? <CheckCircle size={16} className="text-indigo-600" /> : <div className="w-4 h-4 border-2 border-slate-200 rounded-full"></div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-3 grid grid-cols-2 gap-3">
             <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Échéance</label><input type="date" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-black text-xs" value={deadline} onChange={e => setDeadline(e.target.value)} /></div>
             <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Priorité</label><select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-black text-xs" value={urgency} onChange={e => setUrgency(e.target.value as any)}><option value="normal">Normale</option><option value="urgent">Haute</option><option value="critique">Urgente</option></select></div>
          </div>
          <div className="md:col-span-2"><button type="submit" className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl flex items-center justify-center gap-2 transition-all hover:bg-slate-900">{loading ? <Loader2 className="animate-spin" size={16}/> : <Plus size={16}/>} Créer</button></div>
        </form>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          {['mine', 'received', 'delegated'].map(t => (
            <button key={t} onClick={() => setActiveTab(t as any)} className={`px-6 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all ${activeTab === t ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>
              {t === 'mine' ? 'Individuel' : t === 'received' ? 'REÇUS' : 'Déléguées'}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
           <button onClick={() => setShowOnlyRemaining(!showOnlyRemaining)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${showOnlyRemaining ? 'bg-slate-900 text-white' : 'bg-white border text-slate-400'}`}>À faire uniquement</button>
           {selectedIds.length > 0 && <button onClick={handleMassDelete} className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase flex items-center gap-2 shadow-xl animate-in slide-in-from-right transition-all hover:bg-rose-700"><Trash2 size={14}/> Supprimer ({selectedIds.length})</button>}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl text-black">
        <table className="w-full text-left table-fixed">
          <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-500">
            <tr>
              <th className="p-6 w-16 text-center"><button onClick={() => setSelectedIds(selectedIds.length === displayTasks.length ? [] : displayTasks.map(t => t.id))}>{selectedIds.length === displayTasks.length && displayTasks.length > 0 ? <CheckSquare size={18} className="text-indigo-600"/> : <Square size={18}/>}</button></th>
              <th className="p-6 text-center w-20">État</th>
              <th className="p-6">Mission / Dossier</th>
              <th className="p-6 text-center w-28">Priorité</th>
              <th className="p-6 text-center w-32">Échéance</th>
              <th className="p-6">RESPONSABLE(S)</th>
              <th className="p-6">Donneur d'ordre</th>
              <th className="p-6 text-right w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayTasks.map(task => {
              const assignedIds = (task.assignedToId || "").split(',').map(id => id.trim()).filter(Boolean);
              const isSelected = selectedIds.includes(task.id);
              const deadlineDate = new Date(task.deadline);
              const now = new Date();
              const diffHours = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
              const isUrgentDue = task.status === 'todo' && diffHours < 24 && diffHours > -24;
              const isOverdue = task.status === 'todo' && deadlineDate < now && !isUrgentDue;
              const isHighPriority = task.urgency === 'critique' || task.urgency === 'urgent';
              const canDelete = canDeleteTask(task);
              const isReassigning = reassigningTaskId === task.id;

              return (
                <tr key={task.id} className={`group transition-all text-xs ${task.status === 'done' ? 'opacity-40 grayscale bg-slate-50/50' : isSelected ? 'bg-indigo-50/50' : 'hover:bg-indigo-50/20'}`}>
                  <td className="p-6 text-center"><button onClick={() => setSelectedIds(prev => prev.includes(task.id) ? prev.filter(i => i !== task.id) : [...prev, task.id])}>{isSelected ? <CheckSquare size={18} className="text-indigo-600"/> : <Square size={18}/>}</button></td>
                  <td className="p-6 text-center"><button onClick={() => onUpdateTask(task.id, {status: task.status === 'todo' ? 'done' : 'todo'})} className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center mx-auto transition-all ${task.status === 'done' ? 'border-emerald-500 text-emerald-500 bg-emerald-50' : 'border-slate-200 text-slate-300 hover:border-emerald-500'}`}>{task.status === 'done' ? <CheckCircle size={20} /> : <Clock size={20} />}</button></td>
                  <td className="p-6 font-black uppercase text-black break-words leading-tight">
                    <div className="flex flex-col gap-1.5">
                      {task.title}
                      {(isUrgentDue || task.urgency === 'critique') && <span className="w-fit flex items-center gap-1 px-2 py-1 bg-rose-600 text-white rounded text-[8px] font-black animate-pulse shadow-[0_0_12px_rgba(225,29,72,0.8)]"><AlertTriangle size={10}/> URGENTE</span>}
                      {isOverdue && <span className="w-fit flex items-center gap-1 px-2 py-1 bg-slate-900 text-white rounded text-[8px] font-black uppercase">En retard</span>}
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${isHighPriority ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                      {getUrgencyLabel(task.urgency)}
                    </span>
                  </td>
                  <td className="p-6 text-center font-bold text-black">
                    <div className="flex flex-col items-center">
                      <Calendar size={14} className="text-slate-300 mb-1"/>
                      {new Date(task.deadline).toLocaleDateString('fr-FR')}
                    </div>
                  </td>
                  <td className="p-6 relative">
                    {isReassigning ? (
                      <div className="absolute inset-x-2 top-2 z-[999] bg-white border-2 border-indigo-600 shadow-2xl rounded-2xl p-4 animate-in zoom-in">
                          <div className="text-[10px] font-black text-indigo-600 uppercase mb-3 flex items-center gap-2"><UserPlus size={14}/> Modifier Responsables</div>
                          <div className="w-full p-2.5 bg-slate-50 border border-indigo-100 rounded-xl min-h-[44px] flex flex-wrap gap-1.5 items-center mb-3">
                            {newAssignments.map(id => (
                              <div key={id} className={`flex items-center gap-1 px-2 py-1 rounded text-[8px] font-black uppercase text-white ${getCollabInfo(id).dept?.toLowerCase() === 'audit' ? 'bg-[#0056b3]' : 'bg-orange-500'}`}>
                                {getCollabInfo(id).name.split(' ')[0]}
                                <button onClick={(e) => { e.stopPropagation(); setNewAssignments(prev => prev.filter(i => i !== id)); }}><X size={10}/></button>
                              </div>
                            ))}
                          </div>
                          <div className="max-h-52 overflow-y-auto divide-y divide-slate-50 border rounded-xl mb-3 shadow-inner bg-slate-50/30">
                            {team.map(c => (
                              <div key={c.id} onClick={() => toggleAssignment(c.id, newAssignments, setNewAssignments)} className={`flex items-center justify-between p-3 cursor-pointer text-[10px] font-bold ${newAssignments.includes(c.id) ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-white text-slate-900'}`}>{c.name}{newAssignments.includes(c.id) && <CheckCircle size={14} className="text-indigo-600"/>}</div>
                            ))}
                            <div className="bg-slate-100/50 p-2 text-[8px] font-black uppercase text-slate-400">Pôles</div>
                            {['pole_audit', 'pole_expertise'].map(pid => (
                              <div key={pid} onClick={() => toggleAssignment(pid, newAssignments, setNewAssignments)} className={`flex items-center justify-between p-3 cursor-pointer text-[10px] font-black uppercase ${newAssignments.includes(pid) ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-white text-slate-900'}`}>{pid.replace('_', ' ')}{newAssignments.includes(pid) && <CheckCircle size={14} className="text-indigo-600"/>}</div>
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => { setReassigningTaskId(null); setNewAssignments([]); }} className="py-3 bg-slate-100 text-slate-600 text-[10px] font-black rounded-xl uppercase hover:bg-slate-200">Annuler</button>
                            <button onClick={() => handleReassign(task.id)} className="py-3 bg-indigo-600 text-white text-[10px] font-black rounded-xl uppercase shadow-xl hover:bg-slate-900">Enregistrer</button>
                          </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {assignedIds.map(id => {
                          const info = getCollabInfo(id);
                          return (
                            <div key={id} className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase text-white ${info.dept?.toLowerCase() === 'audit' ? 'bg-[#0056b3]' : 'bg-orange-500'}`}>
                              {info.name}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="p-6 font-bold text-indigo-700 uppercase break-words">{team.find(c => String(c.id).trim() === String(task.assignedById).trim())?.name || "INCONNU"}</td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-2">
                      {isAdminOrManager && !isReassigning && (
                        <button 
                          onClick={() => { setReassigningTaskId(task.id); setNewAssignments([...assignedIds]); }} 
                          className="p-3 bg-indigo-50 text-indigo-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-600 hover:text-white"
                          title="Réassigner"
                        >
                          <UserPlus size={18}/>
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => setTaskToDeleteId(task.id)} className="p-3 bg-rose-50 text-rose-400 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 hover:text-white"><Trash2 size={18}/></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {displayTasks.length === 0 && <div className="p-32 text-center"><AlertCircle className="mx-auto text-slate-200 mb-6" size={48}/><p className="text-slate-400 font-black text-[12px] uppercase tracking-widest">Aucune mission trouvée</p></div>}
      </div>
    </div>
  );
};

export default PlanningModule;
