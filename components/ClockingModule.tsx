
import React, { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, CheckCircle2, Loader2, RefreshCw, Users, UserCheck } from 'lucide-react';
import { Attendance, Collaborator, UserRole } from '../types';

interface Props {
  currentUser: Collaborator;
  collaborators: Collaborator[];
  attendance: Attendance[];
  onCheckIn: (time: string) => void;
  onCheckOut: (id: string, time: string) => void;
}

const ClockingModule: React.FC<Props> = ({ currentUser, collaborators, attendance, onCheckIn, onCheckOut }) => {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
  const [loading, setLoading] = useState(false);
  
  const today = new Date().toLocaleDateString('en-CA'); 
  const currentUserId = currentUser.id;
  const isAdminOrManager = currentUser.role !== UserRole.COLLABORATOR;
  
  const todayRecord = attendance.find(a => 
    a.date === today && String(a.collaboratorId) === String(currentUserId)
  );

  // Liste des présences pour les managers
  const todayAttendances = attendance.filter(a => a.date === today);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAction = async (action: 'in' | 'out') => {
    setLoading(true);
    try {
      if (action === 'in') await onCheckIn(currentTime);
      else if (todayRecord) await onCheckOut(todayRecord.id, currentTime);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="bg-white p-14 rounded-[4rem] shadow-2xl shadow-slate-200/60 border border-slate-100 relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-indigo-50 rounded-full blur-[80px] -z-10"></div>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-16">
          <div className="text-center md:text-left space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full font-black text-[9px] uppercase tracking-widest">
              <RefreshCw size={10} className="animate-spin-slow"/> Pointage en temps réel
            </div>
            <h3 className="text-5xl font-black text-slate-900 tracking-tighter">Votre Présence</h3>
            <p className="text-slate-600 font-bold uppercase text-xs tracking-[0.3em] max-w-sm leading-relaxed">Enregistrez vos heures pour le suivi administratif.</p>
          </div>

          <div className="flex flex-col items-center bg-slate-50/80 backdrop-blur-md p-12 rounded-[4rem] border border-slate-100 min-w-[320px] shadow-inner">
            <div className="text-center mb-10">
              <p className="text-[10px] font-black text-indigo-950 uppercase tracking-[0.4em] mb-4">Heure Actuelle</p>
              <div className="flex items-center justify-center gap-4">
                <Clock size={32} className="text-indigo-600 mb-1" />
                <span className="text-6xl font-black text-slate-900 tabular-nums">{currentTime}</span>
              </div>
            </div>
            
            <div className="w-full">
              {loading ? (
                <div className="w-full py-8 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
              ) : !todayRecord ? (
                <button onClick={() => handleAction('in')} className="w-full p-7 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-indigo-600/30 hover:bg-slate-900 transition-all flex items-center justify-center gap-4 group">
                  <LogIn size={20}/> Pointer mon Entrée
                </button>
              ) : !todayRecord.checkOut ? (
                <button onClick={() => handleAction('out')} className="w-full p-7 bg-red-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-red-600/30 hover:bg-slate-900 transition-all flex items-center justify-center gap-4 group">
                  <LogOut size={20}/> Pointer ma Sortie
                </button>
              ) : (
                <div className="w-full p-7 bg-emerald-50 text-emerald-600 rounded-[2rem] border border-emerald-100 flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 size={28}/>
                  <span className="font-black uppercase text-[10px] tracking-widest text-center">Journée Terminée</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
              <p className="text-[10px] font-black text-indigo-950 uppercase tracking-widest mb-2">Entrée ce matin</p>
              <p className="text-4xl font-black text-slate-900 tabular-nums">{todayRecord?.checkIn || '--:--'}</p>
          </div>
          <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
              <p className="text-[10px] font-black text-indigo-950 uppercase tracking-widest mb-2">Sortie ce soir</p>
              <p className="text-4xl font-black text-slate-900 tabular-nums">{todayRecord?.checkOut || '--:--'}</p>
          </div>
        </div>
      </div>

      {/* RECAPITULATIF EQUIPE - POUR MANAGERS */}
      {isAdminOrManager && (
        <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-200/50">
           <div className="flex items-center gap-4 mb-10">
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                 <Users size={24}/>
              </div>
              <div>
                 <h4 className="text-2xl font-black text-slate-900 tracking-tight">Suivi de l'équipe</h4>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Collaborateurs présents aujourd'hui ({todayAttendances.length})</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {todayAttendances.map(a => {
                const collab = collaborators.find(c => String(c.id) === String(a.collaboratorId));
                const isWorking = !a.checkOut;
                return (
                  <div key={a.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-white ${isWorking ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                        {collab?.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-sm leading-tight">{collab?.name || 'Inconnu'}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{collab?.department}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[11px] font-black text-slate-900">{a.checkIn} → {a.checkOut || 'Actif'}</p>
                       <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${isWorking ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                         {isWorking ? 'En poste' : 'Terminé'}
                       </span>
                    </div>
                  </div>
                );
              })}
              {todayAttendances.length === 0 && (
                <div className="col-span-full p-10 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 font-black text-slate-400 uppercase text-[10px] tracking-widest">
                   Aucun pointage enregistré aujourd'hui
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default ClockingModule;
