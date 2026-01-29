
export enum ServiceType {
  AUDIT = 'Audit',
  EXPERTISE = 'Expertise'
}

export enum UserRole {
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  COLLABORATOR = 'Collaborateur'
}

export const EXERCICES = [2024, 2025, 2026, 2027];

export const PREDEFINED_TASKS = [
  "Révision comptable",
  "Saisie factures",
  "Déclarations fiscales",
  "Audit légal",
  "Conseil juridique",
  "Gestion sociale",
  "Réunion client",
  "Reporting mensuel",
  "Tenue de dossiers",
  "Conseil fiscal"
];

export interface Collaborator {
  id: string;
  name: string;
  department: ServiceType;
  hiringDate: string;
  dateDepart?: string;
  role: UserRole;
  password?: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface Folder {
  id: string;
  name: string;
  number: string;
  clientName: string;
  serviceType: ServiceType;
  budgetHours?: number;
  isArchived?: boolean;
}

export interface TimeEntry {
  id: string;
  collaboratorId: string;
  service: ServiceType;
  folderId: string;
  folderName?: string;
  folderNumber?: string;
  duration: number;
  description: string;
  date: string;
  isOvertime?: boolean;
  exercice: number;
}

// Ajout de l'interface Attendance pour le module ClockingModule
export interface Attendance {
  id: string;
  collaboratorId: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  modifiedAt?: string;
  modifiedByName?: string;
}

// Ajout de l'interface TaskAssignment pour le module PlanningModule
export interface TaskAssignment {
  id: string;
  title: string;
  assignedToId: string;
  assignedById?: string;
  deadline: string;
  pole: ServiceType;
  urgency: 'low' | 'normal' | 'high';
  status: 'todo' | 'done';
}
