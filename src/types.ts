/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProfilePreferences {
  notificationsEnabled: boolean;
  highContrastMode: boolean;
  soundEnabled: boolean;
}

export interface Profile {
  id: string;
  name: string;
  avatarUrl: string;
  pin?: string; // Optional 4-digit PIN for profile security
  createdAt: string;
  preferences: ProfilePreferences;
}

export type TimeOfDayKey = 'rano' | 'poludnie' | 'wieczor';

export interface MedicationTime {
  timeKey: TimeOfDayKey; // 'rano', 'poludnie', 'wieczor'
  active: boolean;
  dosage: string; // e.g., "1"
  amount?: string; // e.g. "tabletka", "szt.", "ml" (or dosage description like "100 µg")
}

export interface Medication {
  id: string;
  profileId: string;
  name: string;
  frequency: 'daily' | 'custom';
  days: string[]; // e.g., ["Pn", "Sr", "Pt"]
  times: MedicationTime[];
  durationDays: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  createdAt: string;
  // Stock tracking features requested by the user
  trackingEnabled?: boolean;
  initialStock?: number;  // e.g. 50
  currentStock?: number;  // e.g. 32
  lowStockThreshold?: number; // e.g. 10 (notify when stock <= this)
  unit?: string; // e.g. "szt.", "tabl.", "ml"
}

export interface Dose {
  id: string;
  profileId: string;
  medicationId: string;
  medicationName: string;
  timeOfDay: TimeOfDayKey;
  dosage: string;
  taken: boolean;
  date: string; // YYYY-MM-DD
  takenAt?: string; // ISO String
}

export interface Visit {
  id: string;
  profileId: string;
  title: string;
  doctor: string;
  clinic: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  notes?: string;
}

export type ActiveTab = 'today' | 'history' | 'visits' | 'organizer' | 'settings';

export type SyncStatusState = 'synced' | 'syncing' | 'offline' | 'error';

export interface AppNotification {
  id: string;
  profileId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'visit' | 'pill';
  createdAt: string;
  read: boolean;
}
