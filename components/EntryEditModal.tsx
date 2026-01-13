
import React, { useState, useMemo } from 'react';
import { X, Save, Clock, FileText, Calendar, Folder as FolderIcon } from 'lucide-react';
import { TimeEntry, Folder, PREDEFINED_TASKS, Collaborator, UserRole, ServiceType } from '../types';

interface Props {
  entry: TimeEntry;
  folders: Folder[];
  currentUser: Collaborator;
  onSave: (updated: TimeEntry) => void;
  onClose: () => void;
}

const EntryEditModal: React.FC<Props> = ({ entry, folders, currentUser, onSave, onClose }) => {
  const [formData, setFormData] = useState<TimeEntry>({ ...entry });

  // Filtrage des dossiers pour que le collaborateur ne voit que son pôle
  const allowedFolders = useMemo(() => {
    if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER) {
      return folders;
    }
    return folders.filter(f => f.serviceType?.toLowerCase() === currentUser.department?.toLowerCase());
  }, [folders, currentUser]);

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
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[500] p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)] animate-in zoom-in duration-200 overflow-hidden border border-slate-100">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Modifier la saisie</h3>
            <p className={`text-[10px] font-black ${formData.service === ServiceType.AUDIT ? 'text-blue-600' : 'text-orange-500'} uppercase tracking-[0.2em] mt-1`}>
              Dossier actuel : {formData.folderName} ({formData.service})
            </p>
          </div>
          <button onClick={onClose} className="p-3 bg-white text-slate-400 hover:text-rose-500 rounded-2xl shadow-sm transition-all border border-slate-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} className="text-slate-300" /> Date
              </label>
              <input
                type="date"
                required
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-900 transition-all"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Clock size={14} className="text-slate-300" /> Durée (Heures)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                className={`w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-black ${formData.service === ServiceType.AUDIT ? 'text-blue-600' : 'text-orange-500'} text-2xl text-center transition-all`}
                value={formData.duration}
                onChange={e => setFormData({ ...formData, duration: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FolderIcon size={14} className="text-slate-300" /> Changer le Dossier ({currentUser.department})
            </label>
            <select
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-black text-slate-900 transition-all appearance-none"
              value={formData.folderId}
              onChange={e => handleFolderChange(e.target.value)}
            >
              {allowedFolders.map(f => (
                <option key={f.id} value={f.id}>
                  [{f.serviceType.toUpperCase()}] {f.number} - {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FileText size={14} className="text-slate-300" /> Description des travaux
            </label>
            <div className="space-y-3">
              <select
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-600 transition-all"
                value={PREDEFINED_TASKS.includes(formData.description) ? formData.description : ""}
                onChange={e => e.target.value && setFormData({ ...formData, description: e.target.value })}
              >
                <option value="">-- Sélectionner une tâche type --</option>
                {PREDEFINED_TASKS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <textarea
                required
                rows={3}
                className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-900 transition-all"
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
              className="flex-1 px-8 py-5 bg-slate-100 text-slate-900 font-black rounded-3xl hover:bg-slate-200 transition-all uppercase tracking-widest text-[10px]"
            >
              Annuler
            </button>
            <button
              type="submit"
              className={`flex-1 px-8 py-5 ${formData.service === ServiceType.AUDIT ? 'bg-blue-600' : 'bg-orange-500'} text-white font-black rounded-3xl hover:bg-slate-900 shadow-xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[10px]`}
            >
              <Save size={18} />
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntryEditModal;
