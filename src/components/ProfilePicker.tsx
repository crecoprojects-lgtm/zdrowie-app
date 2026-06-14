/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserPlus, Heart, LogIn, Trash2, Edit2, ShieldAlert, Lock } from 'lucide-react';
import { Profile } from '../types';

interface ProfilePickerProps {
  profiles: Profile[];
  onSelect: (profile: Profile) => void;
  onAdd: (name: string, avatarUrl: string, pin?: string) => void;
  onDelete: (id: string) => void;
}

// Preset avatars based on the user's friendly animal choices
export const PRESET_AVATARS = [
  {
    id: 'avatar_lis',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%25" height="100%25" fill="%23ffedd5" rx="30"/><text x="50%25" y="65%25" font-size="55" text-anchor="middle" dominant-baseline="middle">🦊</text></svg>',
    label: 'Lisek'
  },
  {
    id: 'avatar_panda',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%25" height="100%25" fill="%23f3f4f6" rx="30"/><text x="50%25" y="65%25" font-size="55" text-anchor="middle" dominant-baseline="middle">🐼</text></svg>',
    label: 'Panda'
  },
  {
    id: 'avatar_lew',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%25" height="100%25" fill="%23fef3c7" rx="30"/><text x="50%25" y="65%25" font-size="55" text-anchor="middle" dominant-baseline="middle">🦁</text></svg>',
    label: 'Lew'
  },
  {
    id: 'avatar_koala',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%25" height="100%25" fill="%23e0f2fe" rx="30"/><text x="50%25" y="65%25" font-size="55" text-anchor="middle" dominant-baseline="middle">🐨</text></svg>',
    label: 'Koala'
  },
  {
    id: 'avatar_zajac',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%25" height="100%25" fill="%23fce7f3" rx="30"/><text x="50%25" y="65%25" font-size="55" text-anchor="middle" dominant-baseline="middle">🐰</text></svg>',
    label: 'Króliczek'
  },
  {
    id: 'avatar_dino',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%25" height="100%25" fill="%23dcfce7" rx="30"/><text x="50%25" y="65%25" font-size="55" text-anchor="middle" dominant-baseline="middle">🦕</text></svg>',
    label: 'Dinozaur'
  },
  {
    id: 'avatar_kot',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%25" height="100%25" fill="%23faf5ff" rx="30"/><text x="50%25" y="65%25" font-size="55" text-anchor="middle" dominant-baseline="middle">🐱</text></svg>',
    label: 'Kotek'
  },
  {
    id: 'avatar_pies',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%25" height="100%25" fill="%23fef9c3" rx="30"/><text x="50%25" y="65%25" font-size="55" text-anchor="middle" dominant-baseline="middle">🐶</text></svg>',
    label: 'Piesek'
  },
  {
    id: 'avatar_mis',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%25" height="100%25" fill="%23efe9db" rx="30"/><text x="50%25" y="65%25" font-size="55" text-anchor="middle" dominant-baseline="middle">🧸</text></svg>',
    label: 'Miś'
  },
  {
    id: 'avatar_zaba',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%25" height="100%25" fill="%23d1fae5" rx="30"/><text x="50%25" y="65%25" font-size="55" text-anchor="middle" dominant-baseline="middle">🐸</text></svg>',
    label: 'Żabka'
  },
  {
    id: 'avatar_sowa',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%25" height="100%25" fill="%23ffedd5" rx="30"/><text x="50%25" y="65%25" font-size="55" text-anchor="middle" dominant-baseline="middle">🦉</text></svg>',
    label: 'Sówka'
  },
  {
    id: 'avatar_osmiornica',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%25" height="100%25" fill="%23ffe4e6" rx="30"/><text x="50%25" y="65%25" font-size="55" text-anchor="middle" dominant-baseline="middle">🐙</text></svg>',
    label: 'Ośmiorniczka'
  },
  {
    id: 'avatar_pingwin',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%25" height="100%25" fill="%23e2e8f0" rx="30"/><text x="50%25" y="65%25" font-size="55" text-anchor="middle" dominant-baseline="middle">🐧</text></svg>',
    label: 'Pingwinek'
  },
  {
    id: 'avatar_tygrys',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%25" height="100%25" fill="%23fef3c7" rx="30"/><text x="50%25" y="65%25" font-size="55" text-anchor="middle" dominant-baseline="middle">🐯</text></svg>',
    label: 'Tygrysek'
  },
  {
    id: 'avatar_jednorozec',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%25" height="100%25" fill="%23f3e8ff" rx="30"/><text x="50%25" y="65%25" font-size="55" text-anchor="middle" dominant-baseline="middle">🦄</text></svg>',
    label: 'Jednorożec'
  },
  {
    id: 'avatar_malpka',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%25" height="100%25" fill="%23fef3c7" rx="30"/><text x="50%25" y="65%25" font-size="55" text-anchor="middle" dominant-baseline="middle">🐵</text></svg>',
    label: 'Małpka'
  },
  {
    id: 'avatar_leniwiec',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%25" height="100%25" fill="%23f5f5f4" rx="30"/><text x="50%25" y="65%25" font-size="55" text-anchor="middle" dominant-baseline="middle">🦥</text></svg>',
    label: 'Leniwiec'
  },
  {
    id: 'avatar_delfin',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%25" height="100%25" fill="%23e0f2fe" rx="30"/><text x="50%25" y="65%25" font-size="55" text-anchor="middle" dominant-baseline="middle">🐬</text></svg>',
    label: 'Delfinek'
  },
  {
    id: 'avatar_pszczola',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%25" height="100%25" fill="%23fef9c3" rx="30"/><text x="50%25" y="65%25" font-size="55" text-anchor="middle" dominant-baseline="middle">🐝</text></svg>',
    label: 'Pszczółka'
  },
  {
    id: 'avatar_zolwik',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%25" height="100%25" fill="%23dcfce7" rx="30"/><text x="50%25" y="65%25" font-size="55" text-anchor="middle" dominant-baseline="middle">🐢</text></svg>',
    label: 'Żółwik'
  }
];

