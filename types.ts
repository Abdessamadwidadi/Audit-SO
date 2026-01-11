
export enum ServiceType {
  AUDIT = 'Audit',
  EXPERTISE = 'Expertise'
}

export enum UserRole {
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  COLLABORATOR = 'Collaborateur'
}

export type TaskUrgency = 'normal' | 'urgent' | 'critique';

export const PREDEFINED_TASKS = [
  "Révision comptable",
  "Pointage de banque",
  "Audit d'inventaire",
  "Rédaction de rapport",
  "Réunion client",
  "Mission terrain",
  "Déclarations fiscales"
];

export interface Collaborator {
  id: string;
  name: string;
  department: ServiceType;
  hiringDate: string;
  role: UserRole;
  password?: string;
  startTime: string; // Format "HH:mm"
  endTime: string;   // Format "HH:mm"
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
  isOvertime?: boolean;
}

export interface TaskAssignment {
  id: string;
  title: string;
  assignedToId: string;
  assignedById: string;
  pole: string;
  deadline: string;
  status: 'todo' | 'done';
  urgency: TaskUrgency;
}

export interface Attendance {
  id: string;
  collaboratorId: string;
  date: string;
  checkIn: string;
  checkOut?: string;
}
