/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  User, 
  Settings, 
  Volume2, 
  VolumeX, 
  Bell, 
  BellOff, 
  Palette, 
  LogOut, 
  Trash2, 
  Plus, 
  ChevronRight, 
  ShieldCheck, 
  UserCog,
  Sparkles,
  HelpCircle,
  Save,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { Profile, ProfilePreferences } from '../types';
import { PRESET_AVATARS } from './ProfilePicker';
import { dbService, globalAppCache } from '../firebase';

interface TabSettingsProps {
  profile: Profile;
  profiles: Profile[];
  onUpdateProfile: (updated: Profile) => void;
  onLogout: () => void;
  onAddProfile: (name: string, avatarUrl: string) => void;
  onDeleteProfile: (id: string) => void;
  onShowToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function TabSettings({ 
  profile, 
  profiles, 
  onUpdateProfile, 
  onLogout,
  onAddProfile,
  onDeleteProfile,
  onShowToast
}: TabSettingsProps) {
  // Local state for current profile updates
  const [profileName, setProfileName] = useState(profile.name);
  const [profileAvatar, setProfileAvatar] = useState(profile.avatarUrl);
  const [profilePin, setProfilePin] = useState(profile.pin ?? '');
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);

  // Quick profile adder state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickAvatar, setQuickAvatar] = useState(PRESET_AVATARS[0].url);

  // Preference switches
  const [notifications, setNotifications] = useState(profile.preferences?.notificationsEnabled ?? true);
  const [sound, setSound] = useState(profile.preferences?.soundEnabled ?? true);
  const [highContrast, setHighContrast] = useState(profile.preferences?.highContrastMode ?? false);

  const isDark = profile.preferences?.highContrastMode ?? false;

  const handleSavePreferences = async (updatedNotif: boolean, updatedSound: boolean, updatedContrast: boolean) => {
    try {
      const updatedProfile: Profile = {
        ...profile,
        name: profileName.trim(),
        avatarUrl: profileAvatar,
        pin: profilePin.trim() || undefined,
        preferences: {
          notificationsEnabled: updatedNotif,
          soundEnabled: updatedSound,
          highContrastMode: updatedContrast
        }
      };
      await dbService.saveProfile(updatedProfile);
      onUpdateProfile(updatedProfile);
      onShowToast('Ustawienia i preferencje zostały zapisane w chmurze!', 'success');
    } catch {
      onShowToast('Nie udało się zapisać preferencji.', 'error');
    }
  };

