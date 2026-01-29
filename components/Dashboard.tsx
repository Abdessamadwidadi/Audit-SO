
import React, { useState, useMemo } from 'react';
import { TimeEntry, Folder, Collaborator, ServiceType, UserRole } from '../types';
import { LayoutGrid, Target, TrendingUp, Sparkles, Loader2, Briefcase, Activity, Calendar, Clock, User } from 'lucide-react';
import { generateAIAnalysis } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  entries: TimeEntry[];
  folders: Folder[];
  attendance: any[]; 
  collaborators: Collaborator[];
  poleFilter: string;
  startDate: string;
  endDate: string;
  exerciceFilter: number;
  currentUser: Collaborator;
}

const Dashboard: React.FC<Props> = ({ entries, folders, collaborators, poleFilter, startDate, endDate, exerciceFilter, currentUser }) => {
  const isAdminOrManager = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;
  
  // Onglet par défaut : Global pour Manager, Personnel pour Collaborateur
  const [activeTab, setActiveTab] = useState<'global' | 'personal' | 'budgets' | 'equipe' | 'ia'>(isAdminOrManager ? 'global' : 'personal');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Filtrage strict : si tab Personnel ou rôle Collaborateur, on limite les entrées à l'utilisateur
  const isPersonalView = activeTab === 'personal' || !isAdminOrManager;

  const filteredEntries = useMemo(() => {
    let list = entries;
    
    if (isPersonalView) {
      list = list.filter(e => String(e.collaboratorId) === String(currentUser.id));
    }

    if (exerciceFilter !== 0) {
      list = list.filter(e => e.exercice === exerciceFilter);
    }
    if (poleFilter !== 'all') {
      list = list.filter(e => e.service?.toLowerCase().trim() === poleFilter.toLowerCase().trim());
    }
    return list;
  }, [entries, poleFilter, exerciceFilter, currentUser, isPersonalView]);

  const totalHours = filteredEntries.reduce((sum, e) => sum + e.duration, 0);

  // Statistiques Personnelles
  const personalStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);
    const targetYear = exerciceFilter !== 0 ? exerciceFilter : new Date().getFullYear();
    
    const userAllEntries = entries.filter(e => String(e.collaboratorId) === String(currentUser.id));
    
    const dayHours = userAllEntries.filter(e => e.date === today).reduce((sum, e) => sum + e.duration, 0);
    const monthHours = userAllEntries.filter(e => e.date.startsWith(currentMonth)).reduce((sum, e) => sum + e.duration, 0);
    const yearHours = userAllEntries.filter(e => e.exercice === targetYear).reduce((sum, e) => sum + e.duration, 0);

    return { dayHours, monthHours, yearHours, targetYear };
  }, [entries, currentUser.id, exerciceFilter]);

  // Données pour le graphique par client
  const clientChartData = useMemo(() => {
    const clientMap = new Map<string, { name: string; hours: number; pole: string }>();
    filteredEntries.forEach(e => {
      const folder = folders.find(f => String(f.id) === String(e.folderId));
      const clientName = folder?.name || e.folderName || "Client Inconnu";
      const pole = (folder?.serviceType || e.service || "Expertise").toLowerCase();
      
      const current = clientMap.get(clientName) || { name: clientName, hours: 0, pole };
      clientMap.set(clientName, { ...current, hours: current.hours + e.duration });
    });

    return Array.from(clientMap.values())
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
  }, [filteredEntries, folders]);

  const budgetData = useMemo(() => {
    return folders
      .filter(f => !poleFilter || poleFilter === 'all' || f.serviceType?.toLowerCase().trim() === poleFilter.toLowerCase().trim())
      .map(f => {
        const consumed = filteredEntries.filter(e => String(e.folderId) === String(f.id)).reduce((sum, e) => sum + e.duration, 0);
        const budget = f.budgetHours || 0;
        const percent = budget > 0 ? Math.round((consumed / budget) * 100) : 0;
        return { ...f, consumed, budget, percent };
      })
      .filter(f => isPersonalView ? f.consumed > 0 : true) 
      .sort((a, b) => b.consumed - a.consumed);
  }, [folders, filteredEntries, poleFilter, isPersonalView]);

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
          isAdminOrManager && {id: 'global', icon: <LayoutGrid size={14}/>, label: 'Aperçu Global'},
          {id: 'personal', icon: <User size={14}/>, label: 'Mes Statistiques'},
          {id: 'budgets', icon: <Target size={14}/>, label: isAdminOrManager ? 'Suivi Dossiers' : 'Mes Dossiers'},
          isAdminOrManager && {id: 'equipe', icon: <TrendingUp size={14}/>, label: 'Productivité Équipe'},
          {id: 'ia', icon: <Sparkles size={14}/>, label: 'Analyse IA'}
        ].filter(Boolean).map((tab: any) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {(activeTab === 'global' || activeTab === 'personal') && (
        <div className="space-y-10 animate-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {isPersonalView ? (
              <>
                <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border-2 border-slate-100 group hover:shadow-xl transition-all text-center">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">Saisie du Jour</p>
                  <p className="text-6xl font-black text-slate-900 leading-none">{personalStats.dayHours}h</p>
                  <p className="text-[10px] font-black text-emerald-500 uppercase mt-6 tracking-widest">AUJOURD'HUI</p>
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border-2 border-slate-100 group hover:shadow-xl transition-all text-center">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">Saisie du Mois</p>
                  <p className="text-6xl font-black text-slate-900 leading-none">{personalStats.monthHours}h</p>
                  <p className="text-[10px] font-black text-indigo-500 uppercase mt-6 tracking-widest">MOIS EN COURS</p>
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border-2 border-slate-100 group hover:shadow-xl transition-all text-center">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">Saisie de l'Année</p>
                  <p className="text-6xl font-black text-indigo-600 leading-none">{personalStats.yearHours}h</p>
                  <p className="text-[10px] font-black text-orange-500 uppercase mt-6 tracking-widest">EXERCICE {personalStats.targetYear}</p>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>

          {clientChartData.length > 0 && (
            <div className="bg-white p-10 rounded-[2.5rem] border-2 border-slate-100 shadow-xl">
              <div className="flex items-center gap-3 mb-8">
                <TrendingUp size={24} className="text-indigo-600" />
                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Heures par Client (Top 10)</h4>
              </div>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clientChartData} layout="vertical" margin={{ left: 20, right: 30, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }} itemStyle={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }} />
                    <Bar dataKey="hours" radius={[0, 8, 8, 0]} barSize={32}>
                      {clientChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.pole === 'audit' ? '#0056b3' : '#f97316'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'budgets' && (
        <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl overflow-hidden text-[#000000]">
          <table className="w-full text-left">
            <thead className="bg-[#1e293b] text-[10px] font-black uppercase text-white border-b">
              <tr><th className="p-6">Dossier</th><th className="p-6 text-center">Consommé</th><th className="p-6">Utilisation</th><th className="p-6 text-right">Statut</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {budgetData.map(f => (
                <tr key={f.id} className="hover:bg-slate-50 text-[#000000] font-bold">
                  <td className="p-6 uppercase">{f.name}</td>
                  <td className="p-6 text-center">{f.consumed}h {f.budget > 0 ? `/ ${f.budget}h` : ''}</td>
                  <td className="p-6">
                    <div className="w-40 bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
                      <div className={`h-full transition-all duration-500 ${f.percent > 90 ? 'bg-rose-500' : (f.serviceType?.toLowerCase().trim() === 'audit' ? 'bg-[#0056b3]' : 'bg-orange-500')}`} style={{ width: `${Math.min(f.percent, 100)}%` }}></div>
                    </div>
                  </td>
                  <td className="p-6 text-right font-black uppercase text-[10px]">{f.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'equipe' && isAdminOrManager && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {collabData.map(c => (
             <div key={c.name} className={`p-8 bg-white rounded-[2rem] border-2 ${c.collab.department?.toLowerCase().trim() === 'audit' ? 'border-[#0056b3]/10' : 'border-orange-100'} shadow-sm transition-all hover:shadow-md`}>
                <h4 className="font-black text-[#000000] uppercase tracking-tight">{c.name}</h4>
                <p className={`text-3xl font-black mt-4 ${c.collab.department?.toLowerCase().trim() === 'audit' ? 'text-[#0056b3]' : 'text-orange-500'}`}>{c.hours}h</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{c.collab.department}</p>
             </div>
           ))}
        </div>
      )}

      {activeTab === 'ia' && (
        <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl overflow-hidden p-10 text-center">
          <button onClick={handleAIAnalysis} disabled={isAnalyzing} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl flex items-center gap-3 mx-auto hover:bg-indigo-700 transition-all">
            {isAnalyzing ? <Loader2 className="animate-spin"/> : <Sparkles/>} {isAnalyzing ? 'Analyse...' : 'Générer analyse IA'}
          </button>
          {aiAnalysis && <div className="mt-8 p-8 bg-slate-50 rounded-2xl text-left font-bold text-[#000000] whitespace-pre-wrap leading-relaxed shadow-inner">{aiAnalysis}</div>}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
