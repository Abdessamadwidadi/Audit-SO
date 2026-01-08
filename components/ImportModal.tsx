
import React, { useState, useRef } from 'react';
import { Upload, X, FileType, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { readExcel, downloadTemplate } from '../services/csvService';
import { ServiceType, UserRole } from '../types';

interface Props {
  title: string;
  onImport: (data: string[][]) => void;
  onClose: () => void;
  type: 'collabs' | 'folders';
}

const ImportModal: React.FC<Props> = ({ title, onImport, onClose, type }) => {
  const [rawData, setRawData] = useState<string[][] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const data = await readExcel(file);
      setRawData(data);
    } catch (err) {
      alert("Erreur lecture Excel. Vérifiez le format .xlsx");
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center z-[300] p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-2xl font-black flex items-center gap-3"><Upload className="text-indigo-600"/> {title}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500"><X size={24}/></button>
        </div>
        <div className="p-12 text-center">
          {!rawData ? (
            <div className="space-y-8">
              <div className="p-12 border-4 border-dashed border-slate-100 rounded-[3rem]">
                <FileType size={64} className="mx-auto text-indigo-200 mb-6"/>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx" className="hidden"/>
                <button onClick={() => fileInputRef.current?.click()} className="px-10 py-5 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl">Choisir fichier Excel (.xlsx)</button>
              </div>
              <button onClick={() => downloadTemplate(type)} className="text-indigo-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 mx-auto"><Download size={14}/> Télécharger le modèle Excel</button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="bg-emerald-50 p-8 rounded-3xl text-emerald-800 font-bold flex items-center justify-center gap-3">
                <CheckCircle2 size={24}/> {rawData.length - 1} lignes détectées prêtes à l'importation.
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setRawData(null)} className="flex-1 p-5 bg-slate-100 rounded-2xl font-black uppercase text-xs">Changer</button>
                 <button onClick={() => onImport(rawData)} className="flex-[2] p-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-indigo-200">Confirmer l'importation</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
