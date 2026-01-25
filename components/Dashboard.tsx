
import React, { useState, useMemo } from 'react';
import { TimeEntry, Folder, Attendance, Collaborator, ServiceType, UserRole } from '../types';
import { LayoutGrid, Target, TrendingUp, Sparkles, UserCheck, Timer, Loader2, Download, Briefcase, Activity, BarChart3, PieChart } from 'lucide-react';
import { generateAIAnalysis } from '../services/geminiService';
import { exportToExcel } from '../services/csvService';

interface Props {
  entries: TimeEntry[];
  folders: Folder[];
  attendance: Attendance[];
  collaborators: Collaborator[];
  poleFilter: string;
  startDate: string;
  endDate: string;
  exerciceFilter: number;
}

const Dashboard: React.FC<Props> = ({ entries, folders, attendance, collaborators, poleFilter, startDate, endDate, exerciceFilter }) => {
  const [activeTab, setActiveTab] = useState<'global' | 'budgets' | 'equipe' | 'assiduite' | 'ia'>('global');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const filteredEntries = useMemo(() => {
    let list = entries;
    // Appliquer le filtre exercice
    if (exerciceFilter !== 0) {
      list = list.filter(e => e.exercice === exerciceFilter);
    }
    if (poleFilter !== 'all') {
      list = list.filter(e => e.service?.toLowerCase().trim() === poleFilter.toLowerCase().trim());
    }
    return list.filter(e => e.date >= startDate && e.date <= endDate);
  }, [entries, poleFilter, startDate, endDate, exerciceFilter]);

  const totalHours = filteredEntries.reduce((sum, e) => sum + e.duration, 0);

  const budgetData = useMemo(() => {
    return folders
      .filter(f => !poleFilter || poleFilter === 'all' || f.serviceType?.toLowerCase().trim() === poleFilter.toLowerCase().trim())
      .map(f => {
        const consumed = filteredEntries.filter(e => String(e.folderId) === String(f.id)).reduce((sum, e) => sum + e.duration, 0);
        const budget = f.budgetHours || 0;
        const percent = budget > 0 ? Math.round((consumed / budget) * 100) : 0;
        return { ...f, consumed, budget, percent };
      })
      .sort((a, b) => b.consumed - a.consumed);
  }, [folders, filteredEntries, poleFilter]);

  const collabData = useMemo(() => {
    return collaborators
      .filter(c => poleFilter === 'all' || c.department.toLowerCase().trim() === poleFilter.toLowerCase().trim() || c.role !== UserRole.COLLABORATOR)
      .map(c => {
        const hours = filteredEntries.filter(e => String(e.collaboratorId) === String(c.id)).reduce((sum, e) => sum + e.duration, 0);
        return { name: c.name, hours, collab: c };
      })
      .filter(c => c.hours > 0)
      .sort((a, b) => b.hours - a.hours);
  }, [collaborators, filteredEntries, poleFilter]);

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await generateAIAnalysis(filteredEntries);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-10">
      <div className="flex bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-fit">
        {[
          {id: 'global', icon: <LayoutGrid size={14}/>, label: 'Aperçu'},
          {id: 'budgets', icon: <Target size={14}/>, label: 'Suivi Dossiers'},
          {id: 'equipe', icon: <TrendingUp size={14}/>, label: 'Productivité'},
          {id: 'ia', icon: <Sparkles size={14}/>, label: 'Analyse IA'}
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'global' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Production Totale</p>
            <p className="text-4xl font-black text-indigo-600">{totalHours}h</p>
          </div>
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Dossiers Actifs</p>
            <p className="text-4xl font-black text-slate-900">{new Set(filteredEntries.map(e => e.folderId)).size}</p>
          </div>
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Alertes Budget</p>
            <p className="text-4xl font-black text-rose-600">{budgetData.filter(f => f.percent > 90).length}</p>
          </div>
        </div>
      )}

      {activeTab === 'budgets' && (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-600 border-b">
              <tr><th className="p-6">Dossier</th><th className="p-6 text-center">Consommé</th><th className="p-6">Utilisation</th><th className="p-6 text-right">Statut</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {budgetData.map(f => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="p-6 font-black text-slate-900">{f.name}</td>
                  <td className="p-6 text-center font-black text-slate-800">{f.consumed}h / {f.budget}h</td>
                  <td className="p-6">
                    <div className="w-40 bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
                      <div className={`h-full transition-all duration-500 ${f.percent > 90 ? 'bg-rose-500' : (f.serviceType?.toLowerCase().trim() === 'audit' ? 'bg-blue-600' : 'bg-orange-500')}`} style={{ width: `${Math.min(f.percent, 100)}%` }}></div>
                    </div>
                  </td>
                  <td className="p-6 text-right font-black uppercase text-[10px] text-slate-900">{f.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {budgetData.length === 0 && (
            <div className="p-20 text-center text-slate-400 font-black uppercase text-[10px] italic">Aucun dossier sur cette période</div>
          )}
        </div>
      )}

      {activeTab === 'equipe' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {collabData.map(c => (
             <div key={c.name} className={`p-8 bg-white rounded-[2rem] border-2 ${c.collab.department?.toLowerCase().trim() === 'audit' ? 'border-blue-100' : 'border-orange-100'} shadow-sm transition-all hover:shadow-md`}>
                <h4 className="font-black text-slate-900 uppercase tracking-tight">{c.name}</h4>
                <p className={`text-3xl font-black mt-4 ${c.collab.department?.toLowerCase().trim() === 'audit' ? 'text-blue-600' : 'text-orange-500'}`}>{c.hours}h</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{c.collab.department}</p>
             </div>
           ))}
        </div>
      )}

      {activeTab === 'ia' && (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden p-10 text-center">
          <button onClick={handleAIAnalysis} disabled={isAnalyzing} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl flex items-center gap-3 mx-auto hover:bg-indigo-700 transition-all">
            {isAnalyzing ? <Loader2 className="animate-spin"/> : <Sparkles/>} {isAnalyzing ? 'Analyse...' : 'Générer analyse IA'}
          </button>
          {aiAnalysis && <div className="mt-8 p-8 bg-slate-50 rounded-2xl text-left font-bold text-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner">{aiAnalysis}</div>}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