export default function ProfilePicker({ profiles, onSelect, onAdd, onDelete }: ProfilePickerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0].url);
  const [manageMode, setManageMode] = useState(false);

  // States for PIN authentication prompt
  const [activeSecuredProfile, setActiveSecuredProfile] = useState<Profile | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAdd(newName.trim(), selectedAvatar, newPin.trim() || undefined);
    setNewName('');
    setNewPin('');
    setIsAdding(false);
  };

  const handleProfileClick = (profile: Profile) => {
    if (profile.pin) {
      setActiveSecuredProfile(profile);
      setPinInput('');
      setPinError(false);
    } else {
      onSelect(profile);
    }
  };

  const handleKeypress = (digit: string) => {
    if (pinInput.length >= 4) return;
    const newVal = pinInput + digit;
    setPinInput(newVal);

    if (newVal.length === 4) {
      if (newVal === activeSecuredProfile?.pin) {
        const p = activeSecuredProfile;
        setActiveSecuredProfile(null);
        setPinInput('');
        setPinError(false);
        onSelect(p);
      } else {
        setPinError(true);
        setTimeout(() => {
          setPinInput('');
          setPinError(false);
        }, 1200);
      }
    }
  };

  return (
    <div className="min-h-screen bg-stone-50/50 flex flex-col justify-center py-12 px-6 sm:px-12 relative overflow-hidden">
      {/* Background blobs for premium clinical aesthetic */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-[#d6e3ff] rounded-full filter blur-[120px] opacity-25" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#6cf8bb]/20 rounded-full filter blur-[100px] opacity-30" />

      <div className="w-full max-w-md mx-auto z-10">
        <div className="text-center mb-10">
          <div className="mx-auto w-16 h-16 bg-[#00478d] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/10 mb-4 animate-pulse">
            <Heart className="w-8 h-8 text-white fill-white/10" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 font-sans">Zdrowie</h2>
          <p className="mt-2 text-sm text-gray-500 font-sans">
            Wybierz swój profil pacjenta lub utwórz nowe konto i przejdź do planu.
          </p>
        </div>

        {!isAdding ? (
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 space-y-6">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="font-semibold text-gray-800 text-sm tracking-wide uppercase">
                Zarejestrowane konta ({profiles.length})
              </span>
              {profiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setManageMode(!manageMode)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors font-sans ${
                    manageMode 
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {manageMode ? 'Gotowe' : 'Zarządzaj'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 max-h-[280px] overflow-y-auto no-scrollbar py-1">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="group relative flex items-center justify-between p-3.5 rounded-2xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/20 transition-all font-sans"
                >
                  <button
                    onClick={() => !manageMode && handleProfileClick(profile)}
                    disabled={manageMode}
                    className="flex-1 flex items-center gap-4 text-left cursor-pointer focus:outline-none disabled:cursor-default"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shadow-inner shrink-0 transition-transform group-hover:scale-105 duration-200">
                      <img
                        src={profile.avatarUrl}
                        alt={profile.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-semibold text-gray-950 font-sans truncate">{profile.name}</h4>
                        {profile.pin && (
                          <div className="p-1 bg-blue-50 text-blue-600 rounded-md" title="Profil chroniony kodem PIN">
                            <Lock className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 capitalize">
                        {profile.preferences?.highContrastMode ? 'Tryb ciemny' : 'Tryb jasny'} • Preferencje
                      </p>
                    </div>
                  </button>

                  {/* Actions inside picker */}
                  {manageMode ? (
                    <button
                      type="button"
                      onClick={() => onDelete(profile.id)}
                      className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors shrink-0 cursor-pointer"
                      title="Usuń profil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleProfileClick(profile)}
                      className="p-2 ml-2 bg-blue-50 hover:bg-[#00478d] text-[#00478d] hover:text-white rounded-xl transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                    >
                      <LogIn className="w-4.5 h-4.5" />
                    </button>
                  )}
                </div>
              ))}

              {profiles.length === 0 && (
                <div className="text-center py-6 border border-dashed border-gray-200 rounded-2xl">
                  <p className="text-sm text-gray-400">Brak profili. Utwórz pierwsze konto poniżej!</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsAdding(true)}
              className="w-full h-13 border-2 border-dashed border-gray-200 hover:border-[#00478d] hover:bg-neutral-50 rounded-2xl font-sans text-sm font-semibold text-gray-600 hover:text-[#00478d] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4.5 h-4.5" />
              Nowy pacjent
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 space-y-6"
          >
            <div className="pb-3 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-900 font-sans">Utwórz profil pacjenta</h3>
              <p className="text-xs text-gray-400">Możesz zabezpieczyć dostęp do swojego profilu 4-cyfrowym kodem PIN.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="new_name" className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Nazwa lub Imię
                </label>
                <input
                  id="new_name"
                  type="text"
                  required
                  placeholder="np. Pacjent Jan, Mama, Profesor Tomasz"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-[#00478d] focus:ring-1 focus:ring-[#00478d] outline-none font-sans text-sm font-medium transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="new_pin" className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Kod PIN zabezpieczający profil (4 cyfry, opcjonalnie)
                </label>
                <input
                  id="new_pin"
                  type="text"
                  pattern="[0-9]*"
                  maxLength={4}
                  placeholder="Zostaw puste dla logowania bez hasła"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-[#00478d] focus:ring-1 focus:ring-[#00478d] outline-none font-sans text-sm font-medium tracking-wide transition-all text-center"
                />
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Wybierz awatar
                </span>
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
                  {PRESET_AVATARS.map((avatar) => (
                    <button
                      type="button"
                      key={avatar.id}
                      onClick={() => setSelectedAvatar(avatar.url)}
                      className={`relative w-14 h-14 rounded-2xl overflow-hidden shadow-sm shrink-0 border-2 transition-all duration-200 cursor-pointer ${
                        selectedAvatar === avatar.url 
                          ? 'border-[#00478d] scale-105 ring-2 ring-blue-100' 
                          : 'border-transparent hover:scale-102 hover:border-gray-300'
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

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 h-12 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm font-sans transition-colors cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="flex-1 h-12 bg-[#00478d] hover:bg-[#005eb8] text-white rounded-xl font-semibold text-sm font-sans transition-colors shadow-md shadow-blue-900/10 cursor-pointer"
                >
                  Zapisz profil
                </button>
              </div>
            </form>
          </motion.div>
        )}

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-stone-400 font-sans justify-items-center">
          <ShieldAlert className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span>Dane przechowywane są bezpiecznie w chmurze Firestore</span>
        </div>
      </div>

      {/* Sleek PIN Keypad Dialog Overlay */}
      {activeSecuredProfile && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-md flex flex-col justify-center items-center z-50 p-6 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-6 shadow-2xl">
            <div className="space-y-2">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-blue-105 mx-auto shadow-md">
                <img
                  src={activeSecuredProfile.avatarUrl}
                  alt={activeSecuredProfile.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-bold text-gray-900 font-sans">Profil chroniony</h3>
              <p className="text-xs text-gray-400">Podaj 4-cyfrowy kod PIN dla {activeSecuredProfile.name}</p>
            </div>

            {/* Dot Display Indicators for typed characters */}
            <div className={`flex justify-center gap-4 py-3 ${pinError ? 'animate-bounce' : ''}`}>
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                    pinInput.length > idx
                      ? 'bg-blue-600 border-blue-600 scale-110'
                      : 'border-gray-200'
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <p className="text-xs text-red-500 font-semibold font-sans animate-pulse">Nieprawidłowy PIN. Spróbuj ponownie.</p>
            )}

            {/* Smart numeric keyboard layout */}
            <div className="grid grid-cols-3 gap-3.5 max-w-[240px] mx-auto pt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  type="button"
                  key={num}
                  onClick={() => handleKeypress(num.toString())}
                  className="w-14 h-14 bg-stone-50 hover:bg-stone-100 text-stone-800 rounded-full font-bold text-lg flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPinInput('')}
                className="w-14 h-14 text-xs font-semibold text-gray-400 hover:text-gray-600 flex items-center justify-center active:scale-95 cursor-pointer font-sans"
              >
                Wyczyść
              </button>
              <button
                type="button"
                onClick={() => handleKeypress('0')}
                className="w-14 h-14 bg-stone-50 hover:bg-stone-100 text-stone-800 rounded-full font-bold text-lg flex items-center justify-center transition-all active:scale-90 cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSecuredProfile(null);
                  setPinInput('');
                  setPinError(false);
                }}
                className="w-14 h-14 text-xs font-semibold text-red-500 hover:text-red-700 flex items-center justify-center active:scale-95 cursor-pointer font-sans"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
