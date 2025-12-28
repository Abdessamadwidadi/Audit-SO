
import React, { useState, useRef } from 'react';
import { Upload, X, FileType, Info, Download, CheckCircle2, AlertCircle, Table, ChevronRight, Ban } from 'lucide-react';
import { readExcelOrCSV, downloadTemplate } from '../services/csvService';
import { ServiceType } from '../types';

interface Props {
  title: string;
  onImport: (data: string[][]) => void;
  onClose: () => void;
  type: 'collabs' | 'folders';
}

interface ValidationError {
  row: number;
  col: number;
  message: string;
}

const ImportModal: React.FC<Props> = ({ title, onImport, onClose, type }) => {
  const [rawData, setRawData] = useState<string[][] | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateData = (data: string[][]) => {
    const newErrors: ValidationError[] = [];
    const rows = data.slice(1); // On ignore l'en-tête

    rows.forEach((row, rowIndex) => {
      const realIndex = rowIndex + 1;
      
      if (type === 'collabs') {
        if (!row[0]) newErrors.push({ row: realIndex, col: 0, message: "Nom manquant" });
        if (row[1] && !Object.values(ServiceType).includes(row[1] as any)) {
          newErrors.push({ row: realIndex, col: 1, message: "Pôle inconnu (Audit/Expertise attendu)" });
        }
        if (row[2] && isNaN(Date.parse(row[2]))) {
          newErrors.push({ row: realIndex, col: 2, message: "Date invalide (Format AAAA-MM-JJ)" });
        }
      } else {
        if (!row[0]) newErrors.push({ row: realIndex, col: 0, message: "Nom dossier manquant" });
        if (!row[1]) newErrors.push({ row: realIndex, col: 1, message: "Numéro de dossier requis" });
        if (row[3] && !Object.values(ServiceType).includes(row[3] as any)) {
          newErrors.push({ row: realIndex, col: 3, message: "Service inconnu" });
        }
      }
    });

    setErrors(newErrors);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const data = await readExcelOrCSV(file);
      setRawData(data);
      validateData(data);
    } catch (err) {
      alert("Erreur lors de la lecture du fichier. Assurez-vous qu'il s'agit d'un fichier Excel ou CSV valide.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalConfirm = () => {
    if (errors.length > 0) {
      if (!confirm(`Il y a ${errors.length} erreur(s) dans vos données. Voulez-vous ignorer les erreurs et importer quand même ?`)) {
        return;
      }
    }
    if (rawData) {
      onImport(rawData);
    }
  };

  const getError = (r: number, c: number) => errors.find(e => e.row === r && e.col === c);

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-5xl max-h-[90vh] shadow-2xl animate-in zoom-in duration-300 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Upload className="text-indigo-600" /> {title}
            </h3>
            <p className="text-slate-400 text-sm font-medium">Support Excel (.xlsx) et CSV</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white text-slate-400 hover:text-red-500 rounded-2xl transition-all shadow-sm border border-slate-100">
            <X size={24} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-8">
          {!rawData ? (
            <div className="h-full flex flex-col items-center justify-center py-20 space-y-10">
              <div className="bg-indigo-50 p-10 rounded-[3rem] border-4 border-dashed border-indigo-200 text-center max-w-lg w-full">
                <FileType size={64} className="mx-auto text-indigo-400 mb-6" />
                <h4 className="text-xl font-black text-slate-800 mb-2">Déposez votre fichier ici</h4>
                <p className="text-slate-500 text-sm mb-8">Nous acceptons les fichiers Excel (.xlsx) pour plus de confort.</p>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv, .xlsx, .xls" className="hidden" />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-600 transition-all flex items-center gap-3 mx-auto shadow-xl"
                  disabled={isProcessing}
                >
                  {isProcessing ? "Analyse en cours..." : "CHOISIR UN FICHIER"}
                </button>
              </div>

              <div className="flex gap-6">
                <button onClick={() => downloadTemplate(type)} className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 hover:underline">
                  <Download size={14}/> Télécharger le modèle Excel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Table size={16}/> Prévisualisation des données ({rawData.length - 1} lignes)
                </h4>
                {errors.length > 0 && (
                  <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 border border-red-100">
                    <AlertCircle size={14}/> {errors.length} erreurs détectées
                  </div>
                )}
              </div>

              <div className="border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        {rawData[0].map((h, i) => (
                          <th key={i} className="p-4 font-black text-slate-400 uppercase text-[10px] whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rawData.slice(1, 11).map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-slate-50/50">
                          {row.map((cell, colIndex) => {
                            const err = getError(rowIndex + 1, colIndex);
                            return (
                              <td key={colIndex} className={`p-4 font-medium transition-colors ${err ? 'bg-red-50 text-red-700' : 'text-slate-600'}`}>
                                <div className="flex flex-col">
                                  <span>{cell?.toString() || '-'}</span>
                                  {err && <span className="text-[9px] font-black uppercase mt-1 text-red-500">{err.message}</span>}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rawData.length > 11 && (
                  <div className="p-4 bg-slate-50 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-200">
                    + {rawData.length - 11} autres lignes...
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setRawData(null)} className="flex-1 px-8 py-5 bg-slate-100 text-slate-600 font-black rounded-3xl hover:bg-slate-200 transition-all uppercase tracking-widest text-xs">
                  Changer de fichier
                </button>
                <button 
                  onClick={handleFinalConfirm}
                  className="flex-[2] px-8 py-5 bg-indigo-600 text-white font-black rounded-3xl hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                >
                  <CheckCircle2 size={18} />
                  Confirmer l'importation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
