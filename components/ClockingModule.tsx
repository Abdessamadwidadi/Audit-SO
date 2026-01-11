
import React, { useState, useEffect, useMemo } from 'react';
import { Clock, LogIn, LogOut, CheckCircle2, Loader2, Download, Activity, ShieldCheck, TrendingUp, Users, AlertTriangle, Timer, Info } from 'lucide-react';
import { Attendance, Collaborator, UserRole } from '../types';
import { formatDateFR } from '../App';

interface Props {
  currentUser: Collaborator;
  collaborators: Collaborator[];
  attendance: Attendance[];
  onCheckIn: (time: string) => void;
  onCheckOut: (id: string, time: string) => void;
  onExport?: (customData?: any[][]) => void;
}

const ClockingModule: React.FC<Props> = ({ currentUser, collaborators, attendance, onCheckIn, onCheckOut, onExport }) => {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'today' | 'history' | 'stats'>('today');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'all'>('all');
  const [historyPoleFilter, setHistoryPoleFilter] = useState<string>('all');
  
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

  const getAttendanceStatus = (checkIn: string, planIn: string) => {
    if (!checkIn || !planIn) return "-";
    const [h, m] = checkIn.split(':').map(Number);
    const [ph, pm] = planIn.split(':').map(Number);
    const checkMin = h * 60 + m;
    const planMin = ph * 60 + pm;

    if (checkMin > planMin + 5) return "En retard";
    if (checkMin < planMin - 15) return "En avance";
    return "À temps";
  };

  const isLateNow = useMemo(() => {
    if (!currentUser.startTime || todayRecord) return false;
    const [ph, pm] = currentUser.startTime.split(':').map(Number);
    const now = new Date();
    const planTime = new Date();
    planTime.setHours(ph, pm, 0, 0);
    return now.getTime() > (planTime.getTime() + 5 * 60000);
  }, [currentUser.startTime, todayRecord]);

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
    let list = [...attendance];
    
    // Filtrage par permissions
    if (!isAdminOrManager) {
      list = list.filter(a => String(a.collaboratorId) === String(currentUser.id));
    }

    // Filtrage par pôle dans l'historique
    if (historyPoleFilter !== 'all') {
      list = list.filter(a => {
        const collab = collaborators.find(c => String(c.id) === String(a.collaboratorId));
        return collab?.department?.toLowerCase() === historyPoleFilter.toLowerCase();
      });
    }

    // Filtrage par période
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
  }, [attendance, collaborators, historyPoleFilter, isAdminOrManager, currentUser.id, timeRange, today]);

  // Added missing stats calculation for the dashboard analytics view
  const stats = useMemo(() => {
    const pole = isAdminOrManager ? historyPoleFilter : currentUser.department;
    const activeCollabs = collaborators.filter(c => 
      pole === 'all' || c.department?.toLowerCase() === pole.toLowerCase()
    );
    const presentToday = attendance.filter(a => 
      a.date === today && 
      activeCollabs.some(c => String(c.id) === String(a.collaboratorId))
    ).length;
    const total = activeCollabs.length;
    const rate = total > 0 ? Math.round((presentToday / total) * 100) : 0;
    return { rate, presentToday, totalPossible: total };
  }, [attendance, collaborators, historyPoleFilter, isAdminOrManager, currentUser.department, today]);

  const handleCustomExport = () => {
    if (!onExport) return;
    const data = [
      ["DATE", "COLLABORATEUR", "PÔLE", "PRÉVU", "ARRIVÉE", "STATUT", "DÉPART"],
      ...filteredAttendance.map(a => {
        const collab = collaborators.find(c => String(c.id) === String(a.collaboratorId));
        return [
          formatDateFR(a.date),
          collab?.name || "Inconnu",
          collab?.department || "-",
          collab?.startTime || "-",
          a.checkIn,
          getAttendanceStatus(a.checkIn, collab?.startTime || ""),
          a.checkOut || "--:--"
        ];
      })
    ];
    onExport(data);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {isAuthenticating && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center z-[500] p-4">
           <div className="bg-white rounded-[3rem] w-full max-w-sm p-10 text-center shadow-2xl animate-in zoom-in">
              <ShieldCheck size={48} className="mx-auto text-indigo-600 mb-6" />
              <h3 className="text-xl font-black text-slate-900 mb-1">Validation PIN</h3>
              <input type="password" maxLength={6} autoFocus className={`w-full p-4 border-2 ${authError ? 'border-rose-500' : 'border-slate-100'} rounded-[1.5rem] font-black text-center text-3xl tracking-[0.4em] text-indigo-600 outline-none mb-8`} value={authCode} onChange={e => setAuthCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuthSubmit()} />
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setIsAuthenticating(null)} className="p-4 bg-slate-100 rounded-2xl font-black text-[9px] uppercase tracking-widest">Retour</button>
                 <button onClick={handleAuthSubmit} className="p-4 bg-indigo-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest">Valider</button>
              </div>
           </div>
        </div>
      )}

      <div className="flex bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-fit mx-auto">
        <button onClick={() => setViewMode('today')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'today' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>Terminal</button>
        <button onClick={() => setViewMode('history')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'history' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>Historique</button>
        <button onClick={() => setViewMode('stats')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'stats' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>Analyses</button>
      </div>

      {viewMode === 'today' && (
        <div className="space-y-6">
          <div className="bg-[#0f172a] rounded-[3.5rem] p-16 text-white shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[450px]">
            <div className="absolute top-10 left-10 flex gap-10">
              <div className="text-center">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Entrée Prévue</p>
                <p className="text-2xl font-black">{currentUser.startTime}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Sortie Prévue</p>
                <p className="text-2xl font-black">{currentUser.endTime}</p>
              </div>
            </div>

            <div className="text-center z-10">
                <div className="flex items-baseline justify-center gap-4 mb-6">
                  <span className="text-[10rem] font-black tracking-tighter tabular-nums leading-none">{currentTime.split(':').slice(0,2).join(':')}</span>
                  <span className="text-4xl font-black text-indigo-50 tabular-nums">:{currentTime.split(':')[2]}</span>
                </div>

                {isLateNow && (
                  <div className="mb-8 p-4 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-rose-300 flex items-center justify-center gap-3 font-bold text-xs uppercase tracking-widest animate-pulse">
                    <AlertTriangle size={18} /> Vous êtes en retard sur votre horaire prévu ({currentUser.startTime})
                  </div>
                )}

                <div className="w-80 mx-auto">
                  {loading ? (
                    <div className="h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={40} /></div>
                  ) : !todayRecord ? (
                    <button onClick={() => setIsAuthenticating('in')} className="h-24 w-full bg-indigo-600 hover:bg-indigo-500 rounded-[2.5rem] flex items-center justify-center gap-6 font-black uppercase text-[13px] tracking-widest transition-all shadow-2xl"><LogIn size={24}/> Pointer Arrivée</button>
                  ) : !todayRecord.checkOut ? (
                    <button onClick={() => setIsAuthenticating('out')} className="h-24 w-full bg-rose-600 hover:bg-rose-500 rounded-[2.5rem] flex items-center justify-center gap-6 font-black uppercase text-[13px] tracking-widest transition-all shadow-2xl"><LogOut size={24}/> Pointer Départ</button>
                  ) : (
                    <div className="h-24 w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-[2.5rem] flex items-center justify-center gap-6 font-black uppercase text-[13px] tracking-widest"><CheckCircle2 size={32}/> Pointage terminé</div>
                  )}
                </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'history' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
           <div className="flex flex-wrap justify-between items-center gap-4">
             <div className="flex gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
               {[{id: 'all', label: 'Tout'}, {id: 'day', label: 'Aujourd\'hui'}, {id: 'week', label: '7 Jours'}, {id: 'month', label: 'Mois'}].map(r => (
                 <button key={r.id} onClick={() => setTimeRange(r.id as any)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === r.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-100'}`}>{r.label}</button>
               ))}
             </div>

             <div className="flex items-center gap-4">
               {isAdminOrManager && (
                 <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                   {['all', 'Audit', 'Expertise'].map(p => (
                     <button key={p} onClick={() => setHistoryPoleFilter(p)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${historyPoleFilter === p ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>{p === 'all' ? 'Cabinet' : p}</button>
                   ))}
                 </div>
               )}
               <button onClick={handleCustomExport} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl shadow-xl flex items-center gap-3 font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all">
                 <Download size={18}/> {isAdminOrManager ? "EXPORTER XLS" : "MON POINTAGE XLS"}
               </button>
             </div>
           </div>
           
           <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest border-b text-slate-400">
                   <tr>
                     <th className="p-8">Date</th>
                     <th className="p-8">Collaborateur</th>
                     <th className="p-8 text-center">Prévu</th>
                     <th className="p-8 text-center">Réel (Arrivée)</th>
                     <th className="p-8 text-center">Statut</th>
                     <th className="p-8 text-center">Réel (Départ)</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {filteredAttendance.map(a => {
                     const collab = collaborators.find(c => String(c.id) === String(a.collaboratorId));
                     const status = getAttendanceStatus(a.checkIn, collab?.startTime || "");
                     return (
                       <tr key={a.id} className="text-slate-900 hover:bg-indigo-50/50 transition-colors">
                         <td className="p-8 font-bold text-slate-900">{formatDateFR(a.date)}</td>
                         <td className="p-8">
                           <p className="font-black text-slate-900">{collab?.name || "Inconnu"}</p>
                           <p className="text-[9px] text-indigo-500 font-bold uppercase">{collab?.department}</p>
                         </td>
                         <td className="p-8 font-black text-slate-400 text-center">{collab?.startTime || "-"}</td>
                         <td className="p-8 font-black text-indigo-600 text-center text-xl">{a.checkIn}</td>
                         <td className="p-8 text-center">
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              status === 'En retard' ? 'bg-rose-100 text-rose-700' : 
                              status === 'En avance' ? 'bg-amber-100 text-amber-700' : 
                              'bg-emerald-100 text-emerald-700'
                            }`}>
                              {status}
                            </span>
                         </td>
                         <td className="p-8 font-black text-slate-900 text-center text-xl">{a.checkOut || "--:--"}</td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
               {filteredAttendance.length === 0 && (
                 <div className="p-20 text-center text-slate-300 font-black uppercase tracking-widest italic">Aucun pointage trouvé pour cette sélection</div>
               )}
             </div>
           </div>
        </div>
      )}

      {viewMode === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in zoom-in">
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl text-center">
              <Activity className="mx-auto text-indigo-600 mb-6" size={48} />
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2">Taux d'assiduité</p>
              <p className="text-6xl font-black text-slate-900 mb-2">{stats.rate}%</p>
              <p className="text-indigo-600 font-black text-[11px] uppercase">{stats.presentToday} présents sur {stats.totalPossible}</p>
           </div>
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl text-center">
              <Timer className="mx-auto text-emerald-600 mb-6" size={48} />
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2">Horaires de Travail</p>
              <p className="text-4xl font-black text-slate-900 mb-2">{currentUser.startTime} - {currentUser.endTime}</p>
              <p className="text-emerald-600 font-black text-[11px] uppercase">Contrat Standard</p>
           </div>
           <div className="bg-[#0f172a] p-10 rounded-[3rem] shadow-2xl text-center text-white">
              <TrendingUp className="mx-auto text-indigo-400 mb-6" size={48} />
              <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] mb-2">Pôle actif</p>
              <p className="text-4xl font-black text-white mb-2 uppercase">{currentUser.department}</p>
              <p className="text-indigo-400 font-black text-[11px] uppercase tracking-widest">Management SO</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default ClockingModule;
