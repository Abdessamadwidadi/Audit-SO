
import React, { useState, useMemo } from 'react';
import { TimeEntry, Folder, Attendance, Collaborator, ServiceType } from '../types';
import { LayoutGrid, Target, TrendingUp, Sparkles, UserCheck, Timer, Loader2, Download, Briefcase, Activity, BarChart3, PieChart } from 'lucide-react';
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

  const filteredEntries = useMemo(() => {
    if (!poleFilter || poleFilter === 'all') return entries;
    return entries.filter(e => e.service?.toLowerCase() === poleFilter.toLowerCase());
  }, [entries, poleFilter]);

  const totalHours = filteredEntries.reduce((sum, e) => sum + e.duration, 0);

  const budgetData = useMemo(() => {
    return folders
      .filter(f => !poleFilter || poleFilter === 'all' || f.serviceType?.toLowerCase() === poleFilter.toLowerCase())
      .map(f => {
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

  const activeFoldersCount = useMemo(() => {
     return new Set(filteredEntries.map(e => e.folderId)).size;
  }, [filteredEntries]);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:border-indigo-500 transition-all">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Heures Cumulées</p>
            <p className="text-4xl font-black text-indigo-600">{totalHours}h</p>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:border-indigo-500 transition-all">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Dossiers Impactés</p>
            <p className="text-4xl font-black text-slate-900">{activeFoldersCount}</p>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:border-indigo-500 transition-all">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Alertes Budget</p>
            <p className={`text-4xl font-black ${atRiskFolders.length > 0 ? 'text-rose-600' : 'text-emerald-500'}`}>{atRiskFolders.length}</p>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:border-indigo-500 transition-all">
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
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Saisie en temps réel vs Budget prévisionnel</p>
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
                    <tr key={f.id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="p-6 font-bold text-slate-900">{f.name}</td>
                      <td className="p-6 font-black text-indigo-600/40 text-xs">{f.number}</td>
                      <td className="p-6 font-black text-indigo-600">{f.budget}h</td>
                      <td className="p-6 font-black text-slate-900">{f.consumed}h</td>
                      <td className="p-6">
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${f.percent > 90 ? 'bg-rose-500' : 'bg-indigo-600'}`} 
                            style={{ width: `${Math.min(f.percent, 100)}%` }}
                          ></div>
                        </div>
                        <p className="text-[9px] font-black text-slate-400 mt-1 uppercase tracking-widest">{f.percent}% Utilisé</p>
                      </td>
                      <td className="p-6 text-right">
                         <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${f.percent > 90 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                           {f.percent > 90 ? 'Attention' : 'OK'}
                         </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-20 text-center text-slate-300 font-black uppercase tracking-widest italic">Aucun dossier à afficher</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'equipe' && (
        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 p-10">
           <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3 mb-8"><TrendingUp className="text-indigo-600" /> Performance de l'équipe</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collabData.map(c => (
                <div key={c.name} className="p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-500 transition-all">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Collaborateur</p>
                  <h4 className="text-lg font-black text-slate-900 mb-4">{c.name}</h4>
                  <div className="flex justify-between items-end">
                     <div>
                       <p className="text-3xl font-black text-indigo-600">{c.hours}h</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase">Heures produites</p>
                     </div>
                     <div className="text-right">
                       <p className="text-xl font-black text-slate-900">{c.foldersCount}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase">Dossiers</p>
                     </div>
                  </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'assiduite' && (
        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 p-10 flex flex-col items-center">
           <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3 mb-8 w-full"><UserCheck className="text-indigo-600" /> Suivi de l'assiduité</h3>
           <div className="flex flex-col items-center justify-center py-10">
              <div className="relative w-64 h-64 flex items-center justify-center">
                 <svg viewBox="0 0 256 256" className="w-full h-full transform -rotate-90 overflow-visible">
                    <circle cx="128" cy="128" r="85" stroke="currentColor" strokeWidth="20" fill="transparent" className="text-slate-100" />
                    <circle 
                      cx="128" cy="128" r="85" 
                      stroke="currentColor" 
                      strokeWidth="20" 
                      fill="transparent" 
                      strokeDasharray={2 * Math.PI * 85} 
                      strokeDashoffset={2 * Math.PI * 85 * (1 - attendanceStats.rate / 100)} 
                      className="text-indigo-600 transition-all duration-1000" 
                      strokeLinecap="round" 
                    />
                 </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-6xl font-black text-slate-900">{attendanceStats.rate}%</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PRÉSENCE</p>
                 </div>
              </div>
              <p className="mt-12 text-slate-900 font-black text-2xl">{attendanceStats.present} présents sur {attendanceStats.total}</p>
           </div>
        </div>
      )}

      {activeTab === 'ia' && (
        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4">
           <div className="p-10 border-b bg-indigo-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black tracking-tight flex items-center gap-3"><Sparkles /> Analyse Prédictive IA</h3>
                <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1">Intelligence Artificielle au service du pilotage</p>
              </div>
              <button 
                onClick={handleAIAnalysis} 
                disabled={isAnalyzing}
                className={`px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-3 transition-all hover:bg-slate-900 hover:text-white ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
                {isAnalyzing ? 'ANALYSE EN COURS...' : 'GÉNÉRER L\'ANALYSE'}
              </button>
           </div>
           <div className="p-12 min-h-[400px]">
              {aiAnalysis ? (
                <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 whitespace-pre-wrap text-slate-700 font-bold text-sm leading-relaxed animate-in fade-in duration-700">
                  {aiAnalysis}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-20">
                   <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-600">
                      <Sparkles size={40} />
                   </div>
                   <p className="text-xl font-black text-slate-900 tracking-tight">Prêt pour l'analyse stratégique ?</p>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
