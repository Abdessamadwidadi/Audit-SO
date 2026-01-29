
import * as XLSX from 'xlsx';
import { TimeEntry, ServiceType, Folder, Collaborator } from '../types';

export const readExcel = (file: File): Promise<any[][]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
        
        const cleanedRows = rawRows.map(row => 
          row.map(cell => {
            if (cell instanceof Date && !isNaN(cell.getTime())) {
              return cell.toISOString().split('T')[0];
            }
            return cell;
          })
        );
        resolve(cleanedRows);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
};

export const exportToExcel = (filename: string, data: any[][]) => {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Donnees");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

/**
 * Format 1 : EXPORT SIMPLE (Analytique par Dossier)
 * Structure par bloc avec PÔLE ajouté et DATE au format DD/MM/YYYY.
 */
export const exportSimpleByFolder = (filename: string, entries: TimeEntry[], folders: Folder[], collaborators: Collaborator[]) => {
  const data: any[][] = [];

  // En-tête global du fichier pour identification
  data.push(["EXPORT ANALYTIQUE DES TEMPS - CABINET MANAGEMENT SO"]);
  data.push([]);

  // Groupement par dossier
  const folderGroups = new Map<string, TimeEntry[]>();
  entries.forEach(e => {
    const group = folderGroups.get(e.folderId) || [];
    group.push(e);
    folderGroups.set(e.folderId, group);
  });

  Array.from(folderGroups.keys()).forEach(folderId => {
    const folder = folders.find(f => String(f.id) === String(folderId));
    const folderEntries = folderGroups.get(folderId)!;
    
    // Règle PRUNAY/PRUNNAY = AUDIT (insensible casse et double N)
    const folderNameUpper = (folder?.name || "").toUpperCase();
    const isPrunay = folderNameUpper.includes("PRUNAY") || folderNameUpper.includes("PRUNNAY");
    const isAudit = isPrunay || folder?.serviceType?.toLowerCase() === 'audit';
    const poleLabel = isAudit ? "AUDIT" : "EXPERTISE";

    // 1. En-tête de Bloc (PÔLE | N° DOSSIER | NOM DOSSIER)
    data.push([poleLabel, folder?.number || "", folder?.name || "Sans nom", "", "", ""]);
    
    // 2. En-tête des colonnes détail
    data.push(["DATE", "EXERCICE", "COLLABORATEUR", "DESCRIPTION", "DURÉE (H)", "pourcentage"]);

    const collabSummary = new Map<string, number>();
    const sortedEntries = [...folderEntries].sort((a, b) => a.date.localeCompare(b.date));
    
    // Détail des entrées
    sortedEntries.forEach(e => {
      const collab = collaborators.find(c => String(c.id) === String(e.collaboratorId));
      let collabName = collab?.name || "Inconnu";
      
      if (isAudit && !collabName.includes("- CAC")) {
        collabName += " - CAC";
      }
      
      const exFormatted = isAudit ? `CAC${e.exercice}` : `EX${e.exercice}`;
      
      // Formatage de la date en DD/MM/YYYY
      const dateParts = e.date.split('-');
      const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : e.date;

      data.push([
        formattedDate, 
        exFormatted, 
        collabName, 
        e.description, 
        e.duration,
        "" 
      ]);

      collabSummary.set(collabName, (collabSummary.get(collabName) || 0) + e.duration);
    });

    // 3. Synthèse par Collaborateur
    data.push([]); 
    data.push(["", "SYNTHÈSE PAR COLLABORATEUR", "", "", "", ""]);
    
    const folderTotal = Array.from(collabSummary.values()).reduce((a, b) => a + b, 0);

    Array.from(collabSummary.entries()).forEach(([name, total]) => {
      const percent = folderTotal > 0 ? Math.round((total / folderTotal) * 1000) / 10 : 0;
      data.push(["", "", name, "heures", total, `${percent}%`]);
    });

    // 4. Espacement
    data.push([]);
    data.push([]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 30 }, { wch: 50 }, { wch: 10 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Export Analytique");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

/**
 * Format 2 : EXPORT REGROUPÉ (Synthèse Portefeuille)
 * PÔLE | N° DOSSIER | NOM DOSSIER | COLLABORATEUR | EXERCICE | HEURES
 */
export const exportSummaryCabinet = (filename: string, entries: TimeEntry[], folders: Folder[], collaborators: Collaborator[]) => {
  const data: any[][] = [];
  
  // En-tête global du fichier
  data.push(["SYNTHÈSE PORTEFEUILLE CABINET - MANAGEMENT SO"]);
  data.push([]);
  
  // Ligne d'en-tête du tableau
  data.push(["PÔLE", "N° DOSSIER", "NOM DOSSIER", "COLLABORATEUR", "EXERCICE", "HEURES"]);

  // Tri par pôle (Audit et Prunay d'abord)
  const sortedFolders = [...folders].sort((a, b) => {
    const nameA = (a.name || "").toUpperCase();
    const nameB = (b.name || "").toUpperCase();
    const isAAudit = a.serviceType === ServiceType.AUDIT || nameA.includes("PRUNAY") || nameA.includes("PRUNNAY");
    const isBAudit = b.serviceType === ServiceType.AUDIT || nameB.includes("PRUNAY") || nameB.includes("PRUNNAY");
    if (isAAudit && !isBAudit) return -1;
    if (!isAAudit && isBAudit) return 1;
    return (a.number || "").localeCompare(b.number || "");
  });

  sortedFolders.forEach(folder => {
    const folderEntries = entries.filter(e => String(e.folderId) === String(folder.id));
    if (folderEntries.length === 0) return;

    // Règle PRUNAY = AUDIT
    const nameUpper = (folder.name || "").toUpperCase();
    const isAudit = folder.serviceType === ServiceType.AUDIT || nameUpper.includes("PRUNAY") || nameUpper.includes("PRUNNAY");
    const poleLabel = isAudit ? "AUDIT" : "EXPERTISE";
    
    const totalHours = folderEntries.reduce((acc, e) => acc + e.duration, 0);

    // 1. Ligne de synthèse dossier (TOTAL)
    data.push([
      poleLabel,
      folder.number,
      `${folder.name} (TOTAL: ${totalHours}h)`,
      "-",
      "-",
      totalHours
    ]);

    // 2. Groupement par collaborateur et exercice
    const summaryMap = new Map<string, number>(); 
    folderEntries.forEach(e => {
      const collab = collaborators.find(c => String(c.id) === String(e.collaboratorId));
      let cName = collab?.name || "Inconnu";
      if (isAudit && !cName.includes("- CAC")) cName += " - CAC";
      
      const key = `${cName}|${e.exercice}`;
      summaryMap.set(key, (summaryMap.get(key) || 0) + e.duration);
    });

    Array.from(summaryMap.entries()).forEach(([key, hours]) => {
      const [collabName, exercice] = key.split('|');
      data.push([
        poleLabel,
        folder.number,
        folder.name,
        collabName,
        exercice,
        hours
      ]);
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 45 }, { wch: 30 }, { wch: 12 }, { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Portefeuille Cabinet");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const downloadTemplate = (type: 'collabs' | 'folders') => {
  const data = type === 'collabs' 
    ? [["Nom Complet", "Pôle (Audit/Expertise)", "Date Embauche (AAAA-MM-JJ)", "Rôle (Admin/Manager/Collaborateur)"], ["Jean Dupont", "Audit", "2025-01-01", "Collaborateur"]]
    : [["Nom Dossier", "Numéro", "Client", "Pôle (Audit/Expertise)", "Budget Heures"], ["Mission Audit 2025", "AUD-01", "Client SARL", "Audit", "50"]];
  
  exportToExcel(`Modele_Import_${type}`, data);
};
