
import React, { useState } from 'react';
import { TimeEntry, Folder, Attendance, Collaborator } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Clock, Target, Users, Briefcase, Sparkles, RefreshCw, BrainCircuit, UserCheck, Calendar, TrendingUp } from 'lucide-react';
import { generateAIAnalysis } from '../services/geminiService';

interface Props {
  entries: TimeEntry[];
  folders: Folder[];
  attendance: Attendance[];
  collaborators: Collaborator[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Dashboard: React.FC<Props> = ({ entries, folders, attendance, collaborators }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const totalHours = entries.reduce((sum, e) => sum + e.duration, 0);
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter(a => a.date === today);

  // Données par dossier avec calcul du restant
  const folderData = (Object.entries(
    entries.reduce((acc, entry) => {
      acc[entry.folderName] = (acc[entry.folderName] || 0) + entry.duration;
      return acc;
    }, {} as Record<string, number>)
  ) as [string, number][]).map(([name, hours]) => {
    const folder = folders.find(f => f.name === name);
    const budget = folder?.budgetHours || 0;
    const remaining = Math.max(0, budget - hours);
    return { name, consommé: hours, budget, restant: remaining, percent: budget > 0 ? Math.round((hours / budget) * 100) : 0 };
  }).sort((a, b) => b.consommé - a.consommé).slice(0, 10);

  // Données par collaborateur (Productivité)
  const collabData = (Object.entries(
    entries.reduce((acc, entry) => {
      acc[entry.collaboratorName] = (acc[entry.collaboratorName] || 0) + entry.duration;
      return acc;
    }, {} as Record<string, number>)
  ) as [string, number][]).map(([name, hours]) => ({ name, hours })).sort((a, b) => b.hours - a.hours);

  const handleAIAnalysis = async () => {
    if (entries.length === 0) return;
    setIsAnalyzing(true);
    const result = await generateAIAnalysis(entries);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <p className="text-slate-900 text-[10px] font-black uppercase tracking-widest mb-1">Total Heures Saisies</p>
          <p className="text-4xl font-black text-indigo-600">{totalHours}h</p>
          <div className="mt-4 flex items-center gap-2 text-slate-500 font-bold text-xs"><Clock size={14}/> Depuis début</div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <p className="text-slate-900 text-[10px] font-black uppercase tracking-widest mb-1">Présents Aujourd'hui</p>
          <p className="text-4xl font-black text-slate-900">{todayAttendance.length}</p>
          <div className="mt-4 flex items-center gap-2 text-emerald-600 font-bold text-xs"><UserCheck size={14}/> Pointages actifs</div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <p className="text-slate-900 text-[10px] font-black uppercase tracking-widest mb-1">Collaborateurs</p>
          <p className="text-4xl font-black text-slate-900">{collaborators.length}</p>
          <div className="mt-4 flex items-center gap-2 text-amber-600 font-bold text-xs"><Users size={14}/> Équipe active</div>
        </div>
        <div className="bg-indigo-900 p-8 rounded-[2.5rem] shadow-2xl hover:bg-slate-900 transition-all cursor-pointer group" onClick={handleAIAnalysis}>
           <div className="flex items-center gap-2 mb-1">
              <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Insights Avancés</p>
              {isAnalyzing && <RefreshCw size={10} className="text-indigo-400 animate-spin" />}
            </div>
            <p className="text-2xl font-black text-white flex items-center gap-2">Générer Analyse IA <Sparkles size={18} className="text-indigo-400 group-hover:scale-125 transition-transform"/></p>
        </div>
      </div>

      {aiAnalysis && (
        <div className="bg-indigo-950 p-10 rounded-[3rem] shadow-2xl border border-indigo-500/30 animate-in slide-in-from-bottom duration-500">
          <div className="flex items-center gap-4 mb-6">
            <BrainCircuit className="text-indigo-400" size={28} />
            <h3 className="text-xl font-black text-white">Analyse Stratégique</h3>
          </div>
          <div className="bg-indigo-900/40 p-8 rounded-2xl border border-indigo-500/10 text-indigo-50 text-base leading-relaxed whitespace-pre-line">
            {aiAnalysis}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Graphique Dossiers avec Restant */}
        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-200/50">
          <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-slate-900"><Briefcase size={20} className="text-indigo-600"/> Charge & Restant par Dossier</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={folderData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={120} style={{ fontSize: '10px', fontWeight: '900', color: '#0f172a' }} />
                <Tooltip 
                   contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                   cursor={{ fill: '#f8fafc' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold', fontSize: '12px' }} />
                <Bar dataKey="consommé" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} barSize={20} />
                <Bar dataKey="restant" stackId="a" fill="#e2e8f0" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique Collaborateurs */}
        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-200/50">
          <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-slate-900"><TrendingUp size={20} className="text-emerald-600"/> Productivité par Collaborateur</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collabData}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" style={{ fontSize: '10px', fontWeight: '900' }} />
                <YAxis hide />
                <Tooltip 
                   cursor={{ fill: '#f8fafc' }}
                   contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="hours" name="Heures cumulées" radius={[6, 6, 0, 0]} barSize={40}>
                   {collabData.map((_, index) => <Cell key={`c-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-200/50">
        <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-slate-900"><Target size={20} className="text-indigo-600"/> Détails des Budgets Dossiers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {folderData.map(f => (
            <div key={f.name} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
              <div>
                <p className="font-black text-slate-900 text-sm leading-tight mb-2 uppercase">{f.name}</p>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-grow h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${f.percent > 90 ? 'bg-red-500' : 'bg-indigo-600'}`} style={{ width: `${Math.min(100, f.percent)}%` }}></div>
                  </div>
                  <span className="text-[10px] font-black text-slate-900">{f.percent}%</span>
                </div>
              </div>
              <div className="flex justify-between items-end border-t border-slate-200 pt-4">
                 <div>
                   <p className="text-[9px] font-black text-slate-400 uppercase">Saisi</p>
                   <p className="font-black text-indigo-600">{f.consommé}h</p>
                 </div>
                 <div className="text-right">
                   <p className="text-[9px] font-black text-slate-400 uppercase">Restant</p>
                   <p className={`font-black ${f.restant < 5 ? 'text-red-500' : 'text-slate-900'}`}>{f.restant}h</p>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
