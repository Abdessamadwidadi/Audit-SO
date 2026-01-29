
import React, { useState, useEffect } from 'react';
import { X, Save, Shield, Eye, EyeOff, CheckCircle2, Circle, Briefcase, User } from 'lucide-react';
import { ServiceType, UserRole, Collaborator } from '../types';

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
          role: UserRole.COLLABORATOR, 
          password: '', 
          isActive: true 
        }
      : { 
          name: '', // Libellé Dossier
          number: '', // Numéro Dossier
          serviceType: ServiceType.AUDIT, 
          budgetHours: 0 
        }
  );

  const [showPin, setShowPin] = useState(false);
  const isAdmin = currentUser.role === UserRole.ADMIN;

  useEffect(() => {
    if (initialData) {
      setFormData({ 
        ...initialData,
        isActive: initialData.isActive !== undefined ? initialData.isActive : (initialData.is_active !== false)
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[250] p-4 text-[#000000]">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in duration-200">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[2.5rem]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600">
              {type === 'collab' ? <User size={24}/> : <Briefcase size={24}/>}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase">
                {initialData ? 'Modifier' : 'Ajouter'} {type === 'collab' ? 'Collaborateur' : 'Dossier'}
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:text-rose-500 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          {type === 'collab' ? (
            <>
              <div className="flex justify-between items-center bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Statut du compte</span>
                <button type="button" onClick={() => setFormData({...formData, isActive: !formData.isActive})} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[9px] uppercase transition-all ${formData.isActive ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {formData.isActive ? <CheckCircle2 size={14}/> : <Circle size={14}/>} {formData.isActive ? 'Actif' : 'Inactif'}
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Nom Complet</label>
                <input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-black outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>

              {/* Sécurité : Seul l'Admin peut voir/modifier le PIN */}
              {isAdmin ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Code PIN (Admin Only)</label>
                  <div className="relative">
                    <input required type={showPin ? "text" : "password"} className="w-full p-4 bg-slate-50 border border-indigo-200 rounded-2xl font-black text-center text-indigo-600 tracking-widest text-2xl outline-none" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-300">
                      {showPin ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                  <Shield size={16} className="text-amber-600" />
                  <p className="text-[9px] font-bold text-amber-700 uppercase tracking-tight">PIN masqué par sécurité (Contactez l'administrateur pour modification)</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Pôle</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-black" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                    {Object.values(ServiceType).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Rôle</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-black" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    {Object.values(UserRole).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Numéro de Dossier</label>
                <input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-black outline-none" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} placeholder="Ex: 2025-001" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Libellé du Dossier</label>
                <input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-black outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Pôle</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-black" value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value})}>
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
            <button type="button" onClick={onClose} className="flex-1 p-5 bg-slate-100 text-slate-900 font-black rounded-3xl uppercase text-[10px]">Annuler</button>
            <button type="submit" className="flex-1 p-5 bg-indigo-600 text-white font-black rounded-3xl uppercase text-[10px] shadow-xl hover:bg-slate-900 transition-all">
              <Save size={16} className="inline mr-2"/> Sauvegarder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntityModal;
