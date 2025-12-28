
import * as XLSX from 'xlsx';

/**
 * Lit un fichier (Excel ou CSV) et retourne les données sous forme de tableau de tableaux.
 * Convertit automatiquement les objets Date de SheetJS en chaînes de caractères YYYY-MM-DD.
 */
export const readExcelOrCSV = (file: File): Promise<any[][]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        // cellDates: true permet de récupérer de vrais objets Date pour les cellules typées date dans Excel
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // On récupère les lignes sous forme de tableau de tableaux
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
        
        // CRUCIAL : On transforme immédiatement les objets Date en chaînes YYYY-MM-DD 
        // pour éviter l'erreur React #31 lors du rendu de l'aperçu ou du stockage.
        const cleanedRows = rawRows.map(row => 
          row.map(cell => {
            if (cell instanceof Date) {
              // On vérifie que la date est valide avant de la formater
              if (!isNaN(cell.getTime())) {
                return cell.toISOString().split('T')[0];
              }
              return "";
            }
            return cell;
          })
        );
        
        resolve(cleanedRows);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};

export const exportToExcelCSV = (filename: string, rows: string[][]) => {
  const BOM = '\uFEFF';
  const content = rows.map(e => e.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.click();
};

export const downloadTemplate = (type: 'collabs' | 'folders') => {
  const templates = {
    collabs: [
      ["Nom Complet", "Departement", "Date Embauche (AAAA-MM-JJ)"],
      ["Exemple Marc Audit", "Audit", "2024-01-01"],
      ["Julie Expertise", "Expertise", "2023-06-15"]
    ],
    folders: [
      ["Nom Dossier", "Numero", "Nom Client", "Service (Audit/Expertise)", "Budget Heures"],
      ["Dossier XYZ", "2024-001", "Client XYZ", "Audit", "100"],
      ["Dossier ABC", "2024-002", "Client ABC", "Expertise", "50"]
    ]
  };
  exportToExcelCSV(`Modele_Import_${type}.csv`, templates[type]);
};
