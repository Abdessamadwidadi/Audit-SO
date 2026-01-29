
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
 */
export const exportSimpleByFolder = (filename: string, entries: TimeEntry[], folders: Folder[], collaborators: Collaborator[]) => {
  const data: any[][] = [];

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
    
    // Strict service check based on folder definition
    const serviceFromFolder = folder?.serviceType;
    const isAudit = (serviceFromFolder || folderEntries[0]?.service || "").toLowerCase() === 'audit';
    const poleLabel = isAudit ? "AUDIT" : "EXPERTISE";

    data.push([poleLabel, folder?.number || folderEntries[0]?.folderNumber || "", folder?.name || folderEntries[0]?.folderName || "Sans nom", "", "", ""]);
    data.push(["DATE", "EXERCICE", "COLLABORATEUR", "DESCRIPTION", "DURÉE (H)", "pourcentage"]);

    const collabSummary = new Map<string, number>();
    // TRI : Du plus récent au plus ancien (décroissant)
    const sortedEntries = [...folderEntries].sort((a, b) => b.date.localeCompare(a.date));
    
    sortedEntries.forEach(e => {
      const collab = collaborators.find(c => String(c.id) === String(e.collaboratorId));
      let collabName = collab?.name || "Inconnu";
      // Uniformité : pas de suffixe - CAC
      const exFormatted = isAudit ? `CAC${e.exercice}` : `EX${e.exercice}`;
      const dateParts = e.date.split('-');
      const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : e.date;

      data.push([formattedDate, exFormatted, collabName, e.description, e.duration, ""]);
      collabSummary.set(collabName, (collabSummary.get(collabName) || 0) + e.duration);
    });

    data.push([]); 
    data.push(["", "SYNTHÈSE PAR COLLABORATEUR", "", "", "", ""]);
    const folderTotal = Array.from(collabSummary.values()).reduce((a, b) => a + b, 0);
    Array.from(collabSummary.entries()).forEach(([name, total]) => {
      const percent = folderTotal > 0 ? Math.round((total / folderTotal) * 1000) / 10 : 0;
      data.push(["", "", name, "heures", total, `${percent}%`]);
    });

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
 */
export const exportSummaryCabinet = (filename: string, entries: TimeEntry[], folders: Folder[], collaborators: Collaborator[]) => {
  const data: any[][] = [];
  data.push(["SYNTHÈSE PORTEFEUILLE CABINET - MANAGEMENT SO"]);
  data.push([]);
  data.push(["PÔLE", "N° DOSSIER", "NOM DOSSIER", "COLLABORATEUR", "EXERCICE", "HEURES"]);

  // Groupement robuste par identité textuelle du dossier
  const entriesByIdentity = new Map<string, TimeEntry[]>();
  entries.forEach(e => {
    const folder = folders.find(f => String(f.id) === String(e.folderId));
    const num = folder?.number || e.folderNumber || "-";
    const name = folder?.name || e.folderName || "Inconnu";
    const key = `${num}|${name}`;
    const group = entriesByIdentity.get(key) || [];
    group.push(e);
    entriesByIdentity.set(key, group);
  });

  // Tri des dossiers : Audit d'abord, puis par numéro
  const sortedKeys = Array.from(entriesByIdentity.keys()).sort((keyA, keyB) => {
    const entriesA = entriesByIdentity.get(keyA)!;
    const entriesB = entriesByIdentity.get(keyB)!;
    const folderA = folders.find(f => String(f.id) === String(entriesA[0].folderId));
    const folderB = folders.find(f => String(f.id) === String(entriesB[0].folderId));
    
    const isAAudit = (folderA?.serviceType || entriesA[0].service || "").toLowerCase() === 'audit';
    const isBAudit = (folderB?.serviceType || entriesB[0].service || "").toLowerCase() === 'audit';

    if (isAAudit && !isBAudit) return -1;
    if (!isAAudit && isBAudit) return 1;
    return keyA.split('|')[0].localeCompare(keyB.split('|')[0]);
  });

  sortedKeys.forEach(key => {
    const folderEntries = entriesByIdentity.get(key)!;
    const [folderNumber, folderName] = key.split('|');
    const folderObj = folders.find(f => String(f.id) === String(folderEntries[0].folderId));

    const isAudit = (folderObj?.serviceType || folderEntries[0].service || "").toLowerCase() === 'audit';
    const poleLabel = isAudit ? "AUDIT" : "EXPERTISE";
    
    const totalHours = folderEntries.reduce((acc, e) => acc + e.duration, 0);

    // Ligne de synthèse dossier
    data.push([poleLabel, folderNumber, `${folderName} (TOTAL: ${totalHours}h)`, "-", "-", totalHours]);

    // Groupement par collaborateur et exercice
    const summaryMap = new Map<string, number>(); 
    folderEntries.forEach(e => {
      const collab = collaborators.find(c => String(c.id) === String(e.collaboratorId));
      let cName = collab?.name || "Inconnu";
      // Uniformité : pas de suffixe - CAC
      const groupKey = `${cName}|${e.exercice}`;
      summaryMap.set(groupKey, (summaryMap.get(groupKey) || 0) + e.duration);
    });

    Array.from(summaryMap.entries()).forEach(([groupKey, hours]) => {
      const [collabName, exercice] = groupKey.split('|');
      data.push([poleLabel, folderNumber, folderName, collabName, exercice, hours]);
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
