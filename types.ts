
export enum ServiceType {
  AUDIT = 'Audit',
  EXPERTISE = 'Expertise',
  JURIDIQUE = 'Juridique',
  SOCIAL = 'Social'
}

export enum UserRole {
  ADMIN = 'Admin',
  COLLABORATOR = 'Collaborateur'
}

export const PREDEFINED_TASKS = [
  "Révision comptable",
  "Pointage de banque",
  "Audit d'inventaire",
  "Rédaction de rapport",
  "Réunion client",
  "Déplacement / Mission",
  "Déclarations fiscales",
  "Gestion juridique",
  "Social / Paie"
];

export interface Collaborator {
  id: string;
  name: string;
  department: ServiceType;
  hiringDate: string;
  role: UserRole;
  password?: string; // Ajout du mot de passe
}

export interface Folder {
  id: string;
  name: string;
  number: string;
  clientName: string;
  serviceType: ServiceType;
  budgetHours?: number;
}

export interface TimeEntry {
  id: string;
  collaboratorId: string;
  collaboratorName: string;
  service: ServiceType;
  folderId: string;
  folderName: string;
  folderNumber: string;
  duration: number;
  description: string;
  date: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success';
  message: string;
  timestamp: string;
}
