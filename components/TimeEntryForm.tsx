
import React, { useState, useEffect, useMemo } from 'react';
import { TimeEntry, Collaborator, Folder, PREDEFINED_TASKS, ServiceType, UserRole } from '../types';
import { Clock, Search, PlusCircle, ChevronRight, Briefcase, Star, ListFilter } from 'lucide-react';

interface Props {
  currentUser: Collaborator;
  folders: Folder[];
  onAddEntry: (entry: { folderId: string; duration: number; description: string; date: string; isOvertime: boolean }) => void;
  existingEntries: TimeEntry[];
}

const TimeEntryForm: React.FC<Props> = ({ currentUser, folders, onAddEntry, existingEntries }) => {
  const [formData, setFormData] = useState({
    folderId: '',
    duration: 1,
    description: '',
    date: new Date().toISOString().split('T')[0],
    isOvertime: false
  });

  const [folderSearch, setFolderSearch] = useState('');
  const [poleFilter, setPoleFilter] = useState<string>('all');
  const [dailyTotal, setDailyTotal] = useState(0);
  const [showHistorySuggestions, setShowHistorySuggestions] = useState(false);

  const isAdminOrManager = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;

  // Historique des travaux saisis pour suggérer
  const workHistory = useMemo(() => {
    const userEntries = existingEntries.filter(e => String(e.collaboratorId) === String(currentUser.id));
    const uniqueDescs = Array.from(new Set(userEntries.map(e => e.description)));
    // On combine avec les tâches prédéfinies
    return Array.from(new Set([...PREDEFINED_TASKS, ...uniqueDescs])).sort();
  }, [existingEntries, currentUser.id]);

  const filteredHistory = useMemo(() => {
    if (!formData.description) return workHistory.slice(0, 5);
    return workHistory.filter(h => h.toLowerCase().includes(formData.description.toLowerCase())).slice(0, 10);
  }, [workHistory, formData.description]);

  const frequentFolders = useMemo(() => {
    const counts: Record<string, number> = {};
    existingEntries
      .filter(e => String(e.collaboratorId) === String(currentUser.id))
      .forEach(e => { counts[e.folderId] = (counts[e.folderId] || 0) + 1; });
    
    return folders
      .filter(f => counts[f.id])
      .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))
      .slice(0, 4);
  }, [folders, existingEntries, currentUser.id]);

  useEffect(() => {
    const total = existingEntries
      .filter(e => String(e.collaboratorId) === String(currentUser.id) && e.date === formData.date)
      .reduce((sum, e) => sum + e.duration, 0);
    setDailyTotal(total);
  }, [formData.date, existingEntries, currentUser.id]);

  const filteredResults = useMemo(() => {
    let list = folders;
    if (isAdminOrManager) {
      if (poleFilter !== 'all') list = list.filter(f => f.serviceType.toLowerCase() === poleFilter.toLowerCase());
    } else {
      list = list.filter(f => f.serviceType.toLowerCase() === currentUser.department.toLowerCase());
    }
    if (folderSearch.trim()) {
      const search = folderSearch.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(search) || f.number.toLowerCase().includes(search));
    }
    return list;
  }, [folders, folderSearch, poleFilter, currentUser, isAdminOrManager]);

  const selectedFolder = useMemo(() => folders.find(f => f.id === formData.folderId), [folders, formData.folderId]);

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
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Nouvelle Saisie</h2>
          <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">Cabinet Management SO</p>
        </div>
        <div className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase flex items-center gap-3 border transition-all ${dailyTotal >= 8 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
          <Clock size={14}/> 
          {dailyTotal}h cumulées le {new Date(formData.date).toLocaleDateString('fr-FR')}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-4">
            {!formData.folderId && frequentFolders.length > 0 && (
              <div className="space-y-2">
                <label className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2"><Star size={10} fill="currentColor"/> Vos dossiers fréquents</label>
                <div className="flex flex-wrap gap-2">
                  {frequentFolders.map(f => (
                    <button key={f.id} type="button" onClick={() => setFormData({...formData, folderId: f.id})} className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-[10px] font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all">{f.name}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-end px-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rechercher un dossier</label>
              {isAdminOrManager && !formData.folderId && (
                <div className="flex gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-100">
                  {['all', ServiceType.AUDIT, ServiceType.EXPERTISE].map((p) => (
                    <button key={p} type="button" onClick={() => setPoleFilter(p)} className={`text-[8px] font-black px-2 py-1 rounded-md transition-all ${poleFilter === p ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                      {p === 'all' ? 'TOUS' : p.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!formData.folderId ? (
              <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <div className="relative border-b p-1">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Nom ou numéro..." className="w-full pl-11 pr-4 py-3 bg-white outline-none font-bold text-xs text-slate-900" value={folderSearch} onChange={e => setFolderSearch(e.target.value)} />
                </div>
                <div className="max-h-[250px] overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
                  {filteredResults.map(f => (
                    <button key={f.id} type="button" onClick={() => setFormData({...formData, folderId: f.id})} className="w-full flex items-center justify-between p-3 hover:bg-indigo-50/50 transition-colors text-left group">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-slate-100 rounded flex items-center justify-center text-slate-400 transition-all"><Briefcase size={12} /></div>
                        <div>
                          <p className="font-bold text-slate-800 text-[11px]">{f.name}</p>
                          <p className="text-[8px] font-medium text-slate-400 uppercase">{f.number} • {f.serviceType}</p>
                        </div>
                      </div>
                      <ChevronRight size={12} className="text-slate-200" />
                    </button>
                  ))}
                </div>
                <div className="p-2 bg-slate-50 flex justify-between px-4"><p className="text-[8px] font-black text-slate-400 uppercase">{filteredResults.length} dossiers</p></div>
              </div>
            ) : (
              <div className="p-5 bg-slate-900 rounded-2xl text-white flex items-center justify-between animate-in zoom-in">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center"><Briefcase size={18} /></div>
                  <div><h4 className="text-sm font-black tracking-tight">{selectedFolder?.name}</h4><p className="text-[9px] font-bold text-slate-500 uppercase">{selectedFolder?.number} • {selectedFolder?.serviceType}</p></div>
                </div>
                <button type="button" onClick={() => setFormData({...formData, folderId: ''})} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-black text-[9px] uppercase tracking-widest">Changer</button>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</label><input type="date" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 text-xs" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Heures</label><input type="number" step="0.5" min="0.5" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-indigo-600 text-center text-lg" value={formData.duration} onChange={e => setFormData({...formData, duration: parseFloat(e.target.value)})} /></div>
            </div>

            <div className="space-y-1.5 relative">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nature des travaux</label>
              <div className="relative">
                <textarea 
                  required rows={3} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs placeholder:text-slate-300 outline-none focus:border-indigo-500 resize-none" 
                  placeholder="Rechercher ou saisir vos travaux..." value={formData.description} onFocus={() => setShowHistorySuggestions(true)} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                />
                {showHistorySuggestions && filteredHistory.length > 0 && (
                  <div className="absolute top-full left-0 w-full bg-white border border-slate-200 shadow-2xl rounded-2xl mt-1 z-50 max-h-[200px] overflow-y-auto">
                    {filteredHistory.map((h, i) => (
                      <button key={i} type="button" onClick={() => { setFormData({...formData, description: h}); setShowHistorySuggestions(false); }} className="w-full text-left p-3 hover:bg-slate-50 text-[11px] font-bold text-slate-700 border-b border-slate-50 last:border-0">{h}</button>
                    ))}
                  </div>
                )}
                {showHistorySuggestions && <div className="fixed inset-0 z-40" onClick={() => setShowHistorySuggestions(false)}/> }
              </div>
            </div>

            <button type="submit" disabled={!formData.folderId || !formData.description.trim()} className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg transition-all flex items-center justify-center gap-3 ${!formData.folderId || !formData.description.trim() ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-slate-900 shadow-indigo-100'}`}>
              <PlusCircle size={16}/> Enregistrer
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default TimeEntryForm;
