
import React, { useState, useEffect, useMemo } from 'react';
import { TimeEntry, Collaborator, Folder, PREDEFINED_TASKS, ServiceType, UserRole, EXERCICES } from '../types';
import { Clock, Search, PlusCircle, ChevronRight, Briefcase, Plus, Calendar as CalendarIcon } from 'lucide-react';

interface Props {
  currentUser: Collaborator;
  folders: Folder[];
  onAddEntry: (entry: { folderId: string; duration: number; description: string; date: string; isOvertime: boolean; exercice: number }) => void;
  onQuickFolderAdd: () => void;
  existingEntries: TimeEntry[];
}

const TimeEntryForm: React.FC<Props> = ({ currentUser, folders, onAddEntry, onQuickFolderAdd, existingEntries }) => {
  const [formData, setFormData] = useState({
    folderId: '',
    duration: 1,
    description: '',
    date: new Date().toISOString().split('T')[0],
    isOvertime: false,
    exercice: 2025
  });

  const [folderSearch, setFolderSearch] = useState('');
  const [poleFilter, setPoleFilter] = useState<string>(currentUser.department);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [showHistorySuggestions, setShowHistorySuggestions] = useState(false);

  const isAdminOrManager = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;

  const workHistory = useMemo(() => {
    const userEntries = existingEntries.filter(e => String(e.collaboratorId) === String(currentUser.id));
    const uniqueDescs = Array.from(new Set(userEntries.map(e => e.description)));
    return Array.from(new Set([...PREDEFINED_TASKS, ...uniqueDescs])).sort();
  }, [existingEntries, currentUser.id]);

  const filteredHistory = useMemo(() => {
    if (!formData.description) return workHistory.slice(0, 5);
    return workHistory.filter(h => h.toLowerCase().includes(formData.description.toLowerCase())).slice(0, 10);
  }, [workHistory, formData.description]);

  useEffect(() => {
    const total = existingEntries
      .filter(e => String(e.collaboratorId) === String(currentUser.id) && e.date === formData.date)
      .reduce((sum, e) => sum + e.duration, 0);
    setDailyTotal(total);
  }, [formData.date, existingEntries, currentUser.id]);

  const filteredResults = useMemo(() => {
    let list = folders.filter(f => !f.isArchived); // Ne proposer que les dossiers non archivés
    
    if (currentUser.role === UserRole.COLLABORATOR) {
      list = list.filter(f => (f.serviceType || '').toLowerCase() === currentUser.department.toLowerCase());
    } else {
      if (poleFilter !== 'all') {
        list = list.filter(f => (f.serviceType || '').toLowerCase() === poleFilter.toLowerCase());
      }
    }
    
    if (folderSearch.trim()) {
      const search = folderSearch.toLowerCase();
      list = list.filter(f => 
        (f.name?.toLowerCase() || '').includes(search) || 
        (f.number?.toLowerCase() || '').includes(search)
      );
    }
    return list;
  }, [folders, folderSearch, poleFilter, currentUser]);

  const selectedFolder = useMemo(() => {
    return folders.find(f => f.id === formData.folderId);
  }, [folders, formData.folderId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.folderId || !formData.description.trim()) return;
    onAddEntry({ ...formData });
    setFormData({ ...formData, folderId: '', duration: 1, description: '' });
    setFolderSearch('');
    setShowHistorySuggestions(false);
  };

  return (
    <div className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Saisie du temps</h2>
          <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">Management SO • {currentUser.name}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
             {isAdminOrManager ? (
               ['Audit', 'Expertise'].map(p => (
                 // Correction des couleurs Pôles : Audit (#0056b3)
                 <button key={p} type="button" onClick={() => setPoleFilter(p)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${poleFilter === p ? (p.toLowerCase() === 'audit' ? 'bg-[#0056b3] text-white' : 'bg-orange-500 text-white') : 'text-slate-400'}`}>{p}</button>
               ))
             ) : (
               // Correction des couleurs Pôles : Audit (#0056b3)
               <div className={`px-4 py-2 ${currentUser.department?.toLowerCase() === 'audit' ? 'bg-[#0056b3]' : 'bg-orange-500'} text-white rounded-lg text-[9px] font-black uppercase shadow-sm`}>{currentUser.department}</div>
             )}
          </div>
          <div className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase flex items-center gap-3 border transition-all ${dailyTotal >= 7 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
            <Clock size={14}/> 
            {dailyTotal}h / 7h
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex justify-between items-end px-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dossier client</label>
              {!formData.folderId && isAdminOrManager && (
                <button type="button" onClick={onQuickFolderAdd} className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:text-slate-900 transition-colors">
                  <Plus size={12}/> Créer nouveau dossier
                </button>
              )}
            </div>

            {!formData.folderId ? (
              <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="relative border-b p-1">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Rechercher par nom ou numéro..." className="w-full pl-11 pr-4 py-3 bg-white outline-none font-bold text-xs text-slate-900" value={folderSearch} onChange={e => setFolderSearch(e.target.value)} />
                </div>
                <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-50 custom-scrollbar text-slate-900">
                  {filteredResults.map(f => (
                    <button key={f.id} type="button" onClick={() => setFormData({...formData, folderId: f.id})} className="w-full flex items-center justify-between p-4 hover:bg-indigo-50 transition-colors text-left group">
                      <div className="flex items-center gap-3">
                        {/* Correction des couleurs Audit (#0056b3) */}
                        <div className={`w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-opacity-20 ${(f.serviceType || '').toLowerCase() === 'audit' ? 'group-hover:bg-[#0056b3] group-hover:text-[#0056b3]' : 'group-hover:bg-orange-500 group-hover:text-orange-500'} transition-all`}><Briefcase size={14} /></div>
                        <div>
                          <p className="font-bold text-[11px]">{f.name}</p>
                          {/* Correction des couleurs Audit (#0056b3) */}
                          <p className={`text-[8px] font-black ${(f.serviceType || '').toLowerCase() === 'audit' ? 'text-[#0056b3]' : 'text-orange-500'} uppercase tracking-tight`}>{f.number} • {f.serviceType}</p>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-200" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Correction des couleurs Audit (#0056b3)
              <div className={`p-6 rounded-2xl flex items-center justify-between animate-in zoom-in border-2 text-white shadow-xl ${(selectedFolder?.serviceType || '').toLowerCase() === 'audit' ? 'bg-[#0056b3] border-[#004494]' : 'bg-orange-500 border-orange-600'}`}>
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-white/20"><Briefcase size={24} /></div>
                  <div><h4 className="text-base font-black tracking-tight">{selectedFolder?.name}</h4><p className="text-[9px] font-bold text-white/80 uppercase tracking-widest">{selectedFolder?.number} • {selectedFolder?.serviceType}</p></div>
                </div>
                <button type="button" onClick={() => setFormData({...formData, folderId: ''})} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all">Changer</button>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</label><input type="date" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 text-xs" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Heures</label><input type="number" step="0.5" min="0.5" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black text-indigo-600 text-center text-xl" value={formData.duration} onChange={e => setFormData({...formData, duration: parseFloat(e.target.value)})} /></div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><CalendarIcon size={12}/> Exercice Fiscal</label>
              <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black text-indigo-600 text-sm" value={formData.exercice} onChange={e => setFormData({...formData, exercice: parseInt(e.target.value)})}>
                {EXERCICES.map(ex => <option key={ex} value={ex}>EXERCICE {ex}</option>)}
              </select>
            </div>

            <div className="space-y-1.5 relative">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Travaux réalisés</label>
              <div className="relative">
                <textarea required rows={3} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs outline-none focus:border-indigo-500 transition-all" placeholder="Détaillez votre mission..." value={formData.description} onFocus={() => setShowHistorySuggestions(true)} onChange={e => setFormData({...formData, description: e.target.value})} />
                {showHistorySuggestions && filteredHistory.length > 0 && (
                  <div className="absolute bottom-full left-0 w-full bg-white border border-slate-200 shadow-2xl rounded-2xl mb-2 z-50 max-h-[180px] overflow-y-auto">
                    {filteredHistory.map((h, i) => (
                      <button key={i} type="button" onClick={() => { setFormData({...formData, description: h}); setShowHistorySuggestions(false); }} className="w-full text-left p-4 hover:bg-indigo-50 text-[11px] font-bold text-slate-700 border-b border-slate-50 last:border-0 transition-colors">{h}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button type="submit" disabled={!formData.folderId || !formData.description.trim()} className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg transition-all flex items-center justify-center gap-3 ${!formData.folderId || !formData.description.trim() ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-slate-900'}`}>
              <PlusCircle size={18}/> Enregistrer
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default TimeEntryForm;
