
import React, { useState, useEffect } from 'react';
import { X, Save, Shield, Timer, AlertTriangle, Calendar, Eye, EyeOff, CheckCircle2, Circle, Briefcase, User } from 'lucide-react';
import { ServiceType, UserRole, Collaborator, EXERCICES } from '../types';

interface Props {
  type: 'collab' | 'folder';
  initialData?: any;
  currentUser: Collaborator;
  onSave: (data: any) => void;
  onClose: () => void;
}

const EntityModal: React.FC<Props> = ({ type, initialData, currentUser, onSave, onClose }) => {
  const [formData, setFormData] = useState<any>(
    type === 'collab' 
      ? { 
          name: '', 
          department: ServiceType.AUDIT, 
          hiringDate: new Date().toISOString().split('T')[0], 
          dateDepart: '',
          role: UserRole.COLLABORATOR, 
          password: '', 
          startTime: '09:00', 
          endTime: '18:00', 
          isActive: true 
        }
      : { 
          name: '', 
          number: '', 
          clientName: '', 
          serviceType: ServiceType.AUDIT, 
          budgetHours: 0 
        }
  );

  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({ 
        ...initialData,
        isActive: initialData.isActive !== undefined ? initialData.isActive : (initialData.is_active !== false),
        dateDepart: initialData.dateDepart || initialData.date_depart || ''
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[250] p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] animate-in zoom-in duration-200">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[2.5rem]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600">
              {type === 'collab' ? <User size={24}/> : <Briefcase size={24}/>}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                {initialData ? 'Modifier' : 'Ajouter'} {type === 'collab' ? 'Collaborateur' : 'Dossier'}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestion des entités</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white text-slate-400 hover:text-rose-500 rounded-xl shadow-sm transition-all border border-slate-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          {type === 'collab' ? (
            <>
              <div className="flex justify-between items-center bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                <div>
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Statut du compte</p>
                  <p className="text-[11px] font-bold text-slate-500">Actif pour autoriser la connexion.</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setFormData({...formData, isActive: !formData.isActive, dateDepart: !formData.isActive ? '' : new Date().toISOString().split('T')[0]})}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[9px] uppercase transition-all ${formData.isActive ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}
                >
                  {formData.isActive ? <CheckCircle2 size={14}/> : <Circle size={14}/>}
                  {formData.isActive ? 'Actif' : 'Inactif'}
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Nom Complet</label>
                <input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 ring-indigo-500/10 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Nom complet..." />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1 flex items-center gap-1"><Shield size={10} /> Code d'accès (PIN)</label>
                <div className="relative">
                  <input required 
                    type={showPin ? "text" : "password"}
                    className="w-full p-4 bg-slate-50 border border-indigo-200 rounded-2xl font-black text-center text-indigo-600 tracking-[0.5em] text-2xl outline-none focus:ring-4 ring-indigo-500/10 transition-all" 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                    placeholder="0000" 
                  />
                  <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-300 hover:text-indigo-600">
                     {showPin ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
                </div>
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

              {!formData.isActive && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1 flex items-center gap-1"><AlertTriangle size={10} /> Date de départ / fin de contrat</label>
                  <input type="date" className="w-full p-4 bg-rose-50 border border-rose-100 rounded-2xl font-bold text-rose-900" value={formData.dateDepart} onChange={e => setFormData({...formData, dateDepart: e.target.value})} />
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Numéro de Dossier</label>
                  <input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 ring-indigo-500/10" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} placeholder="Ex: 2024-001" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Nom du Client</label>
                <input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 ring-indigo-500/10" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} placeholder="Ex: Groupe Holding" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Libellé du Dossier</label>
                <input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 ring-indigo-500/10" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Audit Légal 2025" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Service / Pôle</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900" value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value})}>
                    {Object.values(ServiceType).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Budget Heures (h)</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-indigo-600 text-xl text-center" value={formData.budgetHours} onChange={e => setFormData({...formData, budgetHours: parseFloat(e.target.value)})} />
                </div>
              </div>
            </>
          )}

          <div className="pt-6 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 p-5 bg-slate-100 text-slate-900 font-black rounded-3xl uppercase tracking-widest text-[11px] hover:bg-slate-200 transition-all border border-slate-200">Annuler</button>
            <button type="submit" className="flex-1 p-5 bg-indigo-600 text-white font-black rounded-3xl uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-600/30 hover:bg-slate-900 transition-all flex items-center justify-center gap-2">
              <Save size={16}/> Sauvegarder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntityModal;
