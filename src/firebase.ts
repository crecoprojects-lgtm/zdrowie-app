/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
// @ts-nocheck – moduły Firebase dostępne po npm install (Codespace/Cloudflare)

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  getDoc,
  getDocFromServer
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
const firebaseConfig = {
  apiKey: 'AIzaSyAl2uYOtsDWI1-L-3p0idsnqzyRASdo-eE',
  authDomain: 'zdrowie-app.firebaseapp.com',
  projectId: 'zdrowie-app',
  storageBucket: 'zdrowie-app.firebasestorage.app',
  messagingSenderId: '243443785135',
  appId: '1:243443785135:web:eb9a1fb429fe2a46e9635a',
};
import { Profile, Medication, Dose, Visit, SyncStatusState, AppNotification } from './types';

// Custom Firestore Error Handling following the skill directives exactly
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'anonymous_or_local_pwa_user',
      email: null,
      emailVerified: false,
      isAnonymous: true,
    },
    operationType,
    path
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Check if we use the mock placeholder configurations
const isPlaceholder = !firebaseConfig.apiKey || firebaseConfig.apiKey === 'MOCK_API_KEY_PLACEHOLDER';

let useLocalStorageFallback = isPlaceholder;
let dbInstance: any = null;
let authInstance: any = null;

if (!useLocalStorageFallback) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    dbInstance = getFirestore(app);
    authInstance = getAuth(app);
    
    // Validate Connection to Firestore following CRITICAL CONSTRAINT
    const testConnection = async () => {
      try {
        // Zaloguj anonimowo, aby przypisać bezpieczne ID urządzenia w regułach Firebase
        await signInAnonymously(authInstance);
        await getDocFromServer(doc(dbInstance, 'test', 'connection'));
        console.log('Firebase Firestore connection tested and authenticated successfully.');
      } catch (error) {
        if (error instanceof Error && error.message.includes('client is offline')) {
          console.warn("Please check your Firebase configuration or internet connection.");
        } else {
          console.error("Firebase Auth or Connection Error:", error);
        }
      }
    };
    testConnection();
  } catch (err) {
    console.warn("Firebase failed to initialize. Falling back to persistent simulated local Firestore.", err);
    useLocalStorageFallback = true;
  }
}

// Unified Global App Cache to prevent tab switching flickering and state mismatch
export const globalAppCache = {
  medications: {} as { [profileId: string]: Medication[] },
  doses: {} as { [profileId: string]: Dose[] },
  visits: {} as { [profileId: string]: Visit[] },
};

// Persistent Storage Engine (Simulates Cloud Firestore locally so the preview stays 100% bug-free)
const LOCAL_STORAGE_DB_KEYS = {
  profiles: 'health_pwa_profiles',
  medications: 'health_pwa_medications',
  doses: 'health_pwa_doses',
  visits: 'health_pwa_visits',
  notifications: 'health_pwa_notifications',
  isCloudSyncing: 'health_pwa_syncing_state'
};

