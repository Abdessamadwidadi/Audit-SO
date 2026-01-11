
import React, { useState, useEffect, useMemo } from 'react';
import { Clock, LogIn, LogOut, CheckCircle2, Loader2, Download, Activity, ShieldCheck, TrendingUp, Users, AlertTriangle, Timer, Info, User, ChevronLeft, ChevronRight, X, Edit3, Save, Calendar } from 'lucide-react';
import { Attendance, Collaborator, UserRole } from '../types';
import { formatDateFR } from '../App';

interface Props {
  currentUser: Collaborator;
  collaborators: Collaborator[];
  attendance: Attendance[];
  onCheckIn: (time: string) => void;
  onCheckOut: (id: string, time: string) => void;
  onUpdateAttendance?: (id: string, updates: Partial<Attendance>) => void;
  onExport?: (customData?: any[][]) => void;
  poleFilter: string;
}

const ClockingModule: React.FC<Props> = ({ currentUser, collaborators, attendance, onCheckIn, onCheckOut, onUpdateAttendance, onExport, poleFilter }) => {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'today' | 'history' | 'stats'>('today');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'all'>('all');
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  
  const [isAuthenticating, setIsAuthenticating] = useState<'in' | 'out' | null>(null);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState(false);

  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);

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

  const handleSaveEdit = async () => {
    if (editingAttendance && onUpdateAttendance) {
      setLoading(true);
      await onUpdateAttendance(editingAttendance.id, {
        date: editingAttendance.date,
        checkIn: editingAttendance.checkIn,
        checkOut: editingAttendance.checkOut
      });
      setEditingAttendance(null);
      setLoading(false);
    }
  };

  const filteredAttendance = useMemo(() => {
    let list = [...attendance];
    
    if (poleFilter !== 'all') {
      list = list.filter(a => {
        const collab = collaborators.find(c => String(c.id) === String(a.collaboratorId));
        return collab?.department?.toLowerCase() === poleFilter.toLowerCase();
      });
    }

    if (!isAdminOrManager || showOnlyMine) {
      list = list.filter(a => String(a.collaboratorId) === String(currentUser.id));
    }

    if (timeRange !== 'all') {
      const now = new Date(); now.setHours(0,0,0,0);
      list = list.filter(a => {
        const d = new Date(a.date);
        if (timeRange === 'day') return a.date === today;
        if (timeRange === 'week') { const w = new Date(); w.setDate(now.getDate() - 7); return d >= w; }
        if (timeRange === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        return true;
      });
    }
    return list;
  }, [attendance, collaborators, poleFilter, isAdminOrManager, showOnlyMine, currentUser.id, timeRange, today]);

  const stats = useMemo(() => {
    const activeCollabs = collaborators.filter(c => poleFilter === 'all' || c.department?.toLowerCase() === poleFilter.toLowerCase());
    const presentToday = attendance.filter(a => a.date === today && activeCollabs.some(c => String(c.id) === String(a.collaboratorId))).length;
    const total = activeCollabs.length;
    return { rate: total > 0 ? Math.round((presentToday/total)*100) : 0, presentToday, totalPossible: total };
  }, [attendance, collaborators, poleFilter, today]);

  const handleAttendanceExport = () => {
    if (!onExport) return;
    const data = [
      ["DATE", "COLLABORATEUR", "PÔLE", "ENTRÉE PRÉVUE", "ENTRÉE RÉELLE", "STATUT", "SORTIE RÉELLE"],
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
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Modal Authentification Pointage */}
      {isAuthenticating && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center z-[500] p-4">
           <div className="bg-white rounded-[3rem] w-full max-w-sm p-12 text-center shadow-2xl animate-in zoom-in">
              <ShieldCheck size={48} className="mx-auto text-indigo-600 mb-6" />
              <h3 className="text-xl font-black text-slate-900 mb-2">Vérification PIN</h3>
              <input type="password" maxLength={6} autoFocus className={`w-full p-6 border-2 ${authError ? 'border-rose-500 animate-shake' : 'border-slate-100'} rounded-[2rem] font-black text-center text-4xl tracking-[0.4em] text-indigo-600 outline-none mb-10`} value={authCode} onChange={e => setAuthCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuthSubmit()} />
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setIsAuthenticating(null)} className="p-5 bg-slate-100 rounded-3xl font-black text-[10px] uppercase tracking-widest text-slate-900">Retour</button>
                 <button onClick={handleAuthSubmit} className="p-5 bg-indigo-600 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl">Valider</button>
              </div>
           </div>
        </div>
      )}

      {/* Modal Modification Pointage (Manager) */}
      {editingAttendance && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[500] p-4">
           <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in overflow-hidden">
              <div className="flex justify-between items-center mb-8">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Modifier Pointage</h3>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">Collab: {collaborators.find(c => String(c.id) === String(editingAttendance.collaboratorId))?.name}</p>
                 </div>
                 <button onClick={() => setEditingAttendance(null)} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-2xl transition-all"><X size={20}/></button>
              </div>
              
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={12}/> Date du pointage</label>
                    <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none" value={editingAttendance.date} onChange={e => setEditingAttendance({...editingAttendance, date: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Clock size={12}/> Arrivée</label>
                       <input type="time" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-indigo-600 text-xl text-center outline-none" value={editingAttendance.checkIn} onChange={e => setEditingAttendance({...editingAttendance, checkIn: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Clock size={12}/> Départ</label>
                       <input type="time" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-900 text-xl text-center outline-none" value={editingAttendance.checkOut || ""} onChange={e => setEditingAttendance({...editingAttendance, checkOut: e.target.value})} />
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-10">
                 <button onClick={() => setEditingAttendance(null)} className="p-5 bg-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-900">Annuler</button>
                 <button onClick={handleSaveEdit} disabled={loading} className="p-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-slate-900 transition-all">
                    {loading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                    Enregistrer
                 </button>
              </div>
           </div>
        </div>
      )}

      <div className="flex bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-fit mx-auto">
        {['today', 'history', 'stats'].map(m => (
          <button key={m} onClick={() => setViewMode(m as any)} className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === m ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>{m === 'today' ? 'Terminal' : m === 'history' ? 'Historique' : 'Analyses'}</button>
        ))}
      </div>

      {viewMode === 'today' && (
        <div className="flex flex-col items-center justify-center py-10 animate-in slide-in-from-bottom-6">
          <div className="bg-[#0f172a] rounded-[4.5rem] p-16 md:p-24 text-white shadow-2xl relative overflow-hidden flex flex-col items-center justify-center max-w-2xl w-full text-center border border-white/5">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-indigo-500 via-indigo-400 to-amber-500"></div>
            
            <p className="text-indigo-400 font-black text-[11px] uppercase tracking-[0.6em] mb-12 opacity-80 flex items-center gap-4">
              <span className="w-8 h-px bg-indigo-900"></span>
              POINTAGE DIGITAL
              <span className="w-8 h-px bg-indigo-900"></span>
            </p>
            
            <div className="flex flex-col items-center gap-2 mb-16 relative">
              <div className="absolute -inset-10 bg-indigo-500/10 blur-[80px] rounded-full"></div>
              <span className="text-[10rem] md:text-[12rem] font-black tracking-tighter tabular-nums leading-none drop-shadow-2xl">{currentTime.split(':').slice(0,2).join(':')}</span>
              <span className="text-4xl font-black text-indigo-400/40 tabular-nums">:{currentTime.split(':')[2]}</span>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-16 w-full max-w-sm px-4">
              <div className="text-center group">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 group-hover:text-indigo-400 transition-colors">Entrée Prévue</p>
                <p className="text-3xl font-black text-white">{currentUser.startTime}</p>
              </div>
              <div className="text-center group">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 group-hover:text-amber-400 transition-colors">Sortie Prévue</p>
                <p className="text-3xl font-black text-white">{currentUser.endTime}</p>
              </div>
            </div>

            <div className="w-full max-w-sm">
              {loading ? (
                <div className="h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={40}/></div>
              ) : !todayRecord ? (
                <button onClick={() => setIsAuthenticating('in')} className="h-28 w-full bg-indigo-600 hover:bg-indigo-500 rounded-[2.5rem] flex flex-col items-center justify-center gap-1 font-black uppercase text-[12px] tracking-widest transition-all shadow-2xl hover:scale-[1.02] active:scale-95 group">
                  <LogIn size={28} className="mb-1 group-hover:scale-110 transition-transform"/>
                  POINTER ARRIVÉE
                </button>
              ) : !todayRecord.checkOut ? (
                <button onClick={() => setIsAuthenticating('out')} className="h-28 w-full bg-rose-600 hover:bg-rose-500 rounded-[2.5rem] flex flex-col items-center justify-center gap-1 font-black uppercase text-[12px] tracking-widest transition-all shadow-2xl hover:scale-[1.02] active:scale-95 group">
                  <LogOut size={28} className="mb-1 group-hover:scale-110 transition-transform"/>
                  POINTER DÉPART
                </button>
              ) : (
                <div className="h-28 w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-[2.5rem] flex flex-col items-center justify-center gap-2 font-black uppercase text-[12px] tracking-widest">
                  <CheckCircle2 size={32}/>
                  JOURNÉE TERMINÉE
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'history' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
           <div className="flex flex-wrap justify-between items-center gap-6">
             <div className="flex gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
               {['all', 'day', 'week', 'month'].map(r => (
                 <button key={r} onClick={() => setTimeRange(r as any)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${timeRange === r ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>{r === 'all' ? 'Tout' : r === 'day' ? 'Aujourd\'hui' : r === 'week' ? '7 Jours' : 'Mois'}</button>
               ))}
             </div>
             <div className="flex items-center gap-4">
               {isAdminOrManager && (
                 <button 
                  onClick={() => setShowOnlyMine(!showOnlyMine)} 
                  className={`px-6 py-3.5 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all border shadow-sm flex items-center gap-2 ${showOnlyMine ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                 >
                   <User size={14}/> {showOnlyMine ? "MON POINTAGE" : "TOUT LE PÔLE"}
                 </button>
               )}
               <button onClick={handleAttendanceExport} className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl shadow-xl flex items-center gap-3 font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all">
                 <Download size={18}/> EXPORTER XLS
               </button>
             </div>
           </div>
           <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
             <table className="w-full text-left">
               <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b">
                 <tr>
                   <th className="p-8">Date</th>
                   <th className="p-8">Collaborateur</th>
                   <th className="p-8 text-center">Arrivée</th>
                   <th className="p-8 text-center">Départ</th>
                   <th className="p-8 text-center">Statut</th>
                   {isAdminOrManager && <th className="p-8 text-right">Action</th>}
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {filteredAttendance.map(a => {
                   const collab = collaborators.find(c => String(c.id) === String(a.collaboratorId));
                   const status = getAttendanceStatus(a.checkIn, collab?.startTime || "");
                   return (
                    <tr key={a.id} className="hover:bg-indigo-50/50 transition-colors group">
                      <td className="p-8 font-bold text-slate-900">{formatDateFR(a.date)}</td>
                      <td className="p-8">
                        <p className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{collab?.name}</p>
                        <p className="text-[9px] text-indigo-500 font-bold uppercase">{collab?.department}</p>
                      </td>
                      <td className="p-8 font-black text-indigo-600 text-center text-xl">{a.checkIn}</td>
                      <td className="p-8 font-black text-slate-900 text-center text-xl">{a.checkOut || "--:--"}</td>
                      <td className="p-8 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${status === 'En retard' ? 'bg-rose-100 text-rose-700' : status === 'En avance' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {status}
                        </span>
                      </td>
                      {isAdminOrManager && (
                        <td className="p-8 text-right">
                          <button onClick={() => setEditingAttendance(a)} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                             <Edit3 size={16}/>
                          </button>
                        </td>
                      )}
                    </tr>
                   );
                 })}
               </tbody>
             </table>
             {filteredAttendance.length === 0 && (
               <div className="p-20 text-center text-slate-300 font-black uppercase tracking-widest italic">Aucun pointage enregistré</div>
             )}
           </div>
        </div>
      )}

      {viewMode === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in zoom-in">
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl text-center">
              <Activity className="mx-auto text-indigo-600 mb-6" size={48}/>
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-2">Taux d'assiduité</p>
              <p className="text-6xl font-black text-slate-900 mb-2">{stats.rate}%</p>
              <p className="text-indigo-600 font-black text-[11px] uppercase">{stats.presentToday} présents / {stats.totalPossible}</p>
           </div>
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl text-center">
              <Timer className="mx-auto text-emerald-600 mb-6" size={48}/>
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-2">Horaire Référence</p>
              <p className="text-4xl font-black text-slate-900 mb-2">{currentUser.startTime} - {currentUser.endTime}</p>
              <p className="text-emerald-600 font-black text-[11px] uppercase">Pause incluse</p>
           </div>
           <div className="bg-[#0f172a] p-10 rounded-[3rem] shadow-2xl text-center text-white">
              <TrendingUp className="mx-auto text-indigo-400 mb-6" size={48}/>
              <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest mb-2">Structure</p>
              <p className="text-4xl font-black text-white mb-2 uppercase">{currentUser.department}</p>
              <p className="text-indigo-400 font-black text-[11px] uppercase tracking-widest">{currentUser.role}</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default ClockingModule;
