
import React, { useState, useEffect } from 'react';
import { TimeEntry, Collaborator, Folder, PREDEFINED_TASKS } from '../types';
import { Clock, Folder as FolderIcon, PlusCircle, Calendar as CalendarIcon, CheckCircle2, FileText, AlertTriangle } from 'lucide-react';

interface Props {
  collaborators: Collaborator[];
  folders: Folder[];
  currentCollabId: string;
  onAddEntry: (entry: { folderId: string; duration: number; description: string; date: string; isOvertime: boolean }) => void;
  existingEntries: TimeEntry[];
}

const TimeEntryForm: React.FC<Props> = ({ folders, currentCollabId, onAddEntry, existingEntries }) => {
  const [formData, setFormData] = useState({
    folderId: '',
    duration: 1,
    description: PREDEFINED_TASKS[0],
    date: new Date().toISOString().split('T')[0],
    isOvertime: false
  });

  const [dailyTotal, setDailyTotal] = useState(0);

  useEffect(() => {
    const total = existingEntries
      .filter(e => String(e.collaboratorId) === String(currentCollabId) && e.date === formData.date)
      .reduce((sum, e) => sum + e.duration, 0);
    setDailyTotal(total);
  }, [formData.date, existingEntries, currentCollabId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const willExceed = (dailyTotal + formData.duration) > 8;
    let isOvertime = formData.isOvertime;

    if (willExceed && !isOvertime) {
      if (confirm(`Attention : Votre saisie dépasse les 8h quotidiennes (${dailyTotal + formData.duration}h). S'agit-il d'heures supplémentaires ?`)) {
        isOvertime = true;
      }
    }

    onAddEntry({ ...formData, isOvertime });
    setFormData({ ...formData, folderId: '', duration: 1 });
  };

  return (
    <div className="bg-white p-12 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-200">
      <div className="flex items-center justify-between mb-10">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Nouvelle Saisie</h2>
        <div className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase flex items-center gap-3 border ${dailyTotal >= 8 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
          <Clock size={16} className="animate-pulse"/> {dailyTotal}h saisies aujourd'hui
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-[11px] font-black text-indigo-950 uppercase tracking-widest ml-1">Date de la mission</label>
            <input type="date" required className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 ring-indigo-500/10 transition-all" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
          </div>
          <div className="space-y-3">
            <label className="text-[11px] font-black text-indigo-950 uppercase tracking-widest ml-1">Dossier / Client</label>
            <select required className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 ring-indigo-500/10 transition-all" value={formData.folderId} onChange={e => setFormData({...formData, folderId: e.target.value})}>
              <option value="">Sélectionner un dossier...</option>
              {folders.map(f => <option key={f.id} value={f.id}>{f.number} - {f.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <label className="text-[11px] font-black text-indigo-950 uppercase tracking-widest ml-1">Durée effectuée (h)</label>
            <input type="number" step="0.5" min="0.5" required className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-indigo-600 text-center text-3xl outline-none focus:ring-4 ring-indigo-500/10 transition-all" value={formData.duration} onChange={e => setFormData({...formData, duration: parseFloat(e.target.value)})} />
          </div>
          <div className="md:col-span-2 space-y-3">
             <label className="text-[11px] font-black text-indigo-950 uppercase tracking-widest ml-1">Travail effectué / Description</label>
             <input type="text" required className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 ring-indigo-500/10 transition-all" placeholder="Ex: Révision comptable cycle achats..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
        </div>

        <button type="submit" className="w-full bg-indigo-600 text-white py-6 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-indigo-600/30 hover:bg-slate-900 transition-all flex items-center justify-center gap-3">
          <PlusCircle size={20}/> Enregistrer le temps
        </button>
      </form>
    </div>
  );
};

export default TimeEntryForm;
