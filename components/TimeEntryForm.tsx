import React, { useState } from 'react';
import { TimeEntry, Collaborator, Folder, PREDEFINED_TASKS } from '../types';
// Import FileText to fix "Cannot find name 'FileText'" error on line 79
import { Clock, Folder as FolderIcon, PlusCircle, Calendar as CalendarIcon, CheckCircle2, FileText } from 'lucide-react';

interface Props {
  collaborators: Collaborator[];
  folders: Folder[];
  currentCollabId: string;
  onAddEntry: (entry: { folderId: string; duration: number; description: string; date: string }) => void;
}

const TimeEntryForm: React.FC<Props> = ({ collaborators, folders, currentCollabId, onAddEntry }) => {
  const [isRetroactive, setIsRetroactive] = useState(false);
  const [formData, setFormData] = useState({
    folderId: '',
    duration: 1,
    description: PREDEFINED_TASKS[0],
    date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.folderId || !formData.description) return;
    onAddEntry(formData);
    setFormData({
      ...formData,
      folderId: '',
      duration: 1,
      description: PREDEFINED_TASKS[0],
      date: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-200"><PlusCircle className="text-white" size={24} /></div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">Nouvelle Saisie</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Uniquement vos dossiers autorisés</p>
          </div>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          <button type="button" onClick={() => { setIsRetroactive(false); setFormData({...formData, date: new Date().toISOString().split('T')[0]}); }} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isRetroactive ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Aujourd'hui</button>
          <button type="button" onClick={() => setIsRetroactive(true)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isRetroactive ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Date Passée</button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {isRetroactive && (
            <div className="space-y-2 group">
              <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 transition-colors"><CalendarIcon size={14} /> Date</label>
              <input type="date" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>
          )}

          <div className={`space-y-2 group ${!isRetroactive ? 'md:col-span-2' : ''}`}>
            <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><FolderIcon size={14} /> Choix du Dossier ({folders.length} dispos)</label>
            <select
              required
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700"
              value={formData.folderId}
              onChange={(e) => setFormData({ ...formData, folderId: e.target.value })}
            >
              <option value="">-- Sélectionnez un dossier --</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.number} - {f.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2 group"><label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Clock size={14} /> Heures</label><input type="number" step="0.25" min="0.25" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-center text-indigo-600 text-xl" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: parseFloat(e.target.value) })} /></div>
          <div className="space-y-2 md:col-span-2 group"><label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><FileText size={14} /> Tâche effectuée</label><div className="flex flex-col gap-3">
              <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium" onChange={(e) => setFormData({ ...formData, description: e.target.value })} value={PREDEFINED_TASKS.includes(formData.description) ? formData.description : ""}><option value="">-- Tâche type --</option>{PREDEFINED_TASKS.map(t => <option key={t} value={t}>{t}</option>)}</select>
              <input type="text" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl placeholder:text-slate-300" placeholder="Décrivez votre travail..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
          </div>
        </div>

        <button type="submit" className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black py-5 rounded-[2rem] transition-all flex items-center justify-center gap-4 shadow-xl hover:-translate-y-1 group">
          <CheckCircle2 size={24} /> VALIDER LA SAISIE
        </button>
      </form>
    </div>
  );
};

export default TimeEntryForm;