
import React, { useState, useEffect, useMemo } from 'react';
import { Clock, LogIn, LogOut, CheckCircle2, Loader2, Download, Activity, ShieldCheck, TrendingUp, Users, AlertTriangle, Timer, Info, User, ChevronLeft, ChevronRight, X, Edit3, Save, Calendar, UserX, PlusCircle, Filter } from 'lucide-react';
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

// Helper pour obtenir la date au format YYYY-MM-DD en tenant compte du fuseau horaire local
const toLocalISO = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const ClockingModule: React.FC<Props> = ({ currentUser, collaborators, attendance, onCheckIn, onCheckOut, onUpdateAttendance, onExport, poleFilter }) => {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'today' | 'history' | 'stats'>('today');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'all'>('week');
  const [selectedCollabId, setSelectedCollabId] = useState<string>('all');
  
  const [isAuthenticating, setIsAuthenticating] = useState<'in' | 'out' | null>(null);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState(false);

  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);

  const todayStr = toLocalISO(new Date());
  const isAdminOrManager = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;

  const todayRecord = useMemo(() => attendance.find(a => 
    a.date === todayStr && String(a.collaboratorId) === String(currentUser.id)
  ), [attendance, todayStr, currentUser.id]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })), 1000);
    return () => clearInterval(timer);
  }, []);

  const getAttendanceStatus = (dateStr: string, checkIn: string, planIn: string) => {
    const d = new Date(dateStr);
    const day = d.getDay(); 
    const isWeekend = day === 0 || day === 6;

    if (!checkIn || checkIn === "--:--") {
      return isWeekend ? "Repos" : "Absent";
    }
    
    if (!planIn) return "Présent";
    const [h, m] = checkIn.split(':').map(Number);
    const [ph, pm] = planIn.split(':').map(Number);
    const checkMin = h * 60 + m;
    const planMin = ph * 60 + pm;
    
    if (checkMin > planMin + 10) return "En retard";
    return "À temps";
  };

  const fullAttendanceGrid = useMemo(() => {
    const targetCollabId = !isAdminOrManager ? currentUser.id : (selectedCollabId === 'all' ? null : selectedCollabId);
    const collabsToTrack = targetCollabId 
      ? collaborators.filter(c => String(c.id) === String(targetCollabId)) 
      : collaborators.filter(c => poleFilter === 'all' || c.department.toLowerCase() === poleFilter.toLowerCase());

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    
    // Verrouillage strict des périodes civiles
    if (timeRange === 'day') {
      startDate = new Date(now);
      endDate = new Date(now);
    }
    else if (timeRange === 'week') {
      const day = now.getDay(); // 0=Sun, 1=Mon...
      // On calcule le Lundi de la semaine en cours (Lundi=1)
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      startDate = new Date(now);
      startDate.setDate(now.getDate() + diffToMonday);
      // Le Dimanche est Lundi + 6 jours
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    }
    else if (timeRange === 'month') {
      // 1er du mois au dernier jour du mois
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    else {
      startDate.setMonth(now.getMonth() - 3);
      endDate = new Date(now);
    }

    const dates: string[] = [];
    let iter = new Date(startDate);
    
    // Normalisation des dates pour comparaison stricte sans effet de bord d'heures
    const startCompare = toLocalISO(startDate);
    const endCompare = toLocalISO(endDate);
    const todayCompare = toLocalISO(now);
    
    // On ne génère des lignes que jusqu'à aujourd'hui au maximum pour la période sélectionnée (ou la fin de période si c'est déjà passé)
    const limitDateStr = endCompare > todayCompare ? todayCompare : endCompare;
    
    // Boucle de génération des dates dans l'intervalle strict
    let safety = 0;
    while (toLocalISO(iter) <= limitDateStr && safety < 100) {
      dates.push(toLocalISO(iter));
      iter.setDate(iter.getDate() + 1);
      safety++;
    }
    dates.reverse();

    const grid: any[] = [];
    dates.forEach(date => {
      collabsToTrack.forEach(collab => {
        const record = attendance.find(a => a.date === date && String(a.collaboratorId) === String(collab.id));
        const status = getAttendanceStatus(date, record?.checkIn || "", collab.startTime);
        
        grid.push({
          id: record?.id || `abs-${collab.id}-${date}`,
          date,
          collabName: collab.name,
          checkIn: record?.checkIn || "--:--",
          checkOut: record?.checkOut || "--:--",
          status,
          isReal: !!record,
          collabId: collab.id,
          pole: collab.department,
          modifiedAt: record?.modifiedAt,
          modifiedByName: record?.modifiedByName
        });
      });
    });

    return grid;
  }, [attendance, collaborators, selectedCollabId, timeRange, isAdminOrManager, poleFilter, currentUser.id]);

  const stats = useMemo(() => {
    const activeCollabs = collaborators.filter(c => poleFilter === 'all' || c.department.toLowerCase() === poleFilter.toLowerCase());
    const presentToday = attendance.filter(a => a.date === todayStr && activeCollabs.some(c => String(c.id) === String(a.collaboratorId))).length;
    const total = activeCollabs.length;
    const rate = total > 0 ? Math.round((presentToday / total) * 100) : 0;
    return { rate, presentToday, total };
  }, [attendance, collaborators, poleFilter, todayStr]);

  const handleAuthSubmit = async () => {
    if (authCode === String(currentUser.password)) {
      setLoading(true);
      const action = isAuthenticating; setIsAuthenticating(null); setAuthCode(''); setAuthError(false);
      const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      if (action === 'in') await onCheckIn(timeStr);
      else if (todayRecord) await onCheckOut(todayRecord.id, timeStr);
      setLoading(false);
    } else { setAuthError(true); setAuthCode(''); setTimeout(() => setAuthError(false), 2000); }
  };

  const handleSaveEdit = async () => {
    if (editingAttendance && onUpdateAttendance) {
      setLoading(true);
      await onUpdateAttendance(editingAttendance.id, { date: editingAttendance.date, checkIn: editingAttendance.checkIn, checkOut: editingAttendance.checkOut });
      setEditingAttendance(null); setLoading(false);
    }
  };

  const handleExcelExport = () => {
    if (!onExport) return;
    const data = [
      ["DATE", "COLLABORATEUR", "PÔLE", "ARRIVÉE", "DÉPART", "STATUT"],
      ...fullAttendanceGrid.map(item => [
        formatDateFR(item.date),
        item.collabName,
        item.pole,
        item.checkIn,
        item.checkOut,
        item.status
      ])
    ];
    onExport(data);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Modal Auth */}
      {isAuthenticating && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center z-[500] p-4">
           <div className="bg-white rounded-[3rem] w-full max-w-sm p-12 text-center shadow-2xl animate-in zoom-in">
              <ShieldCheck size={48} className="mx-auto text-indigo-600 mb-6" />
              <h3 className="text-xl font-black text-slate-900 mb-2">Vérification PIN</h3>
              <input type="password" maxLength={6} autoFocus className={`w-full p-6 border-2 ${authError ? 'border-rose-500 animate-shake' : 'border-slate-100'} rounded-[2rem] font-black text-center text-4xl tracking-[0.4em] text-indigo-600 outline-none mb-10`} value={authCode} onChange={e => setAuthCode(e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setIsAuthenticating(null)} className="p-5 bg-slate-100 rounded-3xl font-black text-[10px] uppercase tracking-widest text-slate-900">Annuler</button>
                 <button onClick={handleAuthSubmit} className="p-5 bg-indigo-600 text-white rounded-3xl font-black text-[10px] uppercase shadow-xl">Valider</button>
              </div>
           </div>
        </div>
      )}

      {/* Modal Edit */}
      {editingAttendance && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[500] p-4">
           <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in">
              <div className="flex justify-between items-center mb-8">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Régularisation</h3>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">Saisie manuelle</p>
                 </div>
                 <button onClick={() => setEditingAttendance(null)} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-2xl transition-all"><X size={20}/></button>
              </div>
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><Calendar size={12}/> Date</label>
                    <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none" value={editingAttendance.date} onChange={e => setEditingAttendance({...editingAttendance, date: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Arrivée</label>
                       <input type="time" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-indigo-600 text-xl text-center" value={editingAttendance.checkIn} onChange={e => setEditingAttendance({...editingAttendance, checkIn: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Départ</label>
                       <input type="time" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-900 text-xl text-center" value={editingAttendance.checkOut || ""} onChange={e => setEditingAttendance({...editingAttendance, checkOut: e.target.value})} />
                    </div>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-10">
                 <button onClick={() => setEditingAttendance(null)} className="p-5 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-900">Annuler</button>
                 <button onClick={handleSaveEdit} className="p-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-slate-900">Enregistrer</button>
              </div>
           </div>
        </div>
      )}

      <div className="flex bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-fit mx-auto">
        {['today', 'history', 'stats'].map(m => (
          <button key={m} onClick={() => setViewMode(m as any)} className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === m ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>{m === 'today' ? 'Pointage' : m === 'history' ? 'Suivi Présence' : 'Stats'}</button>
        ))}
      </div>

      {viewMode === 'today' && (
        <div className="flex flex-col items-center justify-center py-10 animate-in slide-in-from-bottom-6">
          <div className="bg-[#0f172a] rounded-[4.5rem] p-16 md:p-24 text-white shadow-2xl relative overflow-hidden flex flex-col items-center justify-center max-w-2xl w-full text-center border border-white/5">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-indigo-500 via-indigo-400 to-amber-500"></div>
            <p className="text-indigo-400 font-black text-[11px] uppercase tracking-[0.6em] mb-12 opacity-80">Cabinet Management SO</p>
            <div className="flex flex-col items-center gap-2 mb-16 relative">
              <span className="text-[10rem] md:text-[12rem] font-black tracking-tighter tabular-nums leading-none drop-shadow-2xl">{currentTime.split(':').slice(0,2).join(':')}</span>
              <span className="text-4xl font-black text-indigo-400/40 tabular-nums">:{currentTime.split(':')[2]}</span>
            </div>
            <div className="w-full max-w-sm">
              {loading ? (
                <div className="h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={40}/></div>
              ) : !todayRecord ? (
                <button onClick={() => setIsAuthenticating('in')} className="h-28 w-full bg-indigo-600 hover:bg-indigo-500 rounded-[2.5rem] flex flex-col items-center justify-center gap-1 font-black uppercase text-[12px] tracking-widest transition-all shadow-2xl group">
                  <LogIn size={28} className="mb-1 group-hover:scale-110 transition-transform"/>
                  Pointer l'arrivée
                </button>
              ) : !todayRecord.checkOut ? (
                <button onClick={() => setIsAuthenticating('out')} className="h-28 w-full bg-rose-600 hover:bg-rose-500 rounded-[2.5rem] flex flex-col items-center justify-center gap-1 font-black uppercase text-[12px] tracking-widest transition-all shadow-2xl group">
                  <LogOut size={28} className="mb-1 group-hover:scale-110 transition-transform"/>
                  Pointer le départ
                </button>
              ) : (
                <div className="h-28 w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-[2.5rem] flex flex-col items-center justify-center gap-2 font-black uppercase text-[12px] tracking-widest">
                  <CheckCircle2 size={32}/> Terminé
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'history' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
           <div className="flex flex-wrap justify-between items-center gap-6">
             <div className="flex flex-wrap gap-4 items-center">
                <div className="flex gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                  {['day', 'week', 'month', 'all'].map(r => (
                    <button key={r} onClick={() => setTimeRange(r as any)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${timeRange === r ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>{r === 'day' ? 'Jour' : r === 'week' ? 'Semaine' : r === 'month' ? 'Mois' : 'Historique'}</button>
                  ))}
                </div>
                {isAdminOrManager && (
                  <div className="relative group">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                    <select className="pl-10 pr-6 py-3 bg-white border border-slate-200 rounded-2xl font-black text-[9px] uppercase tracking-widest outline-none shadow-sm min-w-[220px] text-slate-900" value={selectedCollabId} onChange={e => setSelectedCollabId(e.target.value)}>
                      <option value="all">Tous les collaborateurs</option>
                      {collaborators.filter(c => poleFilter === 'all' || c.department.toLowerCase() === poleFilter.toLowerCase()).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
             </div>
             <button onClick={handleExcelExport} className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl shadow-xl flex items-center gap-3 font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all">
               <Download size={18}/> EXPORTER XLS
             </button>
           </div>

           <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
             <table className="w-full text-left">
               <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b">
                 <tr>
                   <th className="p-8">Date</th>
                   <th className="p-8">Collaborateur</th>
                   <th className="p-8 text-center">Arrivée</th>
                   <th className="p-8 text-center">Départ</th>
                   <th className="p-8 text-center">Statut</th>
                   {isAdminOrManager && <th className="p-8 text-right">Actions</th>}
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {fullAttendanceGrid.map(item => (
                    <tr key={item.id} className={`hover:bg-indigo-50/50 transition-colors group ${item.status === 'Absent' || item.status === 'En retard' ? 'bg-rose-50/20' : item.status === 'Repos' ? 'bg-slate-50/10' : ''}`}>
                      <td className="p-8 font-bold text-slate-900">{formatDateFR(item.date)}</td>
                      <td className="p-8 font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase">{item.collabName}</td>
                      <td className="p-8 text-center">
                        <div className="font-black text-indigo-600 text-xl">{item.checkIn}</div>
                        {item.modifiedAt && (
                          <div className="text-[8px] font-black italic text-rose-400 uppercase mt-1">
                            Rectifié le {new Date(item.modifiedAt).toLocaleDateString('fr-FR')} par {item.modifiedByName}
                          </div>
                        )}
                      </td>
                      <td className="p-8 text-center font-black text-slate-900 text-xl">{item.checkOut}</td>
                      <td className="p-8 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${item.status === 'Absent' || item.status === 'En retard' ? 'bg-rose-100 text-rose-700' : item.status === 'Repos' ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-700'}`}>
                          {item.status}
                        </span>
                      </td>
                      {isAdminOrManager && (
                        <td className="p-8 text-right">
                          <button onClick={() => setEditingAttendance(item.isReal ? attendance.find(a => a.id === item.id) || null : { id: '', collaboratorId: item.collabId, date: item.date, checkIn: '09:00', checkOut: '18:00' })} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                             <Edit3 size={16}/>
                          </button>
                        </td>
                      )}
                    </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {viewMode === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in zoom-in">
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl text-center">
              <Activity className="mx-auto text-indigo-600 mb-6" size={48}/>
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-2">Assiduité Cabinet</p>
              <p className="text-6xl font-black text-slate-900 mb-2">{stats.rate}%</p>
              <p className="text-indigo-600 font-black text-[11px] uppercase tracking-widest">{stats.presentToday} présents aujourd'hui</p>
           </div>
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl text-center">
              <Timer className="mx-auto text-emerald-600 mb-6" size={48}/>
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-2">Horaires de Référence</p>
              <p className="text-4xl font-black text-slate-900 mb-2">{currentUser.startTime} - {currentUser.endTime}</p>
              <p className="text-emerald-600 font-black text-[11px] uppercase tracking-widest">Lundi au Vendredi (Sam/Dim Repos)</p>
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
