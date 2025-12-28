
import React, { useState } from 'react';
import { TimeEntry, Folder } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, TrendingUp, Users, Target, Briefcase, Info, UserCheck, Clock, Sparkles, RefreshCw, BrainCircuit } from 'lucide-react';
import { generateAIAnalysis } from '../services/geminiService';

interface Props {
  entries: TimeEntry[];
  folders: Folder[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Dashboard: React.FC<Props> = ({ entries, folders }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const totalHours = entries.reduce((sum, e) => sum + e.duration, 0);
  
  const folderData = (Object.entries(
    entries.reduce((acc, entry) => {
      acc[entry.folderName] = (acc[entry.folderName] || 0) + entry.duration;
      return acc;
    }, {} as Record<string, number>)
  ) as [string, number][]).map(([name, hours]) => {
    const folder = folders.find(f => f.name === name);
    const budget = folder?.budgetHours || 0;
    return {
      name,
      hours,
      budget,
      percent: budget > 0 ? Math.round((hours / budget) * 100) : 0
    };
  }).sort((a, b) => b.hours - a.hours);

  const collabData = (Object.entries(
    entries.reduce((acc, entry) => {
      acc[entry.collaboratorName] = (acc[entry.collaboratorName] || 0) + entry.duration;
      return acc;
    }, {} as Record<string, number>)
  ) as [string, number][]).map(([name, hours]) => ({ name, hours }))
   .sort((a, b) => b.hours - a.hours);

  const handleAIAnalysis = async () => {
    if (entries.length === 0) return;
    setIsAnalyzing(true);
    const result = await generateAIAnalysis(entries);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-10">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Heures</p>
          <p className="text-4xl font-black text-slate-900">{totalHours}h</p>
          <div className="mt-4 flex items-center gap-2 text-indigo-500 font-bold text-xs"><Clock size={14}/> Volume pôle</div>
        </div>
        
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Dossiers Actifs</p>
          <p className="text-4xl font-black text-slate-900">{new Set(entries.map(e => e.folderId)).size}</p>
          <div className="mt-4 flex items-center gap-2 text-emerald-500 font-bold text-xs"><Target size={14}/> Missions suivies</div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Équipe Active</p>
          <p className="text-4xl font-black text-slate-900">{collabData.length}</p>
          <div className="mt-4 flex items-center gap-2 text-amber-500 font-bold text-xs"><Users size={14}/> Collaborateurs</div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
          <button 
            onClick={handleAIAnalysis}
            disabled={isAnalyzing || entries.length === 0}
            className="w-full h-full flex flex-col items-start justify-center group/btn"
          >
            <div className="flex items-center gap-2 mb-1">
               <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Insights IA</p>
               {isAnalyzing && <RefreshCw size={10} className="text-indigo-400 animate-spin" />}
            </div>
            <p className="text-2xl font-black text-white flex items-center gap-2">
              {isAnalyzing ? "Analyse..." : "Générer Rapport"} 
              {!isAnalyzing && <Sparkles size={20} className="text-indigo-400 group-hover/btn:animate-pulse" />}
            </p>
            <div className="mt-2 text-slate-500 font-bold text-[10px] text-left">Basé sur Gemini 3 Pro</div>
          </button>
        </div>
      </div>

      {aiAnalysis && (
        <div className="bg-indigo-950 p-10 rounded-[3rem] shadow-2xl border border-indigo-500/30 animate-in slide-in-from-bottom duration-500">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
              <BrainCircuit className="text-indigo-400" size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Analyse Stratégique IA</h3>
              <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Conseils pour le Manager</p>
            </div>
          </div>
          <div className="prose prose-invert max-w-none">
            <div className="text-indigo-100 text-sm leading-relaxed whitespace-pre-line font-medium bg-indigo-900/40 p-6 rounded-2xl border border-indigo-500/10">
              {aiAnalysis}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200">
          <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Briefcase size={20}/></div>
            Temps par Dossier
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={folderData.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={120} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#64748b' }} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="hours" radius={[0, 8, 8, 0]} barSize={20}>
                   {folderData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200">
          <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><UserCheck size={20}/></div>
            Performance Collaborateurs
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collabData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#64748b' }} />
                <YAxis hide />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '15px', border: 'none'}} />
                <Bar dataKey="hours" radius={[8, 8, 0, 0]} barSize={40}>
                   {collabData.map((_, index) => (
                    <Cell key={`cell-collab-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200 lg:col-span-2">
           <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Target size={20}/></div>
            Suivi des Budgets par Dossier
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {folderData.map(f => (
              <div key={f.name} className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="max-w-[70%]">
                    <p className="text-xs font-black text-slate-900 line-clamp-1 group-hover:text-indigo-600">{f.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Budget: {f.budget || '∞'}h</p>
                  </div>
                  <span className={`text-xs font-black px-2 py-1 rounded-lg ${f.percent > 90 ? 'bg-red-100 text-red-600' : 'bg-white text-indigo-600'}`}>
                    {f.hours}h
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-2">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${f.percent > 90 ? 'bg-red-500' : 'bg-indigo-500'}`}
                    style={{ width: `${Math.min(100, f.percent)}%` }}
                  ></div>
                </div>
                <p className="text-[9px] font-black text-slate-400 text-right uppercase">{f.percent}% consommé</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
