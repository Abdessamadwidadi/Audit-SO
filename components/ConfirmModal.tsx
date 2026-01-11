
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
}

const ConfirmModal: React.FC<Props> = ({ title, message, onConfirm, onCancel, confirmLabel = "Supprimer" }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 text-center shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] animate-in zoom-in duration-300">
        <div className="w-16 h-16 bg-rose-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={32} className="text-rose-600" />
        </div>
        
        <h3 className="text-2xl font-black text-slate-900 mb-2 leading-none tracking-tight">{title}</h3>
        <p className="text-[11px] font-bold text-slate-500 leading-relaxed mb-10 px-4">{message}</p>
        
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={onCancel} 
            className="p-5 bg-slate-100 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
            Annuler
          </button>
          <button 
            onClick={onConfirm} 
            className="p-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
