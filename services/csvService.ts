
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
 * Exporte les données groupées par dossier
 * Résout dynamiquement les noms et numéros à partir des listes de dossiers et collaborateurs
 */
export const exportGroupedByFolder = (filename: string, entries: TimeEntry[], folders: Folder[], collaborators: Collaborator[]) => {
  const data: any[][] = [
    ["PÔLE", "N° DOSSIER", "NOM DOSSIER", "COLLABORATEUR", "EXERCICE", "HEURES"],
  ];

  const folderMap = new Map<string, { 
    service: string,
    name: string, 
    number: string,
    details: Map<string, { collab: string, exercice: number, hours: number }> 
  }>();
  
  entries.forEach(entry => {
    const folder = folders.find(f => f.id === entry.folderId);
    const collab = collaborators.find(c => c.id === entry.collaboratorId);
    
    const folderKey = entry.folderId;
    if (!folderMap.has(folderKey)) {
      folderMap.set(folderKey, { 
        service: entry.service || "",
        name: folder ? folder.name : "Dossier inconnu", 
        number: folder ? folder.number : "N/A",
        details: new Map() 
      });
    }
    const folderData = folderMap.get(folderKey)!;
    
    const collabName = collab ? collab.name : "Inconnu";
    const detailKey = `${collabName}-${entry.exercice}`;
    if (!folderData.details.has(detailKey)) {
      folderData.details.set(detailKey, { 
        collab: collabName, 
        exercice: entry.exercice, 
        hours: 0 
      });
    }
    const detail = folderData.details.get(detailKey)!;
    detail.hours += entry.duration;
  });

  const sortedFolders = Array.from(folderMap.values()).sort((a, b) => {
    if (a.service === ServiceType.AUDIT && b.service !== ServiceType.AUDIT) return -1;
    if (a.service !== ServiceType.AUDIT && b.service === ServiceType.AUDIT) return 1;
    return a.name.localeCompare(b.name);
  });

  sortedFolders.forEach(folder => {
    let folderTotalHours = 0;
    folder.details.forEach(d => { folderTotalHours += d.hours; });

    data.push([
      folder.service.toUpperCase(), 
      folder.number, 
      `${folder.name.toUpperCase()} (TOTAL: ${folderTotalHours}h)`, 
      "-", 
      "-", 
      folderTotalHours
    ]);

    Array.from(folder.details.values())
      .sort((a, b) => a.collab.localeCompare(b.collab) || a.exercice - b.exercice)
      .forEach(d => {
        data.push([folder.service.toUpperCase(), folder.number, folder.name.toUpperCase(), d.collab, d.exercice, d.hours]);
      });
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 50 }, { wch: 30 }, { wch: 12 }, { wch: 12 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Export Dossiers");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const downloadTemplate = (type: 'collabs' | 'folders') => {
  const data = type === 'collabs' 
    ? [["Nom Complet", "Pôle (Audit/Expertise)", "Date Embauche (AAAA-MM-JJ)", "Rôle (Admin/Manager/Collaborateur)"], ["Jean Dupont", "Audit", "2025-01-01", "Collaborateur"]]
    : [["Nom Dossier", "Numéro", "Client", "Pôle (Audit/Expertise)", "Budget Heures"], ["Mission Audit 2025", "AUD-01", "Client SARL", "Audit", "50"]];
  
  exportToExcel(`Modele_Import_${type}`, data);
};
