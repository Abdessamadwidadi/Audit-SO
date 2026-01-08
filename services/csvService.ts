
import * as XLSX from 'xlsx';

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
  XLSX.utils.book_append_sheet(wb, ws, "Données");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const downloadTemplate = (type: 'collabs' | 'folders') => {
  const data = type === 'collabs' 
    ? [["Nom Complet", "Pôle (Audit/Expertise)", "Date Embauche (AAAA-MM-JJ)", "Rôle (Admin/Manager/Collaborateur)"], ["Jean Dupont", "Audit", "2025-01-01", "Collaborateur"]]
    : [["Nom Dossier", "Numéro", "Client", "Pôle (Audit/Expertise)", "Budget Heures"], ["Mission Audit 2025", "AUD-01", "Client SARL", "Audit", "50"]];
  
  exportToExcel(`Modele_Import_${type}`, data);
};
