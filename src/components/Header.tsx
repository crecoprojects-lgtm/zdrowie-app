/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  CloudOff, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Bell, 
  X, 
  AlertTriangle, 
  Info, 
  Trash2 
} from 'lucide-react';
import { Profile, SyncStatusState, AppNotification } from '../types';

interface HeaderProps {
  profile: Profile;
  tabTitle: string;
  syncStatus: SyncStatusState;
  notifications: AppNotification[];
  onDeleteNotification: (id: string) => void;
  onLogout: () => void;
}

export default function Header({ 
  profile, 
  tabTitle, 
  syncStatus, 
  notifications, 
  onDeleteNotification, 
  onLogout 
}: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;
  const isDark = profile.preferences?.highContrastMode ?? false;

  return (
    <header className={`sticky top-0 z-40 backdrop-blur-md border-b px-5 h-16 flex items-center justify-between shadow-sm transition-colors duration-200 ${
      isDark 
        ? 'bg-stone-950/80 border-stone-800/80 shadow-black/15' 
        : 'bg-white/80 border-gray-100/80 shadow-gray-100/10'
    }`}>
      <div className="flex items-center gap-3">
        {/* Clickable Profile Avatar to quickly exit/logout */}
        <button
          onClick={onLogout}
          className={`relative w-10 h-10 rounded-xl overflow-hidden border shadow-sm shrink-0 hover:scale-105 active:scale-95 duration-200 cursor-pointer group ${
            isDark ? 'border-stone-800 bg-stone-900' : 'border-gray-100 bg-gray-50'
          }`}
          title="Przełącz profil"
        >
          <img
            src={profile.avatarUrl}
            alt={profile.name}
            className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-[#00478d]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-bold leading-none">
            WYD
          </div>
        </button>

        <div>
          <span className={`block text-[10px] font-bold uppercase tracking-widest leading-none ${
            isDark ? 'text-stone-400' : 'text-gray-400'
          }`}>
            Pacjent: {profile.name}
          </span>
          <h1 className={`font-sans font-bold text-lg mt-1 ${isDark ? 'text-stone-100' : 'text-gray-950'}`}>
            {tabTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 relative" ref={dropdownRef}>
        {/* Custom Sync Status Indicator */}
        <div 
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-medium transition-all duration-300"
          style={{
            backgroundColor: 
              syncStatus === 'synced' ? (isDark ? '#022c22' : '#f0fdf4') :
              syncStatus === 'syncing' ? (isDark ? '#451a03' : '#fffbeb') :
              syncStatus === 'error' ? (isDark ? '#450a0a' : '#fef2f2') : (isDark ? '#1c1917' : '#f5f5f5'),
            color:
              syncStatus === 'synced' ? (isDark ? '#bffdf4' : '#166534') :
              syncStatus === 'syncing' ? (isDark ? '#f59e0b' : '#92400e') :
              syncStatus === 'error' ? (isDark ? '#f87171' : '#991b1b') : (isDark ? '#d6d3d1' : '#404040'),
            border: isDark ? '1px solid currentColor' : 'none'
          }}
        >
          {syncStatus === 'synced' && (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 animate-bounce" />
              <span className="hidden xs:inline">Połączono</span>
            </>
          )}
          {syncStatus === 'syncing' && (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              <span className="hidden xs:inline">Zapis...</span>
            </>
          )}
          {syncStatus === 'offline' && (
            <>
              <CloudOff className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden xs:inline">Lokalnie</span>
            </>
          )}
          {syncStatus === 'error' && (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              <span className="hidden xs:inline">Błąd</span>
            </>
          )}
        </div>

        {/* IN-APP ALERTS BELL ICON AS REQUESTED BY USER */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`relative w-9 h-9 flex items-center justify-center rounded-xl duration-205 transition-colors cursor-pointer border ${
            isDark 
              ? 'bg-stone-900 border-stone-800 text-stone-300 hover:text-stone-100' 
              : 'bg-stone-50 border-gray-150 text-gray-600 hover:text-gray-900'
          }`}
          title="Powiadomienia"
        >
          <Bell className="w-4.5 h-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse border-2 border-white font-mono">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Dynamic drop list */}
        {showDropdown && (
          <div className={`absolute right-0 top-11 w-80 rounded-2xl shadow-xl z-55 overflow-hidden animate-slideDown max-h-[80vh] flex flex-col scale-100 origin-top-right transition-all border ${
            isDark ? 'bg-stone-900 border-stone-800 text-white' : 'bg-white border-gray-150 text-gray-900'
          }`}>
            {/* Header */}
            <div className={`px-4 py-3 flex justify-between items-center shrink-0 border-b ${
              isDark ? 'bg-stone-850 border-stone-850' : 'bg-stone-50 border-gray-100'
            }`}>
              <span className={`text-xs font-extrabold uppercase tracking-widest flex items-center gap-1.5 ${
                isDark ? 'text-stone-100' : 'text-gray-900'
              }`}>
                <Bell className={`w-4 h-4 ${isDark ? 'text-[#6cf8bb]' : 'text-[#00478d]'}`} />
                Powiadomienia ({unreadCount})
              </span>
              {notifications.length > 0 && (
                <span className="text-[10px] text-stone-400 font-bold">Wewnętrzne</span>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto p-2 space-y-2 no-scrollbar max-h-72">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-stone-400 flex flex-col items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  <p className="text-xs font-semibold">Brak nowych powiadomień</p>
                  <p className="text-[10px] text-stone-500">Wszystkie leki i opakowania są pod stałą kontrolą.</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const urgent = notif.type === 'warning';
                  return (
                    <div 
                      key={notif.id} 
                      className={`p-3 rounded-xl border text-left transition-all ${
                        urgent 
                          ? isDark 
                            ? 'bg-red-950/15 border-red-900/30 text-red-200 shadow-sm' 
                            : 'bg-red-50/70 border-red-105 text-red-950 shadow-sm' 
                          : isDark
                            ? 'bg-stone-850/40 border-stone-800 text-stone-300'
                            : 'bg-stone-50/50 border-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <div className="flex gap-2 items-start shrink-0">
                          {urgent ? (
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          ) : (
                            <Info className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-[#6cf8bb]' : 'text-[#00478d]'}`} />
                          )}
                          <div>
                            <p className="text-xs font-extrabold leading-tight">{notif.title}</p>
                            <p className={`text-[11px] leading-snug mt-1 ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>{notif.message}</p>
                            <span className="text-[8px] font-bold text-stone-400 block mt-1.5 uppercase">
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => onDeleteNotification(notif.id)}
                          className="text-stone-400 hover:text-red-500 p-0.5 rounded-lg duration-150 cursor-pointer"
                          title="Usuń"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
