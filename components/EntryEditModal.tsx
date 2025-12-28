
import React, { useState } from 'react';
import { X, Save, Clock, FileText, Calendar, Folder as FolderIcon } from 'lucide-react';
import { TimeEntry, Folder, PREDEFINED_TASKS } from '../types';

interface Props {
  entry: TimeEntry;
  folders: Folder[];
  onSave: (updated: TimeEntry) => void;
  onClose: () => void;
}

const EntryEditModal: React.FC<Props> = ({ entry, folders, onSave, onClose }) => {
  const [formData, setFormData] = useState<TimeEntry>({ ...entry });

  const handleFolderChange = (id: string) => {
    const folder = folders.find(f => f.id === id);
    if (folder) {
      setFormData({
        ...formData,
        folderId: folder.id,
        folderName: folder.name,
        folderNumber: folder.number,
        service: folder.serviceType
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl animate-in zoom-in duration-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-800">Modifier la saisie</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Dossier: {formData.folderName}</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white text-slate-400 hover:text-red-500 rounded-2xl shadow-sm transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 group-focus-within:text-indigo-600 transition-colors">
                <Calendar size={14} /> Date
              </label>
              <input
                type="date"
                required
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-700 transition-all"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 group-focus-within:text-indigo-600 transition-colors">
                <Clock size={14} /> Durée (Heures)
              </label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                required
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-black text-indigo-600 text-xl text-center transition-all"
                value={formData.duration}
                onChange={e => setFormData({ ...formData, duration: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 group-focus-within:text-indigo-600 transition-colors">
              <FolderIcon size={14} /> Changer le Dossier
            </label>
            <select
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-700 transition-all"
              value={formData.folderId}
              onChange={e => handleFolderChange(e.target.value)}
            >
              {folders.map(f => <option key={f.id} value={f.id}>[{f.serviceType}] {f.number} - {f.name}</option>)}
            </select>
          </div>

          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 group-focus-within:text-indigo-600 transition-colors">
              <FileText size={14} /> Description des travaux
            </label>
            <div className="space-y-3">
              <select
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-medium transition-all"
                value={PREDEFINED_TASKS.includes(formData.description) ? formData.description : ""}
                onChange={e => e.target.value && setFormData({ ...formData, description: e.target.value })}
              >
                <option value="">-- Utiliser une tâche type --</option>
                {PREDEFINED_TASKS.map(t => <option key={t} value={t}>{t}</option>)}
                <option value="">Saisie personnalisée...</option>
              </select>
              <input
                type="text"
                required
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-medium transition-all"
                placeholder="Détaillez vos travaux..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-6 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-8 py-5 bg-slate-100 text-slate-600 font-black rounded-3xl hover:bg-slate-200 transition-all uppercase tracking-widest text-xs"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-8 py-5 bg-indigo-600 text-white font-black rounded-3xl hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
            >
              <Save size={18} />
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntryEditModal;
