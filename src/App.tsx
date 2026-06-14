/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { dbService } from './firebase';
import { Profile, ActiveTab, SyncStatusState, AppNotification } from './types';
import Toast, { ToastMessage, ToastType } from './components/Toast';
import ProfilePicker from './components/ProfilePicker';
import Header from './components/Header';
import BottomNav from './components/BottomNav';

// Tab Views
import TabToday from './components/TabToday';
import TabHistory from './components/TabHistory';
import TabVisits from './components/TabVisits';
import TabOrganizer from './components/TabOrganizer';
import TabSettings from './components/TabSettings';

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  
  // Base Sync status
  const [syncStatus, setSyncStatus] = useState<SyncStatusState>('synced');
  
  // Real-time synchronization change counter
  const [syncTrigger, setSyncTrigger] = useState(0);

  // In-app notifications stack
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const loadNotifications = async () => {
    if (!activeProfile) return;
    try {
      const list = await dbService.getNotifications(activeProfile.id);
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(list);
    } catch {
      // quiet
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [activeProfile?.id, syncTrigger]);

  const handleDeleteNotification = async (notifId: string) => {
    if (!activeProfile) return;
    try {
      dbService.setSyncState('syncing');
      await dbService.deleteNotification(activeProfile.id, notifId);
      setNotifications(prev => prev.filter(n => n.id !== notifId));
      triggerToast('Powiadomienie zostało usunięte.', 'info');
      handleDataChanged();
    } catch {
      triggerToast('Błąd usuwania powiadomienia.', 'error');
    }
  };

  // Toast Stack Notification Manager
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const triggerToast = (text: string, type: ToastType = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    
    // Auto purge toast after 3.2 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initial Load of profiles
  const loadProfiles = async () => {
    try {
      const list = await dbService.getProfiles();
      setProfiles(list);
      
      // Auto login returning cached user if saved
      const savedUser = localStorage.getItem('last_active_health_user');
      if (savedUser) {
        const found = list.find((p) => p.id === savedUser);
        if (found) {
          setActiveProfile(found);
          triggerToast(`Witaj z powrotem, ${found.name}!`, 'success');
        }
      }
    } catch {
      triggerToast('Błąd pobierania profili z bazy.', 'error');
    }
  };

  useEffect(() => {
    loadProfiles();

    // Hook the dynamic sync indicators
    dbService.triggerSyncIndicator((status) => {
      setSyncStatus(status);
    });

    // Oszczędzanie limitów darmowego planu: synchronizujemy tylko przy powrocie do aplikacji, a nie co 12 sekund
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        dbService.getProfiles().then((list) => {
          setProfiles(list);
          if (activeProfile) {
            const updated = list.find(p => p.id === activeProfile.id);
            if (updated) {
              setActiveProfile(updated);
            }
          }
        }).catch(() => {});
        handleDataChanged();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeProfile?.id]);

  // Force Scroll Reset to the absolute Top as requested by USER
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeTab]);

  const handleSelectProfile = (profile: Profile) => {
    setActiveProfile(profile);
    localStorage.setItem('last_active_health_user', profile.id);
    triggerToast(`Zalogowano jako ${profile.name}`, 'success');
    setActiveTab('today'); // Always boot directly into Today tab
  };

  const handleAddProfile = async (name: string, avatarUrl: string, pin?: string) => {
    try {
      const newProfile: Profile = {
        id: `profile-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name,
        avatarUrl,
        pin: pin || undefined,
        createdAt: new Date().toISOString(),
        preferences: {
          notificationsEnabled: true,
          soundEnabled: true,
          highContrastMode: false,
        },
      };

      await dbService.saveProfile(newProfile);
      triggerToast(`Profil pacjenta ${name} został zarejestrowany.`, 'success');
      loadProfiles();
    } catch {
      triggerToast('Nie udało się utworzyć profilu.', 'error');
    }
  };

  const handleDeleteProfile = async (id: string) => {
    try {
      await dbService.deleteProfile(id);
      triggerToast('Profil pacjenta został pomyślnie usunięty.', 'info');
      
      // If we deleted our own profile, logout instantly
      if (activeProfile?.id === id) {
        handleLogout();
      } else {
        loadProfiles();
      }
    } catch {
      triggerToast('Błąd usuwania konta pacjenta.', 'error');
    }
  };

  const handleUpdateProfile = (updated: Profile) => {
    setActiveProfile(updated);
    setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleLogout = () => {
    localStorage.removeItem('last_active_health_user');
    setActiveProfile(null);
    triggerToast('Wylogowano pomyślnie z profilu.', 'info');
  };

  const handleDataChanged = () => {
    // Increment ticker to trigger dependent tabs reloading queries automatically!
    setSyncTrigger((prev) => prev + 1);
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'today':
        return 'Plan leczenia';
      case 'history':
        return 'Analityka i wyniki';
      case 'visits':
        return 'Wizyty lekarskie';
      case 'organizer':
        return 'Pudełko kasetkowe';
      case 'settings':
        return 'Ustawienia profilu';
      default:
        return 'Zdrowie';
    }
  };

  // Safe Guard: Check if dark contrast mode preferences is active in user profile settings
  const isHighContrast = activeProfile?.preferences?.highContrastMode ?? false;

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isHighContrast ? 'bg-stone-950 text-white' : 'bg-[#f7f9fb] text-gray-950'}`}>
      <AnimatePresence mode="wait">
        {!activeProfile ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <ProfilePicker
              profiles={profiles}
              onSelect={handleSelectProfile}
              onAdd={handleAddProfile}
              onDelete={handleDeleteProfile}
            />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col min-h-screen pb-20 w-full"
          >
            {/* Header bar with sync icon */}
            <Header
              profile={activeProfile}
              tabTitle={getTabTitle()}
              syncStatus={syncStatus}
              notifications={notifications}
              onDeleteNotification={handleDeleteNotification}
              onLogout={handleLogout}
            />

            {/* Main scrollable View shell */}
            <main className="flex-1 w-full max-w-lg mx-auto bg-transparent relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12, transition: { duration: 0.15 } }}
                  className="w-full"
                >
                  {activeTab === 'today' && (
                    <TabToday
                      profile={activeProfile}
                      onShowToast={triggerToast}
                      syncTrigger={syncTrigger}
                      onDataChanged={handleDataChanged}
                    />
                  )}
                  {activeTab === 'history' && (
                    <TabHistory
                      profile={activeProfile}
                      onShowToast={triggerToast}
                      syncTrigger={syncTrigger}
                    />
                  )}
                  {activeTab === 'visits' && (
                    <TabVisits
                      profile={activeProfile}
                      onShowToast={triggerToast}
                      syncTrigger={syncTrigger}
                    />
                  )}
                  {activeTab === 'organizer' && (
                    <TabOrganizer
                      profile={activeProfile}
                      onShowToast={triggerToast}
                      syncTrigger={syncTrigger}
                      onDataChanged={handleDataChanged}
                    />
                  )}
                  {activeTab === 'settings' && (
                    <TabSettings
                      profile={activeProfile}
                      profiles={profiles}
                      onUpdateProfile={handleUpdateProfile}
                      onLogout={handleLogout}
                      onAddProfile={handleAddProfile}
                      onDeleteProfile={handleDeleteProfile}
                      onShowToast={triggerToast}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </main>

            {/* Persistent bottom nav */}
            <BottomNav activeTab={activeTab} onTabChange={setActiveTab} isDark={isHighContrast} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Elegant floating React Toast Notifications container */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
