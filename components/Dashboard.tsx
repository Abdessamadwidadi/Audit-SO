
import React, { useState, useMemo } from 'react';
import { TimeEntry, Folder, Attendance, Collaborator } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { LayoutGrid, Target, TrendingUp, Sparkles, UserCheck, Timer, Loader2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { generateAIAnalysis } from '../services/geminiService';

interface Props {
  entries: TimeEntry[];
  folders: Folder[];
  attendance: Attendance[];
  collaborators: Collaborator[];
  poleFilter: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Dashboard: React.FC<Props> = ({ entries, folders, attendance, collaborators, poleFilter }) => {
  const [activeTab, setActiveTab] = useState<'global' | 'budgets' | 'equipe' | 'assiduite' | 'ia'>('global');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const filteredEntries = useMemo(() => {
    if (poleFilter === 'all') return entries;
    return entries.filter(e => e.service?.toLowerCase() === poleFilter.toLowerCase());
  }, [entries, poleFilter]);

  const totalHours = filteredEntries.reduce((sum, e) => sum + e.duration, 0);

  // Budgets analysis
  const budgetData = useMemo(() => {
    return folders
      .filter(f => poleFilter === 'all' || f.serviceType.toLowerCase() === poleFilter.toLowerCase())
      .map(f => {
        const consumed = entries.filter(e => e.folderId === f.id).reduce((sum, e) => sum + e.duration, 0);
        const budget = f.budgetHours || 0;
        const remaining = budget - consumed;
        const percent = budget > 0 ? Math.round((consumed / budget) * 100) : 0;
        return { ...f, consumed, budget, remaining, percent };
      })
      .sort((a, b) => b.consumed - a.consumed);
  }, [folders, entries, poleFilter]);

  // Dossiers à risque (consommés > 90%)
  const atRiskFolders = useMemo(() => budgetData.filter(f => f.percent > 90), [budgetData]);

  // Productivity
  const collabData = useMemo(() => {
    return collaborators
      .filter(c => poleFilter === 'all' || c.department.toLowerCase() === poleFilter.toLowerCase())
      .map(c => {
        const hours = entries.filter(e => String(e.collaboratorId) === String(c.id)).reduce((sum, e) => sum + e.duration, 0);
        const uniqueFolders = new Set(entries.filter(e => String(e.collaboratorId) === String(c.id)).map(e => e.folderId)).size;
        return { name: c.name, hours, folders: uniqueFolders, pole: c.department };
      })
      .sort((a, b) => b.hours - a.hours);
  }, [collaborators, entries, poleFilter]);

  // Attendance rate
  const attendanceRate = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const totalToday = attendance.filter(a => a.date === today).length;
    const target = collaborators.filter(c => poleFilter === 'all' || c.department.toLowerCase() === poleFilter.toLowerCase()).length;
    return target > 0 ? Math.round((totalToday / target) * 100) : 0;
  }, [attendance, collaborators, poleFilter]);

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await generateAIAnalysis(filteredEntries);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-10">
      <div className="flex bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-fit overflow-x-auto hide-scrollbar">
        {[
          {id: 'global', icon: <LayoutGrid size={14}/>, label: 'Aperçu'},
          {id: 'budgets', icon: <Target size={14}/>, label: 'Suivi Dossiers'},
          {id: 'equipe', icon: <TrendingUp size={14}/>, label: 'Productivité'},
          {id: 'assiduite', icon: <UserCheck size={14}/>, label: 'Assiduité'},
          {id: 'ia', icon: <Sparkles size={14}/>, label: 'Analyse IA'}
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'global' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Heures Cumulées</p>
              <p className="text-4xl font-black text-indigo-600">{totalHours}h</p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Dossiers</p>
              <p className="text-4xl font-black text-slate-900">{budgetData.length}</p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Alertes Budget</p>
              <p className={`text-4xl font-black ${atRiskFolders.length > 0 ? 'text-rose-600' : 'text-emerald-500'}`}>{atRiskFolders.length}</p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Présence Cabinet</p>
              <p className={`text-4xl font-black ${attendanceRate < 80 ? 'text-amber-500' : 'text-emerald-500'}`}>{attendanceRate}%</p>
            </div>
          </div>

          {/* Section créative : Dossiers sous surveillance */}
          {atRiskFolders.length > 0 && (
            <div className="bg-rose-50 border border-rose-100 p-10 rounded-[3rem] animate-pulse-slow">
              <h3 className="text-rose-700 font-black uppercase text-xs tracking-widest mb-6 flex items-center gap-3"><AlertTriangle /> Vigilance : Budgets quasiment consommés</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {atRiskFolders.slice(0, 6).map(f => (
                  <div key={f.id} className="bg-white p-5 rounded-2xl border border-rose-200 shadow-sm">
                    <p className="font-black text-slate-900 text-sm">{f.name}</p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-[10px] font-black text-rose-600">{f.percent}% consommé</span>
                      <span className="text-[9px] font-bold text-slate-400">{f.remaining}h restantes</span>
                    </div>
                    <div className="w-full h-1.5 bg-rose-100 rounded-full mt-2"><div className="h-full bg-rose-600 rounded-full" style={{width: `${Math.min(100, f.percent)}%`}}></div></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'budgets' && (
        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4">
           <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
             <h3 className="font-black uppercase text-xs tracking-widest flex items-center gap-3"><Target className="text-indigo-600"/> Avancement des Budgets Heures</h3>
             <span className="text-[10px] font-black text-slate-400 uppercase">Trié par consommation</span>
           </div>
           <table className="w-full text-left">
              <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-widest border-b text-slate-900">
                 <tr><th className="p-6">Dossier</th><th className="p-6">Budget</th><th className="p-6">Réalisé</th><th className="p-6">Restant</th><th className="p-6">Progression</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {budgetData.map(f => (
                   <tr key={f.id} className="text-xs hover:bg-indigo-50/50 transition-colors text-slate-900">
                      <td className="p-6">
                        <p className="font-black">{f.name}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold">{f.number}</p>
                      </td>
                      <td className="p-6 font-black">{f.budget}h</td>
                      <td className="p-6 font-black text-indigo-600">{f.consumed}h</td>
                      <td className={`p-6 font-black ${f.remaining < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{f.remaining}h</td>
                      <td className="p-6">
                         <div className="flex items-center gap-3">
                           <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                              <div className={`h-full ${f.percent > 90 ? 'bg-rose-500' : 'bg-indigo-600'}`} style={{ width: `${Math.min(100, f.percent)}%` }}></div>
                           </div>
                           <span className="font-black text-[10px] text-slate-900">{f.percent}%</span>
                         </div>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {activeTab === 'equipe' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4">
           <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl">
             <h3 className="text-xl font-black mb-10 flex items-center gap-3 text-slate-900"><TrendingUp size={22} className="text-emerald-600"/> Charge de travail cumulée</h3>
             <div className="h-[400px]">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={collabData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis dataKey="name" style={{ fontSize: '10px', fontWeight: '900', fill: '#64748b' }} axisLine={false} tickLine={false} />
                   <YAxis hide />
                   <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '1rem' }} />
                   <Bar dataKey="hours" name="Heures" radius={[8, 8, 0, 0]} barSize={45}>
                      {collabData.map((_, index) => <Cell key={`c-${index}`} fill={COLORS[index % COLORS.length]} />)}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
             </div>
           </div>
           <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl">
              <h3 className="text-xl font-black mb-8 text-slate-900">Classement Productivité</h3>
              <div className="divide-y divide-slate-100">
                {collabData.map((c, i) => (
                  <div key={i} className="py-5 flex items-center justify-between group hover:bg-slate-50 px-4 -mx-4 rounded-xl transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">{i+1}</div>
                       <div><p className="font-black text-slate-900 text-sm">{c.name}</p><p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{c.pole}</p></div>
                    </div>
                    <div className="text-right">
                       <p className="text-xl font-black text-slate-900">{c.hours}h</p>
                       <p className="text-[9px] font-black text-slate-400 uppercase">{c.folders} Dossiers</p>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      )}

      {activeTab === 'assiduite' && (
        <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-200 animate-in slide-in-from-bottom-4 text-center">
           <UserCheck size={48} className="mx-auto text-indigo-600 mb-6" />
           <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Taux d'assiduité du jour</h3>
           <div className="relative w-48 h-48 mx-auto mb-10">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="#6366f1" strokeWidth="10" strokeDasharray={`${attendanceRate * 2.83} 283`} strokeLinecap="round" transform="rotate(-90 50 50)" />
                <text x="50" y="55" textAnchor="middle" className="text-3xl font-black fill-slate-900">{attendanceRate}%</text>
              </svg>
           </div>
           <p className="text-slate-500 font-medium max-w-sm mx-auto">Taux de présence calculé sur l'ensemble de l'effectif {poleFilter === 'all' ? 'du Cabinet' : `du pôle ${poleFilter}`}.</p>
        </div>
      )}

      {activeTab === 'ia' && (
        <div className="bg-[#0f172a] p-12 rounded-[3.5rem] shadow-2xl border border-indigo-500/20 animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-10 flex-wrap gap-6">
             <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30"><Sparkles className="text-white" size={32} /></div>
                <div>
                   <h3 className="text-2xl font-black text-white tracking-tight">Analyse IA Stratégique</h3>
                   <p className="text-indigo-400 font-bold uppercase text-[9px] tracking-widest mt-1">Généré par Gemini Pro • {poleFilter === 'all' ? 'Cabinet' : poleFilter}</p>
                </div>
             </div>
             <button onClick={handleAIAnalysis} disabled={isAnalyzing} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-white hover:text-indigo-900 transition-all flex items-center gap-3">
                {isAnalyzing ? <Loader2 className="animate-spin" size={16}/> : <Timer size={16}/>}
                {isAnalyzing ? "Analyse en cours..." : "Lancer l'audit intelligent"}
             </button>
          </div>
          {aiAnalysis ? (
            <div className="bg-indigo-950/50 p-10 rounded-3xl border border-indigo-500/10 text-indigo-50 text-base leading-relaxed whitespace-pre-line animate-in fade-in">
              {aiAnalysis}
            </div>
          ) : (
            <div className="text-center py-20 border-2 border-dashed border-indigo-500/10 rounded-3xl">
               <p className="text-indigo-400 font-bold uppercase tracking-[0.3em] text-[10px]">Une analyse stratégique complète de vos dossiers et performances cabinet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
