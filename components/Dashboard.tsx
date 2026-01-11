import React, { useState, useMemo } from 'react';
import { TimeEntry, Folder, Attendance, Collaborator } from '../types';
import { LayoutGrid, Target, TrendingUp, Sparkles, UserCheck, Timer, Loader2, Download, Briefcase, Activity } from 'lucide-react';
import { generateAIAnalysis } from '../services/geminiService';
import { exportToExcel } from '../services/csvService';

interface Props {
  entries: TimeEntry[];
  folders: Folder[];
  attendance: Attendance[];
  collaborators: Collaborator[];
  poleFilter: string;
}

const Dashboard: React.FC<Props> = ({ entries, folders, attendance, collaborators, poleFilter }) => {
  const [activeTab, setActiveTab] = useState<'global' | 'budgets' | 'equipe' | 'assiduite' | 'ia'>('global');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Correction : S'assurer que le filtrage par pôle est insensible à la casse
  const filteredEntries = useMemo(() => {
    if (!poleFilter || poleFilter === 'all') return entries;
    return entries.filter(e => e.service?.toLowerCase() === poleFilter.toLowerCase());
  }, [entries, poleFilter]);

  const totalHours = filteredEntries.reduce((sum, e) => sum + e.duration, 0);

  const budgetData = useMemo(() => {
    return folders
      .filter(f => !poleFilter || poleFilter === 'all' || f.serviceType?.toLowerCase() === poleFilter.toLowerCase())
      .map(f => {
        // Correction : Utilisation de String() pour éviter les erreurs de comparaison d'ID
        const consumed = entries.filter(e => String(e.folderId) === String(f.id)).reduce((sum, e) => sum + e.duration, 0);
        const budget = f.budgetHours || 0;
        const percent = budget > 0 ? Math.round((consumed / budget) * 100) : 0;
        return { ...f, consumed, budget, percent };
      })
      .sort((a, b) => b.consumed - a.consumed);
  }, [folders, entries, poleFilter]);

  const atRiskFolders = useMemo(() => budgetData.filter(f => f.percent > 90), [budgetData]);

  const collabData = useMemo(() => {
    return collaborators
      .filter(c => !poleFilter || poleFilter === 'all' || c.department?.toLowerCase() === poleFilter.toLowerCase())
      .map(c => {
        const userEntries = entries.filter(e => String(e.collaboratorId) === String(c.id));
        const hours = userEntries.reduce((sum, e) => sum + e.duration, 0);
        const foldersCount = new Set(userEntries.map(e => e.folderId)).size;
        return { name: c.name, hours, foldersCount };
      })
      .sort((a, b) => b.hours - a.hours);
  }, [collaborators, entries, poleFilter]);

  const attendanceStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const activeCollabs = collaborators.filter(c => !poleFilter || poleFilter === 'all' || c.department?.toLowerCase() === poleFilter.toLowerCase());
    const presentToday = attendance.filter(a => a.date === today && activeCollabs.some(c => String(c.id) === String(a.collaboratorId))).length;
    const target = activeCollabs.length;
    const rate = target > 0 ? Math.round((presentToday / target) * 100) : 0;
    return { rate, present: presentToday, total: target };
  }, [attendance, collaborators, poleFilter]);

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await generateAIAnalysis(filteredEntries);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const handleExportBudgets = () => {
    const data = [
      ["DOSSIER", "NUMÉRO", "PÔLE", "BUDGET PRÉVU (H)", "HEURES CONSOMMÉES (H)", "UTILISATION (%)"],
      ...budgetData.map(f => [f.name, f.number, f.serviceType, f.budget, f.consumed, `${f.percent}%`])
    ];
    exportToExcel(`Pilotage_Budgets_MSO_${new Date().toISOString().split('T')[0]}`, data);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Heures Cumulées</p>
            <p className="text-4xl font-black text-indigo-600">{totalHours}h</p>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Dossiers Actifs</p>
            <p className="text-4xl font-black text-slate-900">{budgetData.length}</p>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Alertes Budget</p>
            <p className={`text-4xl font-black ${atRiskFolders.length > 0 ? 'text-rose-600' : 'text-emerald-500'}`}>{atRiskFolders.length}</p>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Assiduité</p>
            <p className={`text-4xl font-black ${attendanceStats.rate < 80 ? 'text-amber-500' : 'text-emerald-500'}`}>{attendanceStats.rate}%</p>
          </div>
        </div>
      )}

      {activeTab === 'budgets' && (
        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3"><Target className="text-indigo-600" /> Suivi des budgets temps</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Comparaison Heures Budgétées vs Heures Consommées</p>
            </div>
            <button onClick={handleExportBudgets} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-3 hover:bg-slate-900 transition-all">
              <Download size={16}/> EXPORTER BUDGETS XLS
            </button>
          </div>
          <div className="overflow-x-auto">
            {budgetData.length > 0 ? (
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">
                  <tr>
                    <th className="p-6">Dossier</th>
                    <th className="p-6">Numéro</th>
                    <th className="p-6">Budget</th>
                    <th className="p-6">Consommé</th>
                    <th className="p-6">Progression</th>
                    <th className="p-6 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {budgetData.map(f => (
                    <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-6 font-bold text-slate-900">{f.name}</td>
                      <td className="p-6 font-black text-slate-400 text-xs">{f.number}</td>
                      <td className="p-6 font-black text-slate-900">{f.budget}h</td>
                      <td className="p-6 font-black text-indigo-600">{f.consumed}h</td>
                      <td className="p-6">
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-1000 ${f.percent > 100 ? 'bg-rose-600' : f.percent > 90 ? 'bg-amber-500' : 'bg-indigo-600'}`} style={{ width: `${Math.min(f.percent, 100)}%` }}></div>
                        </div>
                        <p className="text-[9px] font-black mt-1 text-slate-400">{f.percent}%</p>
                      </td>
                      <td className="p-6 text-right">
                         <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${f.percent > 100 ? 'bg-rose-100 text-rose-700' : f.percent > 90 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                           {f.percent > 100 ? 'Dépassé' : f.percent > 90 ? 'Alerte' : 'Sain'}
                         </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-20 text-center">
                 <Briefcase size={40} className="mx-auto text-slate-100 mb-4" />
                 <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Aucun dossier trouvé pour le pôle sélectionné</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'equipe' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl">
             <div className="flex items-center gap-4 mb-8">
               <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600"><Activity /></div>
               <div>
                 <h3 className="text-xl font-black text-slate-900 tracking-tight">Classement Performance</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Heures saisies par collaborateur</p>
               </div>
             </div>
             <div className="space-y-6">
               {collabData.length > 0 ? collabData.map((c, i) => (
                 <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <div className="flex items-center gap-4">
                     <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-black text-indigo-600 text-xs">#{i+1}</div>
                     <div>
                       <p className="font-bold text-slate-900 text-sm">{c.name}</p>
                       <p className="text-[9px] text-slate-400 font-bold uppercase">{c.foldersCount} dossiers traités</p>
                     </div>
                   </div>
                   <div className="text-right">
                     <p className="text-xl font-black text-indigo-600">{c.hours}h</p>
                     <p className="text-[8px] text-slate-400 font-black uppercase">Volume Total</p>
                   </div>
                 </div>
               )) : (
                 <div className="text-center py-10 text-slate-300 uppercase text-[10px] font-black tracking-widest">Aucune donnée d'équipe</div>
               )}
             </div>
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl flex flex-col justify-center text-center">
             <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-600 mx-auto mb-6"><TrendingUp size={40} /></div>
             <h3 className="text-3xl font-black text-slate-900 mb-2">Productivité Cabinet</h3>
             <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-8">Management SO • {poleFilter === 'all' ? 'Cabinet' : poleFilter}</p>
             <div className="grid grid-cols-2 gap-6">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                   <p className="text-2xl font-black text-slate-900">{collabData.length > 0 ? Math.round(totalHours / collabData.length) : 0}h</p>
                   <p className="text-[9px] font-black text-slate-400 uppercase mt-1">Moyenne par Collab</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                   <p className="text-2xl font-black text-slate-900">{budgetData.length > 0 ? Math.round(totalHours / budgetData.length) : 0}h</p>
                   <p className="text-[9px] font-black text-slate-400 uppercase mt-1">Moyenne par Dossier</p>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'assiduite' && (
        <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-200 text-center animate-in zoom-in">
           <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <UserCheck size={40} className="text-indigo-600" />
           </div>
           <h3 className="text-3xl font-black text-slate-900 mb-2">Taux d'assiduité du jour</h3>
           <p className="text-indigo-600 font-black text-sm uppercase tracking-widest mb-10">
              {attendanceStats.present} présents sur {attendanceStats.total} collaborateurs
           </p>
           
           <div className="relative w-64 h-64 mx-auto mb-10">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="#6366f1" strokeWidth="10" strokeDasharray={`${attendanceStats.rate * 2.83} 283`} strokeLinecap="round" transform="rotate(-90 50 50)" className="transition-all duration-1000 ease-out" />
                <text x="50" y="55" textAnchor="middle" className="text-3xl font-black fill-slate-900">{attendanceStats.rate}%</text>
              </svg>
           </div>
           
           <div className="bg-slate-50 p-6 rounded-3xl max-w-sm mx-auto border border-slate-100">
              <p className="text-slate-500 font-bold text-[11px] leading-relaxed">
                Ce taux est calculé sur l'effectif actuel du pôle <span className="text-indigo-600 font-black uppercase">{poleFilter === 'all' ? 'Cabinet' : poleFilter}</span>.
              </p>
           </div>
        </div>
      )}

      {activeTab === 'ia' && (
        <div className="bg-[#0f172a] p-12 rounded-[3.5rem] shadow-2xl border border-indigo-500/20 text-white">
          <div className="flex items-center justify-between mb-10">
             <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center"><Sparkles className="text-white" size={32} /></div>
                <div>
                   <h3 className="text-2xl font-black tracking-tight">Analyse IA Stratégique</h3>
                   <p className="text-indigo-400 font-bold uppercase text-[9px] tracking-widest">Audit Gemini Pro • Cabinet MSO</p>
                </div>
             </div>
             <button onClick={handleAIAnalysis} disabled={isAnalyzing} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-white hover:text-indigo-900 transition-all flex items-center gap-3">
                {isAnalyzing ? <Loader2 className="animate-spin" size={16}/> : <Timer size={16}/>}
                {isAnalyzing ? "Analyse..." : "Générer l'audit"}
             </button>
          </div>
          {aiAnalysis ? (
            <div className="bg-white/5 p-10 rounded-3xl border border-white/10 text-slate-200 text-base leading-relaxed whitespace-pre-line prose prose-invert max-w-none">
              {aiAnalysis}
            </div>
          ) : (
            <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
               <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Cliquez pour lancer l'analyse intelligente de vos données.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;