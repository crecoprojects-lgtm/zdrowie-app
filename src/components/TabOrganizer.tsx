/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Box, Check, Info, CalendarClock, RefreshCw, AlertTriangle } from 'lucide-react';
import { Profile, Medication } from '../types';
import { dbService, globalAppCache } from '../firebase';

const DAYS_OF_WEEK = [
  { key: 'pn', name: 'Poniedziałek', short: 'Pn', label: 'Pn' },
  { key: 'wt', name: 'Wtorek', short: 'Wt', label: 'Wt' },
  { key: 'sr', name: 'Środa', short: 'Śr', label: 'Śr' },
  { key: 'cz', name: 'Czwartek', short: 'Cz', label: 'Cz' },
  { key: 'pt', name: 'Piątek', short: 'Pt', label: 'Pt' },
  { key: 'so', name: 'Sobota', short: 'So', label: 'So' },
  { key: 'nd', name: 'Niedziela', short: 'Nd', label: 'Nd' }
];

interface TabOrganizerProps {
  profile: Profile;
  onShowToast: (text: string, type: 'success' | 'error' | 'info') => void;
  syncTrigger: number;
  onDataChanged: () => void;
}

export default function TabOrganizer({ profile, onShowToast, syncTrigger, onDataChanged }: TabOrganizerProps) {
  // Local state for daily packing box simulation
  const [packedDays, setPackedDays] = useState<{ [key: string]: boolean }>(() => {
    const saved = localStorage.getItem(`packed_days_${profile.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      pn: false,
      wt: false,
      sr: false,
      cz: false,
      pt: false,
      so: false,
      nd: false,
    };
  });

  // Save packedDays when updated
  useEffect(() => {
    localStorage.setItem(`packed_days_${profile.id}`, JSON.stringify(packedDays));
  }, [packedDays, profile.id]);

  // Active medication stocks with memory cache
  const [medications, setMedications] = useState<Medication[]>(() => globalAppCache.medications[profile.id] || []);
  const [loadingMeds, setLoadingMeds] = useState(() => !globalAppCache.medications[profile.id]);

  useEffect(() => {
    if (profile.id) {
      globalAppCache.medications[profile.id] = medications;
    }
  }, [medications, profile.id]);

  const loadMedications = async () => {
    try {
      if (!globalAppCache.medications[profile.id]) {
        setLoadingMeds(true);
      }
      const list = await dbService.getMedications(profile.id);
      setMedications(list);
    } catch {
      onShowToast('Nie udało się wczytać stanu apteczki.', 'error');
    } finally {
      setLoadingMeds(false);
    }
  };

  useEffect(() => {
    loadMedications();
  }, [profile.id, syncTrigger]);

  const handleReplenish = async (med: Medication, amount: number) => {
    const nextStock = Math.max(0, (med.currentStock ?? 0) + amount);
    const updated: Medication = {
      ...med,
      currentStock: nextStock,
      trackingEnabled: true
    };
    try {
      dbService.setSyncState('syncing');
      await dbService.saveMedication(updated);
      setMedications(prev => prev.map(m => m.id === med.id ? updated : m));
      onShowToast(`Dodano +${amount} ${med.unit || 'szt.'} do zapasu leku ${med.name}!`, 'success');
      onDataChanged();
    } catch {
      onShowToast('Błąd zapisu zapasów apteczki.', 'error');
    }
  };

  const handleToggleTracking = async (med: Medication, enable: boolean) => {
    const updated: Medication = {
      ...med,
      trackingEnabled: enable,
      initialStock: enable ? med.initialStock || 30 : undefined,
      currentStock: enable ? med.currentStock || 30 : undefined,
      lowStockThreshold: enable ? med.lowStockThreshold || 10 : undefined,
      unit: enable ? med.unit || 'szt.' : undefined
    };
    try {
      dbService.setSyncState('syncing');
      await dbService.saveMedication(updated);
      setMedications(prev => prev.map(m => m.id === med.id ? updated : m));
      onShowToast(enable ? `Włączono monitoring dla ${med.name}` : `Wyłączono monitoring dla ${med.name}`, 'info');
      if (enable) {
        // Automatically open the editing form so they can establish the initial stock level right away!
        startEditingStock(updated);
      }
      onDataChanged();
    } catch {
      onShowToast('Błąd aktualizacji parametrów leku.', 'error');
    }
  };

  // Custom stock editing support
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [editCurrent, setEditCurrent] = useState<number>(30);
  const [editInitial, setEditInitial] = useState<number>(30);
  const [editThreshold, setEditThreshold] = useState<number>(10);
  const [editUnit, setEditUnit] = useState<string>('szt.');

  const startEditingStock = (med: Medication) => {
    setEditingMedId(med.id);
    setEditCurrent(med.currentStock ?? 30);
    setEditInitial(med.initialStock ?? 30);
    setEditThreshold(med.lowStockThreshold ?? 10);
    setEditUnit(med.unit || 'szt.');
  };

  const handleSaveCustomStocks = async (med: Medication) => {
    const updated: Medication = {
      ...med,
      currentStock: editCurrent,
      initialStock: editInitial,
      lowStockThreshold: editThreshold,
      unit: editUnit || 'szt.'
    };
    try {
      dbService.setSyncState('syncing');
      await dbService.saveMedication(updated);
      setMedications(prev => prev.map(m => m.id === med.id ? updated : m));
      onShowToast(`Ustalono zapas dla leku ${med.name}!`, 'success');
      setEditingMedId(null);
      onDataChanged();
    } catch {
      onShowToast('Błąd aktualizacji parametru leku.', 'error');
    }
  };

  const handleTogglePack = (dayKey: string, dayName: string) => {
    const nextState = !packedDays[dayKey];
    setPackedDays(prev => ({ ...prev, [dayKey]: nextState }));
    onShowToast(
      nextState 
        ? `Szufladka na dzień: ${dayName} została pomyślnie zapakowana!` 
        : `Anulowano status zapakowania dla dnia: ${dayName}`, 
      'success'
    );
  };

  const totalDaysCount = 7;
  const packedDaysCount = Object.values(packedDays).filter(Boolean).length;
  const isDark = profile.preferences?.highContrastMode ?? false;

  return (
    <div className="px-5 py-6 space-y-6 pb-28">
      {/* Hero section */}
      <div className="flex flex-col gap-1">
        <h2 className="sr-only">Kasetka i Apteczka</h2>
        <h3 className={`font-sans font-bold text-2xl tracking-tight leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Domowa Apteczka i Kasetka
        </h3>
        <p className={`text-xs font-medium ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
          Monitoruj poziom zapasów leków i przygotuj organizer tygodniowy.
        </p>
      </div>

      {/* Cloud Medication Stock tracker panel */}
      <section className={`rounded-2xl border p-5 shadow-sm space-y-4 transition-colors duration-200 ${
        isDark 
          ? 'bg-stone-900 border-stone-800 shadow-black/35' 
          : 'bg-white border-gray-100 shadow-gray-100/50'
      }`}>
        <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-stone-850' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-stone-850 text-[#6cf8bb]' : 'bg-blue-50 text-[#00478d]'}`}>
              <Box className="w-5 h-5 text-current" />
            </div>
            <div>
              <h4 className={`font-bold text-sm ${isDark ? 'text-stone-100' : 'text-gray-900'}`}>Zapas Opakowań Leków</h4>
              <p className="text-[10px] text-stone-400 leading-none mt-0.5">Automatyczny licznik pozostałych dawek</p>
            </div>
          </div>
          <button
            onClick={() => { loadMedications(); }}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-stone-400 hover:text-stone-200 hover:bg-stone-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
            title="Odśwież stany"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loadingMeds ? (
          <div className="flex justify-center items-center py-6 gap-2 text-stone-400 text-xs font-semibold">
            <span className={`w-4 h-4 border-2 border-t-transparent animate-spin rounded-full ${isDark ? 'border-[#6cf8bb]' : 'border-[#00478d]'}`} />
            Weryfikacja ilości w bazie...
          </div>
        ) : medications.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs font-medium text-stone-400 leading-relaxed">Brak zdefiniowanych leków do śledzenia.</p>
            <p className="text-[10px] text-stone-500 mt-1">Skonfiguruj kurację w pierwszej zakładce, aby założyć licznik.</p>
          </div>
        ) : (
          <div className={`space-y-4 divide-y ${isDark ? 'divide-stone-800' : 'divide-gray-150'}`}>
            {medications.map((med) => {
              const tracking = med.trackingEnabled;
              const stock = med.currentStock ?? 0;
              const initial = med.initialStock ?? 30;
              const threshold = med.lowStockThreshold ?? 10;
              const isLow = tracking && stock <= threshold;
              const percent = tracking ? Math.min(100, Math.round((stock / (initial || 1)) * 100)) : 0;
              const isEditing = editingMedId === med.id;

              return (
                <div key={med.id} className="pt-3.5 first:pt-0 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className={`font-bold text-sm leading-snug ${isDark ? 'text-stone-100' : 'text-gray-900'}`}>{med.name}</h5>
                      <p className="text-[9px] text-[#8e8e93] leading-none mt-0.5 font-bold uppercase tracking-wider">
                        {tracking ? `Zapas: ${stock} / ${initial} ${med.unit || 'szt.'}` : 'Śledzenie zapasu pominięte'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isLow && !isEditing && (
                        <span className="flex items-center gap-1 text-[9px] bg-red-500/10 text-red-400 font-bold border border-red-500/20 rounded-lg px-2 py-0.5 animate-pulse uppercase">
                          <AlertTriangle className="w-3 h-3" />
                          Uzupełnij!
                        </span>
                      )}

                      {isEditing ? (
                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${isDark ? 'bg-stone-800 text-stone-300' : 'bg-gray-100 text-gray-700'}`}>
                          Konfiguracja...
                        </span>
                      ) : tracking ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEditingStock(med)}
                            className={`text-[9px] font-bold px-2 py-1 rounded border transition-all cursor-pointer ${
                              isDark 
                                ? 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-750' 
                                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            Ustal zapas
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleTracking(med, false)}
                            className={`text-[9px] font-bold px-2 py-1 rounded border transition-all cursor-pointer ${
                              isDark 
                                ? 'bg-red-950/15 border-red-900/30 text-red-400 hover:bg-red-900/25' 
                                : 'bg-red-50 border-red-100 text-red-700 hover:bg-red-100'
                            }`}
                          >
                            Zignoruj
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleTracking(med, true)}
                          className={`text-[9px] font-bold px-2.5 py-1 rounded border transition-all cursor-pointer ${
                            isDark 
                              ? 'bg-[#6cf8bb]/15 text-[#6cf8bb] border-[#6cf8bb]/30 hover:bg-[#6cf8bb]/25' 
                              : 'bg-emerald-50 text-emerald-800 border-emerald-100 hover:bg-[#6cf8bb]'
                          }`}
                        >
                          Śledź zapas
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className={`p-4 rounded-xl border space-y-3 font-sans my-2 text-left ${
                      isDark ? 'bg-stone-850/80 border-stone-850' : 'bg-stone-50 border-gray-150'
                    }`}>
                      <p className={`text-[10px] font-extrabold uppercase tracking-wider ${isDark ? 'text-stone-300' : 'text-gray-900'}`}>
                        PARAMETRY ZAPASÓW LEKU
                      </p>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-stone-300' : 'text-gray-600'}`}>
                            Aktualny stan zapasu ({editUnit})
                          </label>
                          <input
                            type="number"
                            value={editCurrent}
                            onChange={(e) => setEditCurrent(Math.max(0, parseInt(e.target.value) || 0))}
                            className={`w-full px-2.5 py-1.5 text-xs rounded-lg border font-mono ${
                              isDark 
                                ? 'bg-stone-900 border-stone-700 text-white focus:border-[#6cf8bb] outline-none' 
                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 outline-none'
                            }`}
                          />
                        </div>

                        <div>
                          <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-stone-300' : 'text-gray-600'}`}>
                            Założone opakowanie ({editUnit})
                          </label>
                          <input
                            type="number"
                            value={editInitial}
                            onChange={(e) => setEditInitial(Math.max(1, parseInt(e.target.value) || 0))}
                            className={`w-full px-2.5 py-1.5 text-xs rounded-lg border font-mono ${
                              isDark 
                                ? 'bg-stone-900 border-stone-700 text-white focus:border-[#6cf8bb] outline-none' 
                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 outline-none'
                            }`}
                          />
                        </div>

                        <div>
                          <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-stone-300' : 'text-gray-600'}`}>
                            Próg niski-ostrzegawczy ({editUnit})
                          </label>
                          <input
                            type="number"
                            value={editThreshold}
                            onChange={(e) => setEditThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                            className={`w-full px-2.5 py-1.5 text-xs rounded-lg border font-mono ${
                              isDark 
                                ? 'bg-stone-900 border-stone-700 text-white focus:border-[#6cf8bb] outline-none' 
                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 outline-none'
                            }`}
                          />
                        </div>

                        <div>
                          <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-stone-300' : 'text-gray-600'}`}>
                            Jednostka miary (np. szt., ml)
                          </label>
                          <input
                            type="text"
                            value={editUnit}
                            onChange={(e) => setEditUnit(e.target.value)}
                            className={`w-full px-2.5 py-1.5 text-xs rounded-lg border ${
                              isDark 
                                ? 'bg-stone-900 border-stone-700 text-white focus:border-[#6cf8bb] outline-none' 
                                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 outline-none'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingMedId(null)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                            isDark ? 'bg-stone-800 text-stone-300 hover:bg-stone-750' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          Anuluj
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveCustomStocks(med)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            isDark 
                              ? 'bg-[#6cf8bb] text-stone-950 hover:bg-[#52dfa4]' 
                              : 'bg-[#6cf8bb] text-stone-950 hover:bg-[#52dfa4]'
                          }`}
                        >
                          Zapisz zapas
                        </button>
                      </div>
                    </div>
                  ) : tracking ? (
                    <div className="space-y-2 font-sans text-left">
                      {/* Range gauge bar */}
                      <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-stone-850' : 'bg-stone-100'}`}>
                        <div 
                          className={`h-full rounded-full transition-all duration-700 ${isLow ? 'bg-red-500' : 'bg-[#6cf8bb]'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-stone-400 font-medium font-bold">Pozostało w pakiecie: {percent}%</span>
                        {isLow ? (
                          <span className="text-red-400 font-extrabold font-mono">Mało leku! ({stock} {med.unit || 'szt.'})</span>
                        ) : (
                          <span className="text-stone-400 font-bold font-mono">Stan bezpieczny</span>
                        )}
                      </div>

                      {/* Replenish Pack Buttons trigger */}
                      <div className="flex gap-1.5 pt-1">
                        {[10, 30, 60].map((qty) => (
                          <button
                            key={qty}
                            type="button"
                            onClick={() => handleReplenish(med, qty)}
                            className={`text-[10px] font-bold h-7 rounded-lg px-2.5 transition-all cursor-pointer ${
                              isDark 
                                ? 'bg-stone-800 hover:bg-stone-750 text-stone-200' 
                                : 'bg-[#f3f4f6] hover:bg-gray-200 text-gray-800'
                            }`}
                          >
                            +{qty} {med.unit || 'szt.'}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className={`text-[11px] italic text-left ${isDark ? 'text-stone-500' : 'text-gray-400'}`}>
                      Uzasadnienie: Nie monitorujesz zapasu apteczki dla tego leku. Kliknij przycisk "Śledź zapas", aby uruchomić licznik.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Weekly packing progress bar */}
      <section className={`rounded-2xl border p-5 shadow-sm transition-colors duration-200 ${
        isDark 
          ? 'bg-stone-900 border-stone-800 shadow-black/35' 
          : 'bg-white border-gray-100 shadow-gray-100/50'
      }`}>
        <div className="flex justify-between items-end mb-2.5">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-[#6cf8bb]' : 'text-[#00478d]'}`}>
            Postęp pakowania kasetki
          </span>
          <span className={`text-xl font-mono font-bold ${isDark ? 'text-[#6cf8bb]' : 'text-[#00478d]'}`}>
            {packedDaysCount} / {totalDaysCount}
          </span>
        </div>
        <div className={`w-full h-2 rounded-full overflow-hidden mb-1.5 ${isDark ? 'bg-stone-850' : 'bg-[#e2e8f0]'}`}>
          <div 
            className="bg-[#6cf8bb] h-full rounded-full transition-all duration-700" 
            style={{ width: `${(packedDaysCount / totalDaysCount) * 100}%` }}
          />
        </div>
        <p className="text-[10px] text-stone-400 leading-none">
          {packedDaysCount === totalDaysCount 
            ? 'Znakomicie! Cały organizer kasetkowy został załadowany.' 
            : `Zapakowano ${packedDaysCount} z ${totalDaysCount} szufladek.`}
        </p>
      </section>

      {/* Day grids list - Dynamically rendered with REAL active medications */}
      <div className="space-y-4">
        {DAYS_OF_WEEK.map((day) => {
          // Filter medications that are active on this day
          const dayMeds = medications.filter(med => {
            if (med.frequency === 'daily') return true;
            if (med.frequency === 'custom' && Array.isArray(med.days)) {
              return med.days.includes(day.short);
            }
            return false;
          });

          const isPacked = packedDays[day.key];

          const ranoList = dayMeds.filter(med => med.times?.some(t => t.timeKey === 'rano' && t.active));
          const poludnieList = dayMeds.filter(med => med.times?.some(t => t.timeKey === 'poludnie' && t.active));
          const wieczorList = dayMeds.filter(med => med.times?.some(t => t.timeKey === 'wieczor' && t.active));

          const hasMeds = ranoList.length > 0 || poludnieList.length > 0 || wieczorList.length > 0;

          return (
            <div 
              key={day.key}
              onClick={() => handleTogglePack(day.key, day.name)}
              className={`rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer ${
                isPacked 
                  ? 'opacity-65 grayscale-55' 
                  : isDark
                    ? 'border-stone-800 hover:border-emerald-555 bg-stone-900 shadow-md shadow-black/15'
                    : 'border-gray-100 shadow-sm shadow-gray-100/50 hover:border-blue-100 bg-white'
              } ${isPacked && isDark ? 'border-emerald-900/30 bg-emerald-950/10' : isPacked ? 'border-emerald-100 bg-emerald-50/10' : ''}`}
            >
              {/* Day slot header bar */}
              <div className={`px-4 py-3 flex justify-between items-center border-b ${
                isDark ? 'bg-stone-850/65 border-stone-800' : 'bg-[#fafafc] border-gray-100'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm ${
                    isPacked 
                      ? 'bg-emerald-500 text-white' 
                      : isDark 
                        ? 'bg-stone-800 text-stone-300' 
                        : 'bg-[#00478d]/10 text-[#00478d]'
                  }`}>
                    {day.label}
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider font-sans">Bieżący Tydzień</span>
                    <p className={`text-sm font-bold leading-none mt-1 ${
                      isPacked 
                        ? 'text-emerald-500 font-extrabold' 
                        : isDark 
                          ? 'text-stone-100' 
                          : 'text-gray-905'
                    }`}>
                      {day.name} • {isPacked ? 'Zapakowano kasetkę' : 'Do zapakowania'}
                    </p>
                  </div>
                </div>

                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                  isPacked 
                    ? 'border-emerald-500 bg-emerald-500 text-white' 
                    : isDark 
                      ? 'border-stone-700 bg-stone-800' 
                      : 'border-gray-300 bg-white'
                }`}>
                  {isPacked && <Check className="w-4.5 h-4.5 stroke-[3px]" />}
                </div>
              </div>

              <div className="p-4 space-y-4">
                {!hasMeds ? (
                  <p className="text-xs text-stone-450 italic py-2 text-center font-medium">
                    Brak zaplanowanych leków na ten dzień. Jedz posiłki i pij dużo wody!
                  </p>
                ) : (
                  <>
                    {/* Rano Slot */}
                    {ranoList.length > 0 && (
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center min-w-[50px] text-stone-400">
                          <Box className={`w-4.5 h-4.5 ${isDark ? 'text-[#6cf8bb]' : 'text-[#00478d]'}`} />
                          <span className="text-[10px] font-bold mt-1 uppercase text-center leading-none">Rano</span>
                        </div>
                        <div className={`flex-1 space-y-1.5 border-l-2 pl-3.5 ${isDark ? 'border-stone-700' : 'border-[#00478d]'}`}>
                          {ranoList.map(med => {
                            const t = med.times?.find(time => time.timeKey === 'rano');
                            return (
                              <p key={med.id} className={`text-xs font-semibold ${isDark ? 'text-stone-200' : 'text-gray-800'}`}>
                                <span className="font-bold">{med.name}:</span> {t?.dosage || '1 szt.'}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Południe Slot */}
                    {poludnieList.length > 0 && (
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center min-w-[50px] text-stone-400">
                          <Box className="w-4.5 h-4.5 text-emerald-500" />
                          <span className="text-[10px] font-bold mt-1 uppercase text-center leading-none">Południe</span>
                        </div>
                        <div className={`flex-1 space-y-1.5 border-l-2 pl-3.5 ${isDark ? 'border-stone-700' : 'border-emerald-250'}`}>
                          {poludnieList.map(med => {
                            const t = med.times?.find(time => time.timeKey === 'poludnie');
                            return (
                              <p key={med.id} className={`text-xs font-semibold ${isDark ? 'text-stone-200' : 'text-gray-800'}`}>
                                <span className="font-bold">{med.name}:</span> {t?.dosage || '1 szt.'}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Wieczór Slot */}
                    {wieczorList.length > 0 && (
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center min-w-[50px] text-stone-400">
                          <Box className={`w-4.5 h-4.5 ${isDark ? 'text-[#6cf8bb]' : 'text-blue-900'}`} />
                          <span className="text-[10px] font-bold mt-1 uppercase text-center leading-none">Wieczór</span>
                        </div>
                        <div className={`flex-1 space-y-1.5 border-l-2 pl-3.5 ${isDark ? 'border-stone-700' : 'border-stone-300'}`}>
                          {wieczorList.map(med => {
                            const t = med.times?.find(time => time.timeKey === 'wieczor');
                            return (
                              <p key={med.id} className={`text-xs font-semibold ${isDark ? 'text-stone-200' : 'text-gray-800'}`}>
                                <span className="font-bold">{med.name}:</span> {t?.dosage || '1 szt.'}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Tip Notice */}
        <div className={`border p-4 flex gap-3 shadow-sm rounded-2xl ${
          isDark 
            ? 'bg-emerald-950/15 border-emerald-900/30 text-emerald-300' 
            : 'bg-emerald-50 border-emerald-100 text-emerald-900'
        }`}>
          <Info className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold leading-relaxed font-sans">
            Pamiętaj, aby trzymać organizer tygodniowy w suchym i chłodnym miejscu, z dala od bezpośredniego światła słonecznego oraz wilgoci (np. z dala od zlewu łazienkowego).
          </p>
        </div>
      </div>
    </div>
  );
}
