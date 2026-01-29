
import React, { useState } from 'react';
import { X, Save, Shield, Eye, EyeOff } from 'lucide-react';
import { Collaborator } from '../types';

interface Props {
  collab: Collaborator;
  onSave: (newPin: string) => void;
  onClose: () => void;
}

const PinChangeModal: React.FC<Props> = ({ collab, onSave, onClose }) => {
  const [newPin, setNewPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length < 4) {
      setError('Le code PIN doit comporter au moins 4 chiffres');
      return;
    }
    onSave(newPin);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[600] p-4 text-[#000000]">
      <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-[2.5rem]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600">
              <Shield size={24}/>
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase">Mon Code PIN</h3>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:text-rose-500 transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Définissez votre nouveau code d'accès personnel</p>
            <div className="relative">
              <input 
                required 
                type={showPin ? "text" : "password"} 
                inputMode="numeric"
                maxLength={6}
                autoFocus
                className="w-full p-6 bg-slate-50 border-2 border-indigo-100 rounded-[2rem] font-black text-center text-4xl tracking-[0.4em] text-indigo-600 outline-none" 
                value={newPin} 
                onChange={e => {
                  setNewPin(e.target.value.replace(/\D/g, ''));
                  setError('');
                }} 
              />
              <button 
                type="button" 
                onClick={() => setShowPin(!showPin)} 
                className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-400"
              >
                {showPin ? <EyeOff size={22}/> : <Eye size={22}/>}
              </button>
            </div>
            {error && <p className="text-[9px] font-black text-rose-500 uppercase mt-4">{error}</p>}
          </div>

          <div className="flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 p-5 bg-slate-100 text-slate-900 font-black rounded-3xl uppercase text-[10px]">Annuler</button>
            <button type="submit" className="flex-1 p-5 bg-indigo-600 text-white font-black rounded-3xl uppercase text-[10px] shadow-xl hover:bg-slate-900 transition-all">
              <Save size={16} className="inline mr-2"/> Valider
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PinChangeModal;
