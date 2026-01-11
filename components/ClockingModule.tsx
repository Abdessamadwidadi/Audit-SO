
import React, { useState, useEffect, useMemo } from 'react';
import { Clock, LogIn, LogOut, CheckCircle2, Loader2, MapPin, Download, Calendar, TrendingUp, UserCheck, Activity, ShieldCheck, X } from 'lucide-react';
import { Attendance, Collaborator, UserRole } from '../types';
import Logo from './Logo';
import { formatDateFR } from '../App';

interface Props {
  currentUser: Collaborator;
  collaborators: Collaborator[];
  attendance: Attendance[];
  onCheckIn: (time: string) => void;
  onCheckOut: (id: string, time: string) => void;
  onExport?: () => void;
  poleFilter?: string;
}

const ClockingModule: React.FC<Props> = ({ currentUser, collaborators, attendance, onCheckIn, onCheckOut, onExport, poleFilter = 'all' }) => {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'today' | 'history' | 'stats'>('today');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'all'>('week');
  
  const [isAuthenticating, setIsAuthenticating] = useState<'in' | 'out' | null>(null);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const isAdminOrManager = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;

  const todayRecord = useMemo(() => attendance.find(a => 
    a.date === today && String(a.collaboratorId) === String(currentUser.id)
  ), [attendance, today, currentUser.id]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAuthSubmit = async () => {
    if (authCode === String(currentUser.password)) {
      setLoading(true);
      const action = isAuthenticating;
      setIsAuthenticating(null);
      setAuthCode('');
      setAuthError(false);
      
      const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      if (action === 'in') await onCheckIn(timeStr);
      else if (todayRecord) await onCheckOut(todayRecord.id, timeStr);
      setLoading(false);
    } else {
      setAuthError(true);
      setAuthCode('');
      setTimeout(() => setAuthError(false), 2000);
    }
  };

  const filteredAttendance = useMemo(() => {
    let list = attendance;
    if (!isAdminOrManager) {
      list = list.filter(a => String(a.collaboratorId) === String(currentUser.id));
    } else if (poleFilter !== 'all') {
      list = list.filter(a => {
        const collab = collaborators.find(c => String(c.id) === String(a.collaboratorId));
        return collab?.department.toLowerCase() === poleFilter.toLowerCase();
      });
    }

    if (timeRange !== 'all') {
      const now = new Date();
      now.setHours(0,0,0,0);
      list = list.filter(a => {
        const d = new Date(a.date);
        if (timeRange === 'day') return a.date === today;
        if (timeRange === 'week') {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          return d >= weekAgo;
        }
        if (timeRange === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        return true;
      });
    }
    return list;
  }, [attendance, collaborators, poleFilter, isAdminOrManager, currentUser.id, timeRange, today]);

  const teamStats = useMemo(() => {
    const filteredCollabs = collaborators.filter(c => poleFilter === 'all' || c.department.toLowerCase() === poleFilter.toLowerCase());
    return filteredCollabs.map(c => {
      const userHistory = attendance.filter(a => String(a.collaboratorId) === String(c.id));
      const rangeHistory = userHistory.filter(a => {
        const d = new Date(a.date);
        const now = new Date();
        now.setHours(0,0,0,0);
        if (timeRange === 'day') return a.date === today;
        if (timeRange === 'week') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          return d >= sevenDaysAgo;
        }
        if (timeRange === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        return true;
      });
      const lateCount = rangeHistory.filter(a => {
        if (!a.checkIn || !c.startTime) return false;
        const [entryH, entryM] = a.checkIn.split(':').map(Number);
        const [targetH, targetM] = c.startTime.split(':').map(Number);
        return (entryH * 60 + entryM) > (targetH * 60 + targetM + 5);
      }).length;
      return { id: c.id, name: c.name, count: rangeHistory.length, onTimeRate: rangeHistory.length > 0 ? Math.max(0, Math.round(((rangeHistory.length - lateCount) / rangeHistory.length) * 100)) : 0, pole: c.department, startTime: c.startTime || "09:00", hasData: rangeHistory.length > 0 };
    }).sort((a, b) => b.count - a.count);
  }, [collaborators, attendance, poleFilter, timeRange, today]);

  const personalStats = useMemo(() => {
    const userHistory = attendance.filter(a => String(a.collaboratorId) === String(currentUser.id));
    const rangeHistory = userHistory.filter(a => {
      const d = new Date(a.date);
      const now = new Date();
      now.setHours(0,0,0,0);
      if (timeRange === 'day') return a.date === today;
      if (timeRange === 'week') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return d >= sevenDaysAgo;
      }
      if (timeRange === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    });
    const lateDays = rangeHistory.filter(a => {
      if (!a.checkIn || !currentUser.startTime) return false;
      const [entryH, entryM] = a.checkIn.split(':').map(Number);
      const [targetH, targetM] = currentUser.startTime.split(':').map(Number);
      return (entryH * 60 + entryM) > (targetH * 60 + targetM + 5);
    }).length;
    return { onTimeRate: rangeHistory.length > 0 ? Math.round(((rangeHistory.length - lateDays) / rangeHistory.length) * 100) : 0, hasData: rangeHistory.length > 0 };
  }, [attendance, currentUser, timeRange, today]);

  const timeParts = useMemo(() => {
    const parts = currentTime.split(':');
    return { main: parts.slice(0, 2).join(':') || "00:00", sec: parts[2] || "00" };
  }, [currentTime]);

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
      {isAuthenticating && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center z-[500] p-4">
           <div className="bg-white rounded-[3.5rem] w-full max-w-sm p-12 text-center shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)] animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-100">
                <ShieldCheck size={40} className="text-white" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2 leading-none">Vérification PIN</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-10">Saisissez votre code pour valider</p>
              
              <input 
                type="password" 
                maxLength={6} 
                autoFocus 
                className={`w-full p-5 bg-slate-50 border-2 ${authError ? 'border-rose-500 bg-rose-50 animate-shake' : 'border-slate-100'} rounded-3xl font-black text-center text-3xl tracking-[0.5em] text-indigo-600 outline-none mb-10 transition-all`} 
                value={authCode} 
                onChange={e => setAuthCode(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleAuthSubmit()} 
              />
              
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => { setIsAuthenticating(null); setAuthCode(''); }} className="p-5 bg-slate-100 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Annuler</button>
                 <button onClick={handleAuthSubmit} className="p-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Confirmer</button>
              </div>
           </div>
        </div>
      )}

      <div className="flex bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-fit mx-auto overflow-x-auto hide-scrollbar">
        <button onClick={() => setViewMode('today')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'today' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><Clock size={14}/> Terminal</button>
        <button onClick={() => setViewMode('history')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'history' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><Calendar size={14}/> Historique</button>
        <button onClick={() => setViewMode('stats')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'stats' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><Activity size={14}/> Analyses {isAdminOrManager ? 'Équipe' : 'Perso'}</button>
      </div>

      {viewMode === 'today' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-8 bg-[#0f172a] rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[450px]">
             <div className="absolute -right-16 -bottom-16 opacity-[0.03] pointer-events-none rotate-12"><Clock size={500} /></div>
             <div className="flex justify-between items-start z-10">
                <div className="flex items-center gap-6">
                   <div className="bg-white p-4 rounded-[2rem] shadow-xl">
                     <Logo variant="both" size={56} showText={false} />
                   </div>
                   <div>
                     <h2 className="text-xs font-black uppercase tracking-[0.4em] text-indigo-400">Terminal de Pointage Certifié</h2>
                     <p className="text-base font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                   </div>
                </div>
                <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-full flex items-center gap-3 backdrop-blur-md"><MapPin size={16} className="text-indigo-400"/><span className="text-[11px] font-black uppercase tracking-widest">Bureau MSO</span></div>
             </div>
             <div className="flex flex-col md:flex-row items-end justify-between gap-12 z-10">
                <div className="flex items-baseline gap-4">
                   <span className="text-[11rem] font-black tracking-tighter tabular-nums text-white leading-none">{timeParts.main}</span>
                   <span className="text-4xl font-black text-indigo-500 tabular-nums">:{timeParts.sec}</span>
                </div>
                <div className="w-full md:w-80">
                   {loading ? (
                     <div className="h-24 bg-white/5 rounded-[2rem] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={40} /></div>
                   ) : !todayRecord ? (
                     <button onClick={() => setIsAuthenticating('in')} className="h-24 w-full bg-indigo-600 hover:bg-indigo-500 rounded-[2rem] flex items-center justify-center gap-5 font-black uppercase text-sm tracking-widest transition-all shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)] group"><LogIn size={24} className="group-hover:translate-x-1 transition-transform"/> Pointer l'Arrivée</button>
                   ) : !todayRecord.checkOut ? (
                     <button onClick={() => setIsAuthenticating('out')} className="h-24 w-full bg-rose-600 hover:bg-rose-500 rounded-[2rem] flex items-center justify-center gap-5 font-black uppercase text-sm tracking-widest transition-all shadow-[0_20px_40px_-10px_rgba(225,29,72,0.4)] group"><LogOut size={24} className="group-hover:-translate-x-1 transition-transform"/> Pointer le Départ</button>
                   ) : (
                     <div className="h-24 w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-[2rem] flex items-center justify-center gap-5 font-black uppercase text-sm tracking-widest"><CheckCircle2 size={28}/> Journée Terminée</div>
                   )}
                </div>
             </div>
          </div>
          <div className="lg:col-span-4 space-y-8">
             <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-xl flex flex-col justify-center">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-10 flex items-center gap-2"><TrendingUp size={14}/> Ponctualité ({timeRange === 'day' ? 'Jour' : timeRange === 'week' ? '7 j.' : 'Mois'})</h3>
                <div className="space-y-8">
                   <div className="flex justify-between items-center bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Respect Planning</span>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                          <div className={`h-full ${personalStats.hasData ? 'bg-indigo-600' : 'bg-slate-200'}`} style={{width: `${personalStats.onTimeRate}%`}}></div>
                        </div>
                        <p className={`font-black text-lg ${personalStats.hasData ? 'text-slate-900' : 'text-slate-300'}`}>{personalStats.hasData ? `${personalStats.onTimeRate}%` : '--%'}</p>
                      </div>
                   </div>
                   <div className="flex justify-between items-center bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Début Prévu</span>
                      <p className="font-black text-slate-900 text-lg">{currentUser.startTime}</p>
                   </div>
                </div>
             </div>
             <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-xl flex-grow flex flex-col justify-center">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-8">Status du jour</h3>
                <div className="space-y-6">
                  <div className="flex justify-between border-b border-slate-100 pb-5"><span className="text-[10px] font-bold text-slate-500 uppercase">Arrivée</span><p className="font-black text-slate-900 text-lg">{todayRecord?.checkIn || '--:--'}</p></div>
                  <div className="flex justify-between border-b border-slate-100 pb-5"><span className="text-[10px] font-bold text-slate-500 uppercase">Sortie</span><p className="font-black text-slate-900 text-lg">{todayRecord?.checkOut || '--:--'}</p></div>
                </div>
                <div className="mt-10 pt-5 flex items-center gap-3 text-indigo-600 text-[11px] font-black uppercase tracking-widest border-t border-slate-50"><UserCheck size={16}/> Planning : {currentUser.startTime}-{currentUser.endTime}</div>
             </div>
          </div>
        </div>
      )}

      {(viewMode === 'history' || viewMode === 'stats') && (
        <div className="flex flex-col gap-10 animate-in fade-in">
           <div className="flex justify-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-fit mx-auto">
             {[{id: 'day', label: 'Aujourd\'hui'}, {id: 'week', label: '7 Jours'}, {id: 'month', label: 'Ce Mois'}, {id: 'all', label: 'Tout'}].map(r => (
               <button key={r.id} onClick={() => setTimeRange(r.id as any)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === r.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-100'}`}>{r.label}</button>
             ))}
           </div>
           {viewMode === 'history' ? (
             <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-xl overflow-hidden">
               <div className="p-10 border-b flex justify-between items-center bg-slate-50">
                 <h3 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 text-slate-900"><Calendar size={18} className="text-indigo-600"/> Historique Filtré</h3>
                 {isAdminOrManager && (<button onClick={onExport} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl shadow-xl flex items-center gap-3 font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-indigo-100"><Download size={16}/> Exporter XLSX</button>)}
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-widest border-b text-slate-900">
                     <tr><th className="p-8">Date</th><th className="p-8">Collaborateur</th><th className="p-8 text-center">Arrivée</th><th className="p-8 text-center">Départ</th><th className="p-8 text-right">Statut</th></tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {filteredAttendance.map(a => {
                       const collab = collaborators.find(c => String(c.id) === String(a.collaboratorId));
                       return (
                         <tr key={a.id} className="text-sm hover:bg-slate-50 transition-colors text-slate-900">
                           <td className="p-8 font-bold">{formatDateFR(a.date)}</td>
                           <td className="p-8">
                             <p className="font-black text-slate-900">{collab?.name || "Inconnu"}</p>
                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{collab?.department} • Prévu {collab?.startTime}</p>
                           </td>
                           <td className="p-8 font-black text-indigo-600 text-center text-base">{a.checkIn}</td>
                           <td className="p-8 font-black text-slate-900 text-center text-base">{a.checkOut || "--:--"}</td>
                           <td className="p-8 text-right">
                              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${a.checkOut ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600 animate-pulse'}`}>{a.checkOut ? 'COMPLÉTÉ' : 'EN POSTE'}</span>
                           </td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
                 {filteredAttendance.length === 0 && (<div className="p-32 text-center text-[11px] font-black uppercase text-slate-300 tracking-widest italic">Aucune donnée enregistrée sur cette période</div>)}
               </div>
             </div>
           ) : (
             isAdminOrManager ? (
               <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-2xl overflow-hidden">
                  <div className="p-10 border-b flex justify-between items-center bg-slate-50">
                     <h3 className="font-black uppercase text-xs tracking-widest flex items-center gap-3 text-slate-900"><TrendingUp className="text-indigo-600" size={20}/> Analyse de la Ponctualité Équipe</h3>
                     <p className="text-[11px] font-black text-indigo-500 uppercase tracking-widest italic">Période : {timeRange === 'day' ? 'Aujourd\'hui' : timeRange === 'week' ? '7 Jours' : timeRange === 'month' ? 'Ce Mois' : 'Tout l\'historique'}</p>
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-900 border-b">
                           <tr><th className="p-8">Collaborateur</th><th className="p-8">Planning</th><th className="p-8 text-center">Présence (Jours)</th><th className="p-8 text-center">Respect Horaire</th><th className="p-8 text-right">Performances</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {teamStats.map(s => (
                             <tr key={s.id} className="text-sm hover:bg-slate-50 transition-colors text-slate-900">
                                <td className="p-8 font-black">{s.name}</td>
                                <td className="p-8"><span className="px-3 py-1 bg-indigo-50 rounded-lg font-black text-[11px] text-indigo-600">{s.startTime}</span></td>
                                <td className="p-8 font-black text-slate-500 text-center">{s.count} j.</td>
                                <td className="p-8 font-black text-center text-base">{s.hasData ? `${s.onTimeRate}%` : "---"}</td>
                                <td className="p-8 text-right"><div className="flex items-center justify-end gap-4"><div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner"><div className={`h-full ${!s.hasData ? 'bg-slate-200' : s.onTimeRate > 90 ? 'bg-emerald-500' : s.onTimeRate > 70 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{width: `${s.hasData ? s.onTimeRate : 0}%`}}></div></div></div></td>
                             </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
             ) : (
               <div className="bg-white p-20 rounded-[4rem] shadow-2xl border border-slate-200 text-center max-w-4xl mx-auto">
                  <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-lg shadow-indigo-50">
                    <Activity size={48} className="text-indigo-600" />
                  </div>
                  <h3 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">Analyses Personnelles</h3>
                  <p className="text-slate-500 font-medium mb-16 text-lg">Suivi de votre ponctualité sur le créneau : <span className="text-indigo-600 font-black">{currentUser.startTime} à {currentUser.endTime}</span>.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="bg-slate-50 p-12 rounded-[3.5rem] border border-slate-100 shadow-sm group hover:border-indigo-200 transition-all">
                        <p className="text-5xl font-black text-indigo-600 mb-2">{personalStats.hasData ? `${personalStats.onTimeRate}%` : "---%"}</p>
                        <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Taux de Ponctualité</p>
                     </div>
                     <div className="bg-slate-50 p-12 rounded-[3.5rem] border border-slate-100 shadow-sm group hover:border-indigo-200 transition-all">
                        <p className="text-5xl font-black text-slate-900 mb-2">{filteredAttendance.length}</p>
                        <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Jours de présence</p>
                     </div>
                  </div>
               </div>
             )
           )}
        </div>
      )}
    </div>
  );
};

export default ClockingModule;
