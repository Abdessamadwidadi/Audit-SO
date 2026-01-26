
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, Loader2, Trash2, Search, 
  AlertCircle, X, CheckCircle, ChevronDown, ChevronRight,
  Clock, Calendar, AlertTriangle, Users as UsersIcon, Shield,
  UserPlus, CheckSquare, Square
} from 'lucide-react';
import { TaskAssignment, Collaborator, ServiceType, TaskUrgency, UserRole } from '../types';
import ConfirmModal from './ConfirmModal';

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
  currentUser, tasks, team, allCollaborators, onAddTask, onUpdateTask, onDeleteTask, onDeleteTasks, showNotif, poleFilter, startDate, endDate
}) => {
  const isAdminOrManager = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;
  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'received' | 'delegated'>(isAdminOrManager ? 'all' : 'mine');
  const [taskSearch, setTaskSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOnlyRemaining, setShowOnlyRemaining] = useState(false);
  
  const [title, setTitle] = useState('');
  const [assignedToIds, setAssignedToIds] = useState<string[]>([currentUser.id]);
  const [urgency, setUrgency] = useState<TaskUrgency>('normal');
  const [deadline, setDeadline] = useState(new Date().toISOString().split('T')[0]);
  const [isFormDropdownOpen, setIsFormDropdownOpen] = useState(false);
  
  const [reassigningTask, setReassigningTask] = useState<TaskAssignment | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const dropdownRef = useRef<HTMLDivElement>(null);
  const reassignDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { 
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsFormDropdownOpen(false); 
      if (reassignDropdownRef.current && !reassignDropdownRef.current.contains(e.target as Node)) setReassigningTask(null);
    };
    document.addEventListener("mousedown", handleClick); return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const currentId = String(currentUser.id).trim().toLowerCase();

  const isIdInCsv = (csv: string, targetId: string, userDept?: string) => {
    if (!csv) return false;
    const ids = csv.split(',').map(id => id.trim().toLowerCase());
    const target = targetId.trim().toLowerCase();
    const dept = (userDept || "").toLowerCase();
    return ids.includes(target) || (ids.includes('pole_audit') && dept === 'audit') || (ids.includes('pole_expertise') && dept === 'expertise');
  };

  const isNearDeadline = (deadlineStr: string) => {
    const d = new Date(deadlineStr);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    const hours = diff / (1000 * 60 * 60);
    return hours >= 0 && hours <= 24;
  };

  const getCollabInfo = (id: string) => {
    const cleanId = id.trim().toLowerCase();
    if (cleanId === 'pole_audit') return { name: 'PÔLE AUDIT', dept: ServiceType.AUDIT, isPole: true };
    if (cleanId === 'pole_expertise') return { name: 'PÔLE EXPERTISE', dept: ServiceType.EXPERTISE, isPole: true };
    const found = allCollaborators.find(c => String(c.id).trim().toLowerCase() === cleanId);
    return found ? { name: found.name, dept: found.department, isPole: false } : { name: "INCONNU", dept: ServiceType.EXPERTISE, isPole: false };
  };

  const displayTasks = useMemo(() => {
    const filtered = tasks.filter(t => {
      const csv = t.assignedToId || "";
      const creatorId = String(t.assignedById).trim().toLowerCase();
      const isMeCreator = creatorId === currentId;
      const isAssignedToMe = isIdInCsv(csv, currentId, currentUser.department);
      
      const responsibleIds = csv.split(',').map(id => id.trim().toLowerCase());
      const isStrictlyPrivateForCreator = responsibleIds.length === 1 && responsibleIds[0] === creatorId;

      if (poleFilter !== 'all' && t.pole?.toLowerCase() !== poleFilter.toLowerCase()) return false;
      if (taskSearch.trim() && !t.title.toLowerCase().includes(taskSearch.toLowerCase())) return false;

      // Logique des onglets avec protection stricte de la vie privée
      if (activeTab === 'all') {
        // Seul l'Admin peut superviser l'ensemble du cabinet
        if (currentUser.role === UserRole.ADMIN) {
          if (isStrictlyPrivateForCreator && !isMeCreator) return false;
          return true;
        }
        // Pour les autres (Managers et Collabs), on ne voit QUE ce qui nous concerne directement
        return isAssignedToMe || isMeCreator;
      }
      
      if (activeTab === 'mine') {
        // INDIVIDUEL : Donneur d'ordre = MOI ET Responsable = MOI
        return isMeCreator && isAssignedToMe;
      }
      
      if (activeTab === 'received') {
        // REÇUS : Responsable = MOI MAIS Donneur d'ordre = QUELQU'UN D'AUTRE
        return isAssignedToMe && !isMeCreator;
      }
      
      if (activeTab === 'delegated') {
        // DÉLÉGUÉS : Donneur d'ordre = MOI MAIS Responsable = AUTRE/POLE
        return isMeCreator && !isStrictlyPrivateForCreator;
      }
      
      return true;
    }).filter(t => !showOnlyRemaining || t.status === 'todo');

    return [...filtered].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'todo' ? -1 : 1;
      const weights = { critique: 3, urgent: 2, normal: 1 };
      return (weights[b.urgency] || 1) - (weights[a.urgency] || 1);
    });
  }, [tasks, activeTab, poleFilter, taskSearch, currentUser, showOnlyRemaining, currentId, isAdminOrManager]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault(); if (!title.trim()) return;
    setLoading(true);
    try {
      let taskPole = poleFilter !== 'all' ? poleFilter : currentUser.department;
      if (assignedToIds.includes('pole_audit')) taskPole = 'Audit';
      else if (assignedToIds.includes('pole_expertise')) taskPole = 'Expertise';
      
      await onAddTask({ 
        title: title.trim(), 
        assignedToId: assignedToIds.join(','), 
        deadline, 
        pole: taskPole, 
        urgency, 
        status: 'todo' 
      });
      setTitle(''); setAssignedToIds([currentUser.id]); setIsFormDropdownOpen(false); showNotif('success', "Mission créée");
    } catch (err) { showNotif('error', "Erreur"); }
    finally { setLoading(false); }
  };

  const handleReassign = async (taskId: string, newIds: string[]) => {
    try {
      await onUpdateTask(taskId, { assignedToId: newIds.join(',') });
      setReassigningTask(null);
      showNotif('success', 'Mission réaffectée');
    } catch (err) { showNotif('error', 'Erreur réaffectation'); }
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === displayTasks.length) {
      setSelectedIds(new Set());
    } else {
      const deletableIds = displayTasks
        .filter(t => String(t.assignedById).trim().toLowerCase() === currentId)
        .map(t => t.id);
      setSelectedIds(new Set(deletableIds));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    onDeleteTasks(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const toggleAssignmentInForm = (id: string) => {
    if (!isAdminOrManager) return;
    setAssignedToIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-8 animate-in fade-in text-black">
      <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-xl relative">
        <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
          <div className="md:col-span-4 space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Intitulé de la mission</label>
            <input type="text" required placeholder="Ex: Révision..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-black text-xs outline-none focus:border-indigo-600" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          
          <div className="md:col-span-3 space-y-2 relative" ref={dropdownRef}>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Responsables ({assignedToIds.length})</label>
            <div 
              onClick={() => isAdminOrManager && setIsFormDropdownOpen(!isFormDropdownOpen)} 
              className={`w-full p-3 border border-slate-100 rounded-2xl min-h-[52px] flex flex-wrap gap-1.5 items-center ${isAdminOrManager ? 'bg-slate-50 cursor-pointer' : 'bg-slate-100 cursor-not-allowed opacity-80'}`}
            >
              {assignedToIds.map(id => {
                const info = getCollabInfo(id);
                return (
                  <div key={id} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase text-white ${info.dept?.toLowerCase() === 'audit' ? 'bg-[#0056b3]' : 'bg-orange-500'} ${info.isPole ? 'ring-2 ring-white/50' : ''}`}>
                    {info.name.split(' ')[0]} {isAdminOrManager && <X size={10} onClick={(e) => { e.stopPropagation(); setAssignedToIds(assignedToIds.filter(i => i !== id)); }}/>}
                  </div>
                );
              })}
              {isAdminOrManager && <ChevronDown size={14} className="ml-auto text-slate-300" />}
              {!isAdminOrManager && <Shield size={12} className="ml-auto text-slate-400" title="Auto-assignation uniquement" />}
            </div>
            
            {isAdminOrManager && isFormDropdownOpen && (
              <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 shadow-2xl rounded-2xl p-2 z-[999] max-h-80 overflow-y-auto">
                <p className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b mb-1">Pôles complets</p>
                <div onClick={() => toggleAssignmentInForm('pole_audit')} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${assignedToIds.includes('pole_audit') ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-900'}`}>
                  <span className="text-[10px] font-black flex items-center gap-2"><UsersIcon size={14}/> TOUT LE PÔLE AUDIT</span>
                  {assignedToIds.includes('pole_audit') && <CheckCircle size={16} className="text-blue-600" />}
                </div>
                <div onClick={() => toggleAssignmentInForm('pole_expertise')} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${assignedToIds.includes('pole_expertise') ? 'bg-orange-50 text-orange-700' : 'hover:bg-slate-50 text-slate-900'}`}>
                  <span className="text-[10px] font-black flex items-center gap-2"><UsersIcon size={14}/> TOUT LE PÔLE EXPERTISE</span>
                  {assignedToIds.includes('pole_expertise') && <CheckCircle size={16} className="text-orange-600" />}
                </div>
                <p className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b my-1">Collaborateurs</p>
                {team.map(c => (
                  <div key={c.id} onClick={() => toggleAssignmentInForm(c.id)} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${assignedToIds.includes(c.id) ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-900'}`}>
                    <span className="text-[10px] font-bold">{c.name}</span>
                    {assignedToIds.includes(c.id) ? <CheckCircle size={16} className="text-indigo-600" /> : <div className="w-4 h-4 border-2 border-slate-200 rounded-full"></div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-3 grid grid-cols-2 gap-3">
             <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Échéance</label><input type="date" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-black text-xs" value={deadline} onChange={e => setDeadline(e.target.value)} /></div>
             <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400">Priorité</label><select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-black text-xs" value={urgency} onChange={e => setUrgency(e.target.value as any)}><option value="normal">Normale</option><option value="urgent">Haute</option><option value="critique">Urgente</option></select></div>
          </div>
          <div className="md:col-span-2"><button type="submit" className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-slate-900 shadow-lg">{loading ? <Loader2 className="animate-spin" size={16}/> : <Plus size={16}/>} Créer</button></div>
        </form>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
            <button onClick={() => setActiveTab('all')} className={`px-6 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all ${activeTab === 'all' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}>Toutes</button>
            {[ {id: 'mine', l: 'Individuel'}, {id: 'received', l: 'Reçus'}, {id: 'delegated', l: 'Déléguées'} ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`px-6 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all ${activeTab === t.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>
                {t.l}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input type="text" placeholder="Rechercher..." className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-black text-[10px] outline-none" value={taskSearch} onChange={e => setTaskSearch(e.target.value)} /></div>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <button onClick={handleBulkDelete} className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase flex items-center gap-2 shadow-lg animate-in zoom-in"><Trash2 size={14}/> Supprimer ({selectedIds.size})</button>
          )}
          <button onClick={() => setShowOnlyRemaining(!showOnlyRemaining)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${showOnlyRemaining ? 'bg-slate-900 text-white' : 'bg-white border text-slate-400'}`}>À faire uniquement</button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl text-black overflow-hidden relative">
        <table className="w-full text-left table-fixed">
          <thead className="bg-[#1e293b] text-[10px] font-black uppercase text-white border-b">
            <tr>
              <th className="p-6 w-12 text-center">
                <button onClick={toggleSelectAll} className="text-white hover:text-indigo-400 transition-colors">
                  {selectedIds.size === displayTasks.length && displayTasks.length > 0 ? <CheckSquare size={18}/> : <Square size={18}/>}
                </button>
              </th>
              <th className="p-6 text-center w-20">État</th>
              <th className="p-6">Mission / Dossier</th>
              <th className="p-6 text-center w-28">Priorité</th>
              <th className="p-6 text-center w-32">Échéance</th>
              <th className="p-6">RESPONSABLE(S)</th>
              <th className="p-6">Donneur d'ordre</th>
              <th className="p-6 text-right w-36">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayTasks.map(task => {
              const assignedIds = (task.assignedToId || "").split(',').filter(Boolean);
              const creator = getCollabInfo(task.assignedById);
              const isCriticallyClose = isNearDeadline(task.deadline) && task.status === 'todo';
              const isOwner = String(task.assignedById).trim().toLowerCase() === currentId;

              return (
                <tr key={task.id} className={`group transition-all text-xs ${task.status === 'done' ? 'opacity-40 grayscale bg-slate-50' : isCriticallyClose ? 'bg-rose-50' : 'hover:bg-indigo-50/20'}`}>
                  <td className="p-6 text-center">
                    <button onClick={() => toggleSelection(task.id)} disabled={!isOwner} className={`transition-colors ${isOwner ? 'text-slate-300 hover:text-indigo-600' : 'text-slate-100 cursor-not-allowed'}`}>
                      {selectedIds.has(task.id) ? <CheckSquare size={18} className="text-indigo-600"/> : <Square size={18}/>}
                    </button>
                  </td>
                  <td className="p-6 text-center"><button onClick={() => onUpdateTask(task.id, {status: task.status === 'todo' ? 'done' : 'todo'})} className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center mx-auto transition-all ${task.status === 'done' ? 'border-emerald-500 text-emerald-500 bg-emerald-50' : 'border-slate-200 text-slate-300 hover:border-emerald-500'}`}>{task.status === 'done' ? <CheckCircle size={20} /> : <Clock size={20} />}</button></td>
                  <td className="p-6 font-black uppercase text-slate-900 leading-tight">
                    <div className="flex flex-col gap-2">
                      {task.title}
                      {isCriticallyClose && <span className="w-fit flex items-center gap-1 px-2 py-1 bg-rose-600 text-white rounded text-[8px] font-black uppercase animate-pulse"><AlertTriangle size={10}/> -24H URGENT</span>}
                    </div>
                  </td>
                  <td className="p-6 text-center"><span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${task.urgency === 'critique' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>{task.urgency}</span></td>
                  <td className="p-6 text-center font-bold text-slate-900">{new Date(task.deadline).toLocaleDateString('fr-FR')}</td>
                  <td className="p-6">
                    <div className="flex flex-wrap gap-1.5">
                      {assignedIds.map(id => {
                        const info = getCollabInfo(id);
                        return (
                          <div key={id} className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase text-white ${info.dept?.toLowerCase() === 'audit' ? 'bg-[#0056b3]' : 'bg-orange-500'} ${info.isPole ? 'ring-1 ring-white/50 border border-white/20 shadow-sm' : ''}`}>
                            {info.name}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="p-6 font-bold text-indigo-700 uppercase">{creator.name}</td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end items-center gap-1">
                      {isOwner && (
                        <div className="relative" ref={reassigningTask?.id === task.id ? reassignDropdownRef : null}>
                           <button onClick={() => setReassigningTask(reassigningTask?.id === task.id ? null : task)} className="p-3 bg-indigo-50 text-indigo-600 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-indigo-600 hover:text-white transition-all" title="Réaffecter"><UserPlus size={18}/></button>
                           {reassigningTask?.id === task.id && (
                             <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 shadow-2xl rounded-2xl p-2 z-[999] w-64 animate-in zoom-in slide-in-from-top-2">
                               <p className="px-3 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b mb-2 text-center">Réaffecter à...</p>
                               <div className="max-h-60 overflow-y-auto">
                                 {['pole_audit', 'pole_expertise'].map(pId => (
                                   <div key={pId} onClick={() => handleReassign(task.id, [pId])} className="p-3 hover:bg-slate-50 rounded-xl cursor-pointer text-[9px] font-black uppercase text-indigo-600 flex justify-between items-center transition-colors">
                                      {pId.replace('_', ' ')} <ChevronRight size={14}/>
                                   </div>
                                 ))}
                                 <div className="h-px bg-slate-100 my-1"></div>
                                 {team.map(c => (
                                   <div key={c.id} onClick={() => handleReassign(task.id, [c.id])} className="p-3 hover:bg-slate-50 rounded-xl cursor-pointer text-[10px] font-bold text-slate-900 flex justify-between items-center transition-colors">
                                      {c.name} <ChevronRight size={14}/>
                                   </div>
                                 ))}
                               </div>
                             </div>
                           )}
                        </div>
                      )}
                      {isOwner && (
                        <button onClick={() => onDeleteTask(task.id)} className="p-3 bg-rose-50 text-rose-400 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-rose-600 hover:text-white transition-all" title="Supprimer"><Trash2 size={18}/></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {displayTasks.length === 0 && (
          <div className="p-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest italic">Aucune mission dans cet onglet</div>
        )}
      </div>
    </div>
  );
};

export default PlanningModule;