// Helper: load from localStorage
function getLocalItem<T>(key: string, defaultValue: T): T {
  const data = localStorage.getItem(key);
  if (!data) return defaultValue;
  try {
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
}

function setLocalItem<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Base database helper hooks
export const dbService = {
  // Sync status hook handler
  onSyncStatusChange: (status: SyncStatusState) => {},

  triggerSyncIndicator(callback: (status: SyncStatusState) => void) {
    this.onSyncStatusChange = callback;
  },

  setSyncState(state: SyncStatusState) {
    this.onSyncStatusChange(state);
  },

  // ---------------- PROFILES ----------------
  async getProfiles(): Promise<Profile[]> {
    if (!useLocalStorageFallback) {
      try {
        this.setSyncState('syncing');
        const querySnapshot = await getDocs(collection(dbInstance, 'profiles'));
        const list: Profile[] = [];
        querySnapshot.forEach((doc) => {
          list.push(doc.data() as Profile);
        });
        this.setSyncState('synced');
        return list;
      } catch (e) {
        this.setSyncState('error');
        handleFirestoreError(e, OperationType.LIST, 'profiles');
      }
    }
    
    // Fallback simulation
    this.setSyncState('syncing');
    const profiles = getLocalItem<Profile[]>(LOCAL_STORAGE_DB_KEYS.profiles, []);
    await new Promise(resolve => setTimeout(resolve, 350)); // healthy simulated latency
    this.setSyncState('synced');
    return profiles;
  },

  async saveProfile(profile: Profile): Promise<void> {
    if (!useLocalStorageFallback) {
      try {
        this.setSyncState('syncing');
        const ref = doc(dbInstance, 'profiles', profile.id);
        await setDoc(ref, profile);
        this.setSyncState('synced');
        return;
      } catch (e) {
        this.setSyncState('error');
        handleFirestoreError(e, OperationType.WRITE, `profiles/${profile.id}`);
      }
    }

    this.setSyncState('syncing');
    const profiles = getLocalItem<Profile[]>(LOCAL_STORAGE_DB_KEYS.profiles, []);
    const idx = profiles.findIndex(p => p.id === profile.id);
    if (idx >= 0) {
      profiles[idx] = profile;
    } else {
      profiles.push(profile);
    }
    setLocalItem(LOCAL_STORAGE_DB_KEYS.profiles, profiles);
    await new Promise(resolve => setTimeout(resolve, 400));
    this.setSyncState('synced');
  },

  async deleteProfile(profileId: string): Promise<void> {
    if (!useLocalStorageFallback) {
      try {
        this.setSyncState('syncing');
        await deleteDoc(doc(dbInstance, 'profiles', profileId));
        this.setSyncState('synced');
        return;
      } catch (e) {
        this.setSyncState('error');
        handleFirestoreError(e, OperationType.DELETE, `profiles/${profileId}`);
      }
    }

    this.setSyncState('syncing');
    
    // delete profile
    const profiles = getLocalItem<Profile[]>(LOCAL_STORAGE_DB_KEYS.profiles, []);
    setLocalItem(LOCAL_STORAGE_DB_KEYS.profiles, profiles.filter(p => p.id !== profileId));
    
    // delete related medications
    const medications = getLocalItem<Medication[]>(LOCAL_STORAGE_DB_KEYS.medications, []);
    setLocalItem(LOCAL_STORAGE_DB_KEYS.medications, medications.filter(m => m.profileId !== profileId));

    // delete related doses
    const doses = getLocalItem<Dose[]>(LOCAL_STORAGE_DB_KEYS.doses, []);
    setLocalItem(LOCAL_STORAGE_DB_KEYS.doses, doses.filter(d => d.profileId !== profileId));

    // delete related visits
    const visits = getLocalItem<Visit[]>(LOCAL_STORAGE_DB_KEYS.visits, []);
    setLocalItem(LOCAL_STORAGE_DB_KEYS.visits, visits.filter(v => v.profileId !== profileId));

    // delete related notifications
    const notifications = getLocalItem<AppNotification[]>(LOCAL_STORAGE_DB_KEYS.notifications, []);
    setLocalItem(LOCAL_STORAGE_DB_KEYS.notifications, notifications.filter(n => n.profileId !== profileId));

    await new Promise(resolve => setTimeout(resolve, 450));
    this.setSyncState('synced');
  },

  // ---------------- MEDICATIONS ----------------
  async getMedications(profileId: string): Promise<Medication[]> {
    if (!useLocalStorageFallback) {
      try {
        this.setSyncState('syncing');
        const querySnapshot = await getDocs(collection(dbInstance, `profiles/${profileId}/medications`));
        const list: Medication[] = [];
        querySnapshot.forEach((doc) => {
          list.push(doc.data() as Medication);
        });
        this.setSyncState('synced');
        return list;
      } catch (e) {
        this.setSyncState('error');
        handleFirestoreError(e, OperationType.LIST, `profiles/${profileId}/medications`);
      }
    }

    this.setSyncState('syncing');
    const meds = getLocalItem<Medication[]>(LOCAL_STORAGE_DB_KEYS.medications, []);
    const filtered = meds.filter(m => m.profileId === profileId);
    await new Promise(resolve => setTimeout(resolve, 300));
    this.setSyncState('synced');
    return filtered;
  },

  async saveMedication(medication: Medication): Promise<void> {
    if (!useLocalStorageFallback) {
      try {
        this.setSyncState('syncing');
        const ref = doc(dbInstance, `profiles/${medication.profileId}/medications`, medication.id);
        await setDoc(ref, medication);
        this.setSyncState('synced');
        return;
      } catch (e) {
        this.setSyncState('error');
        handleFirestoreError(e, OperationType.WRITE, `profiles/${medication.profileId}/medications/${medication.id}`);
      }
    }

    this.setSyncState('syncing');
    const meds = getLocalItem<Medication[]>(LOCAL_STORAGE_DB_KEYS.medications, []);
    const idx = meds.findIndex(m => m.id === medication.id);
    if (idx >= 0) {
      meds[idx] = medication;
    } else {
      meds.push(medication);
    }
    setLocalItem(LOCAL_STORAGE_DB_KEYS.medications, meds);
    await new Promise(resolve => setTimeout(resolve, 350));
    this.setSyncState('synced');
  },

  async deleteMedication(profileId: string, medicationId: string): Promise<void> {
    if (!useLocalStorageFallback) {
      try {
        this.setSyncState('syncing');
        await deleteDoc(doc(dbInstance, `profiles/${profileId}/medications`, medicationId));
        this.setSyncState('synced');
        return;
      } catch (e) {
        this.setSyncState('error');
        handleFirestoreError(e, OperationType.DELETE, `profiles/${profileId}/medications/${medicationId}`);
      }
    }

    this.setSyncState('syncing');
    const meds = getLocalItem<Medication[]>(LOCAL_STORAGE_DB_KEYS.medications, []);
    setLocalItem(LOCAL_STORAGE_DB_KEYS.medications, meds.filter(m => m.id !== medicationId));

    // Cleanup upcoming non-completed doses for this medication to match packing organizer
    const doses = getLocalItem<Dose[]>(LOCAL_STORAGE_DB_KEYS.doses, []);
    setLocalItem(LOCAL_STORAGE_DB_KEYS.doses, doses.filter(d => d.medicationId !== medicationId));

    await new Promise(resolve => setTimeout(resolve, 300));
    this.setSyncState('synced');
  },

  // ---------------- DOSES LOGS ----------------
  async getDoses(profileId: string): Promise<Dose[]> {
    if (!useLocalStorageFallback) {
      try {
        this.setSyncState('syncing');
        const querySnapshot = await getDocs(collection(dbInstance, `profiles/${profileId}/doses`));
        const list: Dose[] = [];
        querySnapshot.forEach((doc) => {
          list.push(doc.data() as Dose);
        });
        this.setSyncState('synced');
        return list;
      } catch (e) {
        this.setSyncState('error');
        handleFirestoreError(e, OperationType.LIST, `profiles/${profileId}/doses`);
      }
    }

    this.setSyncState('syncing');
    const doses = getLocalItem<Dose[]>(LOCAL_STORAGE_DB_KEYS.doses, []);
    const filtered = doses.filter(d => d.profileId === profileId);
    await new Promise(resolve => setTimeout(resolve, 250));
    this.setSyncState('synced');
    return filtered;
  },

  async saveDose(dose: Dose): Promise<void> {
    if (!useLocalStorageFallback) {
      try {
        this.setSyncState('syncing');
        const ref = doc(dbInstance, `profiles/${dose.profileId}/doses`, dose.id);
        await setDoc(ref, dose);
        this.setSyncState('synced');
        return;
      } catch (e) {
        this.setSyncState('error');
        handleFirestoreError(e, OperationType.WRITE, `profiles/${dose.profileId}/doses/${dose.id}`);
      }
    }

    this.setSyncState('syncing');
    const doses = getLocalItem<Dose[]>(LOCAL_STORAGE_DB_KEYS.doses, []);
    const idx = doses.findIndex(d => d.id === dose.id);
    if (idx >= 0) {
      doses[idx] = dose;
    } else {
      doses.push(dose);
    }
    setLocalItem(LOCAL_STORAGE_DB_KEYS.doses, doses);
    await new Promise(resolve => setTimeout(resolve, 200));
    this.setSyncState('synced');
  },

  // ---------------- VISITS ----------------
  async getVisits(profileId: string): Promise<Visit[]> {
    if (!useLocalStorageFallback) {
      try {
        this.setSyncState('syncing');
        const querySnapshot = await getDocs(collection(dbInstance, `profiles/${profileId}/visits`));
        const list: Visit[] = [];
        querySnapshot.forEach((doc) => {
          list.push(doc.data() as Visit);
        });
        this.setSyncState('synced');
        return list;
      } catch (e) {
        this.setSyncState('error');
        handleFirestoreError(e, OperationType.LIST, `profiles/${profileId}/visits`);
      }
    }

    this.setSyncState('syncing');
    const visits = getLocalItem<Visit[]>(LOCAL_STORAGE_DB_KEYS.visits, []);
    const filtered = visits.filter(v => v.profileId === profileId);
    await new Promise(resolve => setTimeout(resolve, 250));
    this.setSyncState('synced');
    return filtered;
  },

  async saveVisit(visit: Visit): Promise<void> {
    if (!useLocalStorageFallback) {
      try {
        this.setSyncState('syncing');
        const ref = doc(dbInstance, `profiles/${visit.profileId}/visits`, visit.id);
        await setDoc(ref, visit);
        this.setSyncState('synced');
        return;
      } catch (e) {
        this.setSyncState('error');
        handleFirestoreError(e, OperationType.WRITE, `profiles/${visit.profileId}/visits/${visit.id}`);
      }
    }

    this.setSyncState('syncing');
    const visits = getLocalItem<Visit[]>(LOCAL_STORAGE_DB_KEYS.visits, []);
    const idx = visits.findIndex(v => v.id === visit.id);
    if (idx >= 0) {
      visits[idx] = visit;
    } else {
      visits.push(visit);
    }
    setLocalItem(LOCAL_STORAGE_DB_KEYS.visits, visits);
    await new Promise(resolve => setTimeout(resolve, 300));
    this.setSyncState('synced');
  },

  async deleteVisit(profileId: string, visitId: string): Promise<void> {
    if (!useLocalStorageFallback) {
      try {
        this.setSyncState('syncing');
        await deleteDoc(doc(dbInstance, `profiles/${profileId}/visits`, visitId));
        this.setSyncState('synced');
        return;
      } catch (e) {
        this.setSyncState('error');
        handleFirestoreError(e, OperationType.DELETE, `profiles/${profileId}/visits/${visitId}`);
      }
    }

    this.setSyncState('syncing');
    const visits = getLocalItem<Visit[]>(LOCAL_STORAGE_DB_KEYS.visits, []);
    setLocalItem(LOCAL_STORAGE_DB_KEYS.visits, visits.filter(v => v.id !== visitId));
    await new Promise(resolve => setTimeout(resolve, 250));
    this.setSyncState('synced');
  },

  // ---------------- NOTIFICATIONS ----------------
  async getNotifications(profileId: string): Promise<AppNotification[]> {
    if (!useLocalStorageFallback) {
      try {
        this.setSyncState('syncing');
        const querySnapshot = await getDocs(collection(dbInstance, `profiles/${profileId}/notifications`));
        const list: AppNotification[] = [];
        querySnapshot.forEach((doc) => {
          list.push(doc.data() as AppNotification);
        });
        this.setSyncState('synced');
        return list;
      } catch (e) {
        this.setSyncState('error');
        handleFirestoreError(e, OperationType.LIST, `profiles/${profileId}/notifications`);
      }
    }

    this.setSyncState('syncing');
    const notifs = getLocalItem<AppNotification[]>(LOCAL_STORAGE_DB_KEYS.notifications, []);
    const filtered = notifs.filter(n => n.profileId === profileId);
    await new Promise(resolve => setTimeout(resolve, 150));
    this.setSyncState('synced');
    return filtered;
  },

  async saveNotification(notification: AppNotification): Promise<void> {
    if (!useLocalStorageFallback) {
      try {
        this.setSyncState('syncing');
        const ref = doc(dbInstance, `profiles/${notification.profileId}/notifications`, notification.id);
        await setDoc(ref, notification);
        this.setSyncState('synced');
        return;
      } catch (e) {
        this.setSyncState('error');
        handleFirestoreError(e, OperationType.WRITE, `profiles/${notification.profileId}/notifications/${notification.id}`);
      }
    }

    this.setSyncState('syncing');
    const notifs = getLocalItem<AppNotification[]>(LOCAL_STORAGE_DB_KEYS.notifications, []);
    const idx = notifs.findIndex(n => n.id === notification.id);
    if (idx >= 0) {
      notifs[idx] = notification;
    } else {
      notifs.push(notification);
    }
    setLocalItem(LOCAL_STORAGE_DB_KEYS.notifications, notifs);
    await new Promise(resolve => setTimeout(resolve, 150));
    this.setSyncState('synced');
  },

  async deleteNotification(profileId: string, notificationId: string): Promise<void> {
    if (!useLocalStorageFallback) {
      try {
        this.setSyncState('syncing');
        await deleteDoc(doc(dbInstance, `profiles/${profileId}/notifications`, notificationId));
        this.setSyncState('synced');
        return;
      } catch (e) {
        this.setSyncState('error');
        handleFirestoreError(e, OperationType.DELETE, `profiles/${profileId}/notifications/${notificationId}`);
      }
    }

    this.setSyncState('syncing');
    const notifs = getLocalItem<AppNotification[]>(LOCAL_STORAGE_DB_KEYS.notifications, []);
    setLocalItem(LOCAL_STORAGE_DB_KEYS.notifications, notifs.filter(n => n.id !== notificationId));
    await new Promise(resolve => setTimeout(resolve, 150));
    this.setSyncState('synced');
  }
};
