
import React, { useState, useEffect } from 'react';
import { X, Save, User, Briefcase, Hash, Calendar, Target, Shield, Timer } from 'lucide-react';
import { ServiceType, UserRole, Collaborator, Folder } from '../types';

interface Props {
  type: 'collab' | 'folder';
  initialData?: any;
  onSave: (data: any) => void;
  onClose: () => void;
}

const EntityModal: React.FC<Props> = ({ type, initialData, onSave, onClose }) => {
  const [formData, setFormData] = useState<any>(
    type === 'collab' 
      ? { name: '', department: ServiceType.AUDIT, hiringDate: new Date().toISOString().split('T')[0], role: UserRole.COLLABORATOR, password: '', startTime: '09:00', endTime: '18:00' }
      : { name: '', number: '', clientName: '', serviceType: ServiceType.AUDIT, budgetHours: 0 }
  );

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    }
  }, [initialData]);

  const handleScheduleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [start, end] = e.target.value.split('-');
    setFormData({ ...formData, startTime: start, endTime: end });
  };

  const currentSchedule = `${formData.startTime}-${formData.endTime}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[250] p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] animate-in zoom-in duration-200">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[2.5rem]">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">
            {initialData ? 'Modifier' : 'Ajouter'} {type === 'collab' ? 'Collaborateur' : 'Dossier'}
          </h3>
          <button onClick={onClose} className="p-3 bg-white text-slate-400 hover:text-red-500 rounded-xl shadow-sm transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          {type === 'collab' ? (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Nom Complet</label>
                <input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 ring-indigo-500/10 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="OUIAM..." />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1 flex items-center gap-1"><Shield size={10} /> Code d'accès (Password)</label>
                <input required className="w-full p-4 bg-slate-50 border border-indigo-200 rounded-2xl font-black text-center text-indigo-600 tracking-[0.5em] text-2xl outline-none focus:ring-4 ring-indigo-500/10 transition-all" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="0000" />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1 flex items-center gap-1"><Timer size={10} /> Planning Horaire (Pause 1h30)</label>
                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none" value={currentSchedule} onChange={handleScheduleChange}>
                  <option value="08:00-17:00">08:00 à 17:00</option>
                  <option value="09:00-18:00">09:00 à 18:00</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Pôle</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                    {Object.values(ServiceType).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Rôle</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    {Object.values(UserRole).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Date d'embauche</label>
                <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none" value={formData.hiringDate} onChange={e => setFormData({...formData, hiringDate: e.target.value})} />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Numéro de Dossier</label>
                <input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 ring-indigo-500/10" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} placeholder="Ex: 2024-001" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Nom du Client / Dossier</label>
                <input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 ring-indigo-500/10" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Société Holding" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Service / Pôle</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900" value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value})}>
                    {Object.values(ServiceType).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Budget (h)</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-indigo-600 text-xl text-center" value={formData.budgetHours} onChange={e => setFormData({...formData, budgetHours: parseFloat(e.target.value)})} />
                </div>
              </div>
            </>
          )}

          <div className="pt-6 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 p-5 bg-slate-100 text-slate-900 font-black rounded-3xl uppercase tracking-widest text-[11px] hover:bg-slate-200 transition-all">Annuler</button>
            <button type="submit" className="flex-1 p-5 bg-indigo-600 text-white font-black rounded-3xl uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-600/30 hover:bg-slate-900 transition-all flex items-center justify-center gap-2"><Save size={16}/> Sauvegarder</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntityModal;