  const handleSaveProfileHeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      onShowToast('Wprowadź imię pacjenta w profilu.', 'error');
      return;
    }
    handleSavePreferences(notifications, sound, highContrast);
  };

  const handleAddQuickProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;
    onAddProfile(quickName.trim(), quickAvatar);
    setQuickName('');
    setShowQuickAdd(false);
    onShowToast(`Dodano nowy profil pacjenta: ${quickName}`, 'success');
  };

  // Secure active profile deletion with PIN or typed confirmation
  const handleDeleteActiveProfile = async () => {
    if (profile.pin) {
      const pinConfirm = window.prompt(`Ten profil jest chroniony kodem PIN. Wprowadź PIN do profilu "${profile.name}", aby zatwierdzić trwałe usunięcie konta i jego wszystkich danych:`);
      if (pinConfirm === null) return; // user cancelled
      if (pinConfirm !== profile.pin) {
        onShowToast('Niepoprawny kod PIN. Usuwanie profilu anulowane.', 'error');
        return;
      }
    } else {
      const isConfirmed = window.confirm(`Czy na pewno chcesz trwale usunąć profil "${profile.name}" wraz z całą jego historią dawkowania, lekami i wizytami? Ta operacja jest nieodwracalna.`);
      if (!isConfirmed) return;
    }

    try {
      // Clear local memory caches for this specific profile
      delete globalAppCache.medications[profile.id];
      delete globalAppCache.doses[profile.id];
      delete globalAppCache.visits[profile.id];

      // Request parent model deletion in remote (Firestore) and mock DB
      onDeleteProfile(profile.id);
      
      onShowToast(`Twój profil ${profile.name} został trwale usunięty. Następuje wylogowanie...`, 'success');
    } catch {
      onShowToast('Wystąpił błąd podczas usuwania profilu.', 'error');
    }
  };

  return (
    <div className="px-5 py-6 space-y-6 pb-28 text-left">
      {/* Profile Detail header change */}
      <section className={`rounded-2xl border p-5 shadow-sm transition-colors duration-200 ${
        isDark ? 'bg-stone-900 border-stone-800 shadow-black/15' : 'bg-white border-gray-100 shadow-gray-100/50'
      }`}>
        <form onSubmit={handleSaveProfileHeader} className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              type="button"
              onClick={() => setIsEditingAvatar(!isEditingAvatar)}
              className={`relative w-16 h-16 rounded-2xl overflow-hidden border shrink-0 shadow-inner group cursor-pointer ${
                isDark ? 'border-stone-800 bg-stone-950' : 'border-gray-100 bg-gray-50'
              }`}
            >
              <img
                src={profileAvatar}
                alt={profile.name}
                className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-bold uppercase">
                Edytuj
              </div>
            </button>

            <div className="flex-1 space-y-3 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="p_name" className={`block text-[10px] font-bold uppercase tracking-widest ${
                    isDark ? 'text-stone-400' : 'text-gray-400'
                  }`}>
                    Imię pacjenta
                  </label>
                  <input
                    id="p_name"
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className={`w-full h-10 px-3 outline-none rounded-xl font-sans text-sm font-semibold transition-all ${
                      isDark 
                        ? 'bg-stone-950 border-stone-800 text-white focus:border-[#6cf8bb]' 
                        : 'bg-stone-50 border-gray-200 text-gray-950 focus:border-[#00478d]'
                    }`}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="p_pin" className={`block text-[10px] font-bold uppercase tracking-widest ${
                    isDark ? 'text-stone-400' : 'text-gray-400'
                  }`}>
                    Kod PIN logowania (opcja)
                  </label>
                  <input
                    id="p_pin"
                    type="text"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder="np. 1234 (puste = brak PINu)"
                    value={profilePin}
                    onChange={(e) => setProfilePin(e.target.value.replace(/[^0-9]/g, ''))}
                    className={`w-full h-10 px-3 outline-none rounded-xl font-sans text-sm font-semibold tracking-wider text-center transition-all ${
                      isDark 
                        ? 'bg-stone-950 border-stone-800 text-white focus:border-[#6cf8bb] placeholder-stone-600' 
                        : 'bg-stone-50 border-gray-200 text-gray-950 focus:border-[#00478d] placeholder-gray-400'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`w-full h-10 rounded-xl transition-all font-sans text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                  isDark 
                    ? 'bg-[#6cf8bb]/10 border border-[#6cf8bb]/20 text-[#6cf8bb] hover:bg-[#6cf8bb]/20' 
                    : 'bg-blue-50 hover:bg-[#00478d] text-[#00478d] hover:text-white'
                }`}
              >
                Zakończ edycję i zapisz profil
              </button>
            </div>
          </div>

          {/* Preset Avatar choice pop inline sheet */}
          {isEditingAvatar && (
            <div className={`space-y-2 p-3 border rounded-xl animate-fadeIn ${
              isDark ? 'bg-stone-950/60 border-stone-800' : 'bg-stone-50/70 border-gray-100'
            }`}>
              <p className={`text-[10px] font-bold uppercase tracking-wide ${isDark ? 'text-stone-400' : 'text-gray-400'}`}>
                Kliknij by zamienić zdjęcie profilowe
              </p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {PRESET_AVATARS.map((avatar) => (
                  <button
                    type="button"
                    key={avatar.id}
                    onClick={() => {
                      setProfileAvatar(avatar.url);
                      setIsEditingAvatar(false);
                      onShowToast('Wybrano nowe zdjęcie profilowe. Zapisz zmiany by zatwierdzić.', 'info');
                    }}
                    className={`relative w-12 h-12 rounded-xl overflow-hidden shadow-sm shrink-0 border-2 transition-all cursor-pointer ${
                      profileAvatar === avatar.url 
                        ? (isDark ? 'border-[#6cf8bb] scale-105' : 'border-[#00478d] scale-105') 
                        : 'border-transparent hover:border-gray-500'
                    }`}
                  >
                    <img
                      src={avatar.url}
                      alt={avatar.label}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </section>

      {/* Preferences settings toggle cards */}
      <section className="space-y-3.5">
        <h4 className={`font-sans font-bold text-sm uppercase tracking-widest leading-none ${isDark ? 'text-stone-400' : 'text-gray-400'}`}>
          Preferencje konta
        </h4>

        <div className={`rounded-2xl border shadow-sm divide-y transition-colors duration-200 overflow-hidden font-sans ${
          isDark ? 'bg-stone-900 border-stone-800 divide-stone-800/60' : 'bg-white border-gray-100 divide-gray-100'
        }`}>
          {/* Notifications Toggler */}
          <div className="p-4 flex justify-between items-center bg-transparent">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                notifications 
                  ? (isDark ? 'bg-[#6cf8bb]/15 text-[#6cf8bb]' : 'bg-emerald-50 text-emerald-800') 
                  : (isDark ? 'bg-stone-800 text-stone-500' : 'bg-gray-100 text-gray-400')
              }`}>
                {notifications ? <span className="text-base font-bold">🔔</span> : <span className="text-base font-bold">🔕</span>}
              </div>
              <div>
                <span className={`font-sans font-bold text-sm block leading-tight ${isDark ? 'text-stone-100' : 'text-gray-950'}`}>Powiadomienia lekowe</span>
                <span className={`text-[11px] font-sans block mt-1 ${isDark ? 'text-stone-450' : 'text-gray-400'}`}>Dźwięki alarmów w porach dawkowania</span>
              </div>
            </div>
            
            <button
              onClick={() => {
                const next = !notifications;
                setNotifications(next);
                handleSavePreferences(next, sound, highContrast);
              }}
              className={`w-12 h-6.5 rounded-full transition-all flex items-center p-0.5 cursor-pointer ${
                notifications ? (isDark ? 'bg-[#6cf8bb]' : 'bg-[#00478d]') : 'bg-stone-700/50'
              }`}
            >
              <div className={`w-5.5 h-5.5 bg-white rounded-full shadow-md transform transition-all ${
                notifications ? 'translate-x-5.5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Sound volume helper */}
          <div className="p-4 flex justify-between items-center bg-transparent">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                sound 
                  ? (isDark ? 'bg-[#6cf8bb]/15 text-[#6cf8bb]' : 'bg-emerald-50 text-emerald-800') 
                  : (isDark ? 'bg-stone-800 text-stone-500' : 'bg-gray-100 text-gray-400')
              }`}>
                {sound ? <span className="text-base font-bold">🔊</span> : <span className="text-base font-bold">🔇</span>}
              </div>
              <div>
                <span className={`font-sans font-bold text-sm block leading-tight ${isDark ? 'text-stone-100' : 'text-gray-950'}`}>Dźwięki aplikacji</span>
                <span className={`text-[11px] font-sans block mt-1 ${isDark ? 'text-stone-450' : 'text-gray-400'}`}>Sygnał dźwiękowy po zaznaczeniu</span>
              </div>
            </div>

            <button
              onClick={() => {
                const next = !sound;
                setSound(next);
                handleSavePreferences(notifications, next, highContrast);
              }}
              className={`w-12 h-6.5 rounded-full transition-all flex items-center p-0.5 cursor-pointer ${
                sound ? (isDark ? 'bg-[#6cf8bb]' : 'bg-[#00478d]') : 'bg-stone-700/50'
              }`}
            >
              <div className={`w-5.5 h-5.5 bg-white rounded-full shadow-md transform transition-all ${
                sound ? 'translate-x-5.5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Dark Contrast toggle */}
          <div className="p-4 flex justify-between items-center bg-transparent">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                highContrast 
                  ? (isDark ? 'bg-[#6cf8bb]/15 text-[#6cf8bb]' : 'bg-emerald-50 text-emerald-800') 
                  : (isDark ? 'bg-stone-800 text-stone-500' : 'bg-gray-100 text-gray-400')
              }`}>
                <span className="text-base font-bold">🎨</span>
              </div>
              <div>
                <span className={`font-sans font-bold text-sm block leading-tight ${isDark ? 'text-stone-100' : 'text-gray-950'}`}>Wysoki kontrast (Noc)</span>
                <span className={`text-[11px] font-sans block mt-1 ${isDark ? 'text-stone-450' : 'text-gray-400'}`}>Łagodna stylistyka dla oczu pacjenta</span>
              </div>
            </div>

            <button
              onClick={() => {
                const next = !highContrast;
                setHighContrast(next);
                handleSavePreferences(notifications, sound, next);
              }}
              className={`w-12 h-6.5 rounded-full transition-all flex items-center p-0.5 cursor-pointer ${
                highContrast ? (isDark ? 'bg-[#6cf8bb]' : 'bg-[#00478d]') : 'bg-stone-700/50'
              }`}
            >
              <div className={`w-5.5 h-5.5 bg-white rounded-full shadow-md transform transition-all ${
                highContrast ? 'translate-x-5.5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </section>

      {/* Profile Management system as requested by user details */}
      <section className="space-y-3.5">
        <div className="flex justify-between items-center">
          <h4 className={`font-sans font-bold text-sm uppercase tracking-widest leading-none ${isDark ? 'text-stone-400' : 'text-gray-400'}`}>
            Zarządzaj profilami ({profiles.length})
          </h4>
          <button
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className={`text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
              isDark ? 'text-[#6cf8bb] bg-[#6cf8bb]/10 hover:bg-[#6cf8bb]/20' : 'text-[#00478d] bg-blue-50 hover:bg-blue-100'
            }`}
          >
            <span>➕</span>
            Dodaj profil
          </button>
        </div>

        {/* Quick add custom form inline settings collapse */}
        {showQuickAdd && (
          <form onSubmit={handleAddQuickProfile} className={`border border-dashed p-4 rounded-2xl animate-fadeIn space-y-4 ${
            isDark ? 'bg-stone-950 border-stone-850' : 'bg-stone-50 border-gray-200'
          }`}>
            <div className="space-y-1">
              <label htmlFor="q_name" className={`block text-[10px] font-bold uppercase tracking-wide ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
                Nazwa / Imię nowego profilu
              </label>
              <input
                id="q_name"
                type="text"
                required
                placeholder="np. Mama, Brat"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                className={`w-full h-10 px-3 rounded-xl font-sans text-xs outline-none ${
                  isDark ? 'bg-stone-900 border border-stone-800 text-white' : 'bg-white border border-gray-200 text-gray-950'
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <span className={`block text-[10px] font-bold uppercase tracking-wide ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
                Wybierz awatar
              </span>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {PRESET_AVATARS.map((avatar) => (
                  <button
                    type="button"
                    key={avatar.id}
                    onClick={() => setQuickAvatar(avatar.url)}
                    className={`relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                      quickAvatar === avatar.url 
                        ? (isDark ? 'border-[#6cf8bb]' : 'border-[#00478d]') 
                        : 'border-transparent'
                    }`}
                  >
                    <img
                      src={avatar.url}
                      alt={avatar.label}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className={`w-full h-10 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                isDark ? 'bg-[#6cf8bb] hover:bg-[#5be6ab] text-stone-950 font-bold' : 'bg-[#00478d] hover:bg-[#003870] text-white'
              }`}
            >
              Zapisz nowy profil
            </button>
          </form>
        )}

        <div className={`rounded-2xl border divide-y shadow-sm transition-colors duration-200 overflow-hidden font-sans ${
          isDark ? 'bg-stone-900 border-stone-800 divide-stone-800/60' : 'bg-white border-gray-100 divide-gray-100'
        }`}>
          {profiles.map((p) => {
            const isCurrent = p.id === profile.id;
            return (
              <div key={p.id} className="p-3.5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl overflow-hidden shrink-0 ${isDark ? 'bg-stone-950' : 'bg-gray-50'}`}>
                    <img
                      src={p.avatarUrl}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className={`font-sans font-bold text-sm block leading-none ${isDark ? 'text-stone-100' : 'text-gray-950'}`}>
                      {p.name}
                    </span>
                    <span className={`text-[10px] font-sans block mt-1 ${isDark ? 'text-stone-450' : 'text-gray-400'}`}>
                      {isCurrent ? 'Konto aktywne' : 'Konto powiązane'}
                    </span>
                  </div>
                </div>

                {!isCurrent && (
                  <button
                    onClick={() => {
                      onDeleteProfile(p.id);
                      onShowToast(`Konto pacjenta ${p.name} zostało usunięte.`, 'info');
                    }}
                    className={`p-2 border rounded-lg transition-colors cursor-pointer ${
                      isDark 
                        ? 'border-stone-800 hover:border-red-900/40 text-stone-500 hover:text-red-400 hover:bg-red-500/10' 
                        : 'border-gray-100 hover:border-red-100 text-gray-400 hover:text-red-600 hover:bg-neutral-50'
                    }`}
                    title="Usuń powiązany profil"
                  >
                    <span>🗑️</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Safety and Sync information */}
      <section className={`p-4.5 rounded-2xl border shadow-sm flex items-start gap-3 transition-colors duration-200 ${
        isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-gray-100'
      }`}>
        <span className="text-xl">🛡️</span>
        <div className="space-y-1">
          <h5 className={`font-sans font-bold text-sm leading-none ${isDark ? 'text-stone-100' : 'text-gray-950'}`}>Ochrona Twoich danych medycznych</h5>
          <p className={`text-xs leading-relaxed font-sans ${isDark ? 'text-stone-450' : 'text-gray-400'}`}>
            Wszystkie harmonogramy leczenia oraz plany dawkowania są szyfrowane i synchronizowane zgodnie z rygorystycznymi standardami bezpieczeństwa danych medycznych.
          </p>
        </div>
      </section>

      {/* Secure Active Profile Deletion Section */}
      <section className={`p-4.5 rounded-2xl border shadow-sm transition-colors duration-200 border-red-500/20 ${
        isDark ? 'bg-red-500/5' : 'bg-red-50/30'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">⚠️</span>
          <h5 className="font-sans font-bold text-sm text-red-600 leading-none">Usuwanie aktywnego konta</h5>
        </div>
        <p className={`text-xs leading-relaxed font-sans mb-4 ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
          Jeśli chcesz zaprzestać korzystania z tej aplikacji na tym profilu, możesz trwale usunąć profil <strong>{profile.name}</strong> wraz ze wszystkimi przypisanymi lekami, zaplanowanymi dawkami i wizytami. {profile.pin ? 'Operacja wymaga podania Twojego kodu PIN.' : ''}
        </p>
        <button
          onClick={handleDeleteActiveProfile}
          className="w-full h-11 border border-solid border-red-600 hover:bg-red-600 text-red-600 hover:text-white font-sans text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
        >
          <span>👤</span>
          TRWALE USUŃ MÓJ PROFIL ({profile.name.toUpperCase()})
        </button>
      </section>

      {/* Primary Logout / Profile switch button */}
      <button
        onClick={onLogout}
        className={`w-full h-12 font-sans text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
          isDark 
            ? 'bg-stone-800 hover:bg-stone-700 text-stone-200' 
            : 'bg-red-50 hover:bg-red-100 text-red-700'
        }`}
      >
        <span>🚪</span>
        WYLOGUJ SIĘ I PRZEŁĄCZ PROFIL
      </button>
    </div>
  );
}
