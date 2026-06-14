// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, 
  CloudSun, 
  Moon, 
  Check, 
  Plus, 
  Trash2, 
  Calendar, 
  Pill, 
  ClipboardCheck, 
  User, 
  ShieldAlert, 
  Save, 
  AlertCircle,
  Clock,
  ChevronRight
} from 'lucide-react';
import { Profile, Medication, Dose, TimeOfDayKey, MedicationTime } from '../types';
import { dbService, globalAppCache } from '../firebase';

interface TabTodayProps {
  profile: Profile;
  onShowToast: (text: string, type: 'success' | 'error' | 'info') => void;
  syncTrigger: number;
  onDataChanged: () => void;
}

export default function TabToday({ profile, onShowToast, syncTrigger, onDataChanged }: TabTodayProps) {
  const [medications, setMedications] = useState<Medication[]>(() => globalAppCache.medications[profile.id] || []);
  const [doses, setDoses] = useState<Dose[]>(() => globalAppCache.doses[profile.id] || []);
  const [isLoading, setIsLoading] = useState(() => !globalAppCache.medications[profile.id]);

  // Sync memory cache automatically
  useEffect(() => {
    if (profile.id) {
      globalAppCache.medications[profile.id] = medications;
    }
  }, [medications, profile.id]);

  useEffect(() => {
    if (profile.id) {
      globalAppCache.doses[profile.id] = doses;
    }
  }, [doses, profile.id]);

  // New Medication Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [medName, setMedName] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'custom'>('daily');
  const [customDays, setCustomDays] = useState<string[]>(['Pn', 'Wt', 'Śr', 'Cz', 'Pt']);
  
  // Custom slots
  const [slots, setSlots] = useState<{
    rano: { selected: boolean; amount: string; dosage: string };
    poludnie: { selected: boolean; amount: string; dosage: string };
    wieczor: { selected: boolean; amount: string; dosage: string };
  }>({
    rano: { selected: true, amount: '1', dosage: 'tabletka' },
    poludnie: { selected: false, amount: '1', dosage: 'kapsułka' },
    wieczor: { selected: false, amount: '1', dosage: 'tabletka' }
  });

  const [durationDays, setDurationDays] = useState<string>('30');
  const [stagePlanEnabled, setStagePlanEnabled] = useState(false);
  const [stageName, setStageName] = useState('Etap 1');
  const [stageDays, setStageDays] = useState<string>('7');

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isFormOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFormOpen]);

  // Stock tracking form states
  const [stockTracking, setStockTracking] = useState(false);
  const [initialStock, setInitialStock] = useState('30');
  const [currentStock, setCurrentStock] = useState('30');
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [stockUnit, setStockUnit] = useState('tabletka');

  const todayStr = new Date().toISOString().split('T')[0];

  const daysOfWeekFull = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

  const loadData = async (silent = false) => {
    try {
      if (!silent && medications.length === 0) {
        setIsLoading(true);
      }
      const userMedications = await dbService.getMedications(profile.id);
      let userDoses = await dbService.getDoses(profile.id);

      // Look up if we need to auto-generate doses for today's date
      const todaysDoses = userDoses.filter(d => d.date === todayStr);
      if (todaysDoses.length === 0 && userMedications.length > 0) {
        // Generate new doses for today's template schedules on-the-fly!
        const newBornDoses: Dose[] = [];
        userMedications.forEach(m => {
          m.times.forEach(t => {
            if (t.active) {
              newBornDoses.push({
                id: `dose-${m.id}-${t.timeKey}-${todayStr}`,
                profileId: profile.id,
                medicationId: m.id,
                medicationName: m.name,
                timeOfDay: t.timeKey,
                dosage: t.dosage,
                taken: false,
                date: todayStr
              });
            }
          });
        });

        for (const d of newBornDoses) {
          await dbService.saveDose(d);
        }
        // fetch again
        const freshDoses = await dbService.getDoses(profile.id);
        const finalDoses = freshDoses.filter(d => d.date === todayStr);
        setDoses(finalDoses);
      } else {
        setDoses(todaysDoses);
      }
      setMedications(userMedications);
    } catch {
      onShowToast('Nie udało się wczytać dzisiejszego harmonogramu.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile.id, syncTrigger]);

  // Deep Link: Obsługa zewnętrznych widżetów iOS (Skróty Apple)
  useEffect(() => {
    if (doses.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const action = params.get('widget_action');
    const slotStr = params.get('slot') as TimeOfDayKey;

    if (action === 'take_all' && slotStr) {
      // Wykonaj akcję z opóźnieniem by UI zdążyło się załadować
      setTimeout(() => {
        takeAllForSlot(slotStr);
        // Wyczyść URL, aby zapobiec ponownemu wywołaniu przy odświeżeniu
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 600);
    }
  }, [doses.length]); // Nasłuchujemy na załadowanie danych z bazy


  const parseDosageAmount = (dosageStr: string): number => {
    if (!dosageStr) return 1;
    const match = dosageStr.match(/^([0-9]+[.,]?[0-9]*)/);
    if (match) {
      return parseFloat(match[1].replace(',', '.'));
    }
    return 1;
  };

  const modifyMedicationStock = async (medicationId: string, diff: number) => {
    try {
      const currentMedications = await dbService.getMedications(profile.id);
      const med = currentMedications.find(m => m.id === medicationId);
      if (!med || !med.trackingEnabled) return;

      const nextStock = Math.max(0, parseFloat(((med.currentStock ?? 0) + diff).toFixed(2)));
      const updatedMed: Medication = {
        ...med,
        currentStock: nextStock
      };

      await dbService.saveMedication(updatedMed);
      setMedications(prev => prev.map(m => m.id === medicationId ? updatedMed : m));

      if (nextStock <= (med.lowStockThreshold ?? 10) && diff < 0) {
        const alertId = `notif-stock-${medicationId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const stockNotification = {
          id: alertId,
          profileId: profile.id,
          title: `Niski zapas leku: ${med.name}`,
          message: `Kończy się opakowanie! Pozostało tylko ${nextStock} ${med.unit || 'szt.'}. Plan zakłada zapotrzebowanie na kolejne dni.`,
          type: 'warning' as const,
          createdAt: new Date().toISOString(),
          read: false
        };
        await dbService.saveNotification(stockNotification);
        onShowToast(`Niski zapas leku: ${med.name}! Zostało ${nextStock} ${med.unit || 'szt.'}`, 'error');
      }
    } catch (err) {
      // ignore
    }
  };

  const toggleDoseCheck = async (dose: Dose) => {
    try {
      const updated: Dose = {
        ...dose,
        taken: !dose.taken,
        takenAt: !dose.taken ? new Date().toISOString() : undefined
      };

      // Pessimistic render state update
      setDoses(prev => prev.map(d => d.id === dose.id ? updated : d));
      
      await dbService.saveDose(updated);
      
      const amount = parseDosageAmount(dose.dosage);
      await modifyMedicationStock(dose.medicationId, updated.taken ? -amount : amount);

      onShowToast(
        updated.taken 
          ? `Przyjęto dawkę leku ${dose.medicationName}` 
          : `Cofnięto przyjęcie leku ${dose.medicationName}`, 
        'success'
      );
      onDataChanged();
    } catch {
      onShowToast('Wystąpił błąd synchronizacji dawkowania.', 'error');
      loadData(true); // Revert state silently from live db
    }
  };

  const takeAllForSlot = async (slot: TimeOfDayKey) => {
    try {
      const targetDoses = doses.filter(d => d.timeOfDay === slot && !d.taken);
      if (targetDoses.length === 0) {
        onShowToast('Wszystkie dawki z tej porze dnia już zostały przyjęte.', 'info');
        return;
      }

      // Update state immediately
      const updatedDoses = doses.map(d => {
        if (d.timeOfDay === slot && !d.taken) {
          return { ...d, taken: true, takenAt: new Date().toISOString() };
        }
        return d;
      });
      setDoses(updatedDoses);

      for (const d of targetDoses) {
        await dbService.saveDose({
          ...d,
          taken: true,
          takenAt: new Date().toISOString()
        });
        const amount = parseDosageAmount(d.dosage);
        await modifyMedicationStock(d.medicationId, -amount);
      }

      onShowToast(`Zaimportowano przyjęcie wszystkich leków dla poru: ${slot.toUpperCase()}`, 'success');
      onDataChanged();
    } catch {
      onShowToast('Nie udało się zapisać partii dawek.', 'error');
      loadData(true);
    }
  };

  const handleCreateMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName.trim()) {
      onShowToast('Wprowadź nazwę leku.', 'error');
      return;
    }

    const timesToSubmit: MedicationTime[] = [];
    (Object.keys(slots) as Array<keyof typeof slots>).forEach((key) => {
      const val = slots[key];
      if (val.selected) {
        timesToSubmit.push({
          timeKey: key as TimeOfDayKey,
          active: true,
          dosage: `${val.amount} ${val.dosage}`
        });
      }
    });

    if (timesToSubmit.length === 0) {
      onShowToast('Wybierz co najmniej jedną porę dnia do dawkowania.', 'error');
      return;
    }

    try {
      dbService.setSyncState('syncing');
      const newMedId = `med-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newMed: Medication = {
        id: newMedId,
        profileId: profile.id,
        name: medName.trim(),
        frequency,
        days: frequency === 'custom' ? customDays : [],
        times: timesToSubmit,
        durationDays: Number(durationDays) || 30,
        createdAt: new Date().toISOString(),
        trackingEnabled: stockTracking,
        initialStock: stockTracking ? Number(initialStock) || 0 : undefined,
        currentStock: stockTracking ? Number(currentStock) || 0 : undefined,
        lowStockThreshold: stockTracking ? Number(lowStockThreshold) || 0 : undefined,
        unit: stockTracking ? stockUnit : undefined
      };

      await dbService.saveMedication(newMed);

      // Generate matching doses for today so they instantly show up
      for (const t of timesToSubmit) {
        const newDose: Dose = {
          id: `dose-${newMedId}-${t.timeKey}-${todayStr}`,
          profileId: profile.id,
          medicationId: newMedId,
          medicationName: newMed.name,
          timeOfDay: t.timeKey,
          dosage: t.dosage,
          taken: false,
          date: todayStr
        };
        await dbService.saveDose(newDose);
      }

      onShowToast('Nowy lek został dodany do Twojego planu leczenia!', 'success');
      setIsFormOpen(false);
      setMedName('');
      setStockTracking(false);
      setInitialStock('30');
      setCurrentStock('30');
      setLowStockThreshold('10');
      setStockUnit('tabletka');
      setSlots({
        rano: { selected: true, amount: '1', dosage: 'tabletka' },
        poludnie: { selected: false, amount: '1', dosage: 'kapsułka' },
        wieczor: { selected: false, amount: '1', dosage: 'tabletka' }
      });
      loadData(true);
      onDataChanged();
    } catch {
      onShowToast('Błąd dodawania leku.', 'error');
    }
  };

  const toggleDayChip = (day: string) => {
    if (customDays.includes(day)) {
      setCustomDays(prev => prev.filter(d => d !== day));
    } else {
      setCustomDays(prev => [...prev, day]);
    }
  };

  // Calculations for health score & stats
  const totalDosesCount = doses.length;
  const completedDosesCount = doses.filter(d => d.taken).length;
  const progressRatio = totalDosesCount > 0 ? (completedDosesCount / totalDosesCount) * 100 : 0;
  const isDark = profile.preferences?.highContrastMode ?? false;

  // Render slots grouping helper
  const renderSlotGroup = (timeKey: TimeOfDayKey, label: string, hours: string, icon: React.ReactNode) => {
    const slotDoses = doses.filter(d => d.timeOfDay === timeKey);
    const allCompleted = slotDoses.length > 0 && slotDoses.every(d => d.taken);

    return (
      <section
        className={`p-5 rounded-2xl border transition-all duration-300 ${
          allCompleted 
            ? isDark
              ? 'bg-emerald-950/10 border-emerald-900/30'
              : 'bg-emerald-50/50 border-emerald-100/85 shadow-sm shadow-[#10b981]/5' 
            : isDark
              ? 'bg-stone-900 border-stone-800 shadow-md shadow-black/25'
              : 'bg-white border-gray-100 shadow-sm shadow-gray-100/50'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl h-9.5 w-9.5 flex items-center justify-center ${
              allCompleted 
                ? 'bg-emerald-100/80 text-emerald-800' 
                : isDark 
                  ? 'bg-stone-850 text-[#6cf8bb]' 
                  : 'bg-blue-50 text-[#00478d]'
            }`}>
              {icon}
            </div>
            <div>
              <h3 className={`font-sans font-bold leading-none ${isDark ? 'text-stone-100' : 'text-gray-900'}`}>
                {label}
              </h3>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">
                Godzina: {hours}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {slotDoses.length > 1 && !allCompleted && (
              <button
                type="button"
                onClick={() => takeAllForSlot(timeKey)}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDark 
                    ? 'text-[#6cf8bb] hover:bg-stone-850' 
                    : 'text-[#00478d] hover:bg-blue-50/50'
                }`}
              >
                Przyjmij wszystkie
              </button>
            )}
            {allCompleted && (
              <span className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg font-sans ${
                isDark ? 'text-[#6cf8bb] bg-[#6cf8bb]/10 font-bold' : 'text-emerald-700 bg-emerald-100/60'
              }`}>
                Zalecane przyjęte
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {slotDoses.map((dose) => (
            <div
              key={dose.id}
              onClick={() => toggleDoseCheck(dose)}
              className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                dose.taken 
                  ? isDark
                    ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300 shadow-inner'
                    : 'bg-emerald-100/20 border-emerald-100 text-emerald-950 shadow-inner' 
                  : isDark
                    ? 'bg-stone-850/60 border-transparent hover:border-stone-750 text-stone-200'
                    : 'bg-stone-50/60 border-transparent hover:border-gray-200 text-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  dose.taken 
                    ? 'bg-emerald-500/10 text-emerald-600' 
                    : isDark 
                      ? 'bg-stone-800 text-stone-400' 
                      : 'bg-gray-100 text-gray-400'
                }`}>
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <span className={`font-sans font-bold block ${
                    dose.taken 
                      ? 'line-through text-stone-400' 
                      : isDark 
                        ? 'text-stone-100' 
                        : 'text-gray-950'
                  }`}>
                    {dose.medicationName}
                  </span>
                  <span className="text-xs text-stone-400 leading-none block mt-0.5">
                    {dose.dosage}
                  </span>
                </div>
              </div>

              <div className="shrink-0 flex items-center h-10 w-10 justify-center">
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                  dose.taken 
                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-md' 
                    : isDark 
                      ? 'border-stone-700 bg-stone-880' 
                      : 'border-gray-300 bg-white group-hover:border-gray-400'
                }`}>
                  {dose.taken && <Check className="w-4.5 h-4.5 stroke-[3px]" />}
                </div>
              </div>
            </div>
          ))}

          {slotDoses.length === 0 && (
            <p className="text-center text-xs text-stone-400 py-4 font-sans">
              Brak zaleceń lekowych do przygotowania w tym czasie.
            </p>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className={`pb-32 min-h-screen transition-colors duration-200 ${isDark ? 'bg-stone-950 text-white' : ''}`}>
      {/* Overview Stat panel */}
      <div className={`p-5 text-white rounded-b-3xl shadow-lg mb-6 ${
        isDark 
          ? 'bg-stone-900 border-b border-stone-800 shadow-black/20' 
          : 'bg-gradient-to-br from-[#00478d] to-[#005eb8] shadow-blue-900/10'
      }`}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Cześć, {profile.name}</h2>
            <p className={`text-xs mt-1 ${isDark ? 'text-stone-300' : 'text-blue-105'}`}>Dziś jest idealny czas, by dbać o zdrowie.</p>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className={`h-10 px-4 rounded-xl hover:scale-103 active:scale-97 transition-all font-sans text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer ${
              isDark 
                ? 'bg-[#6cf8bb] text-stone-950' 
                : 'bg-[#6cf8bb] text-[#002113]'
            }`}
          >
            <Plus className={`w-4 h-4 ${isDark ? 'text-stone-950' : 'text-[#002113]'}`} />
            Nowy lek
          </button>
        </div>

        {/* Progress bar inside primary box */}
        <div className={`rounded-2xl p-4 border ${isDark ? 'bg-stone-850 border-stone-800' : 'bg-white/10 backdrop-blur-md border-white/5'}`}>
          <div className="flex justify-between items-end mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-stone-300' : 'text-blue-100'}`}>
              Twój dzisiejszy postęp
            </span>
            <span className={`text-lg font-bold font-mono ${isDark ? 'text-[#6cf8bb]' : 'text-white'}`}>
              {completedDosesCount} / {totalDosesCount}
            </span>
          </div>
          <div className={`w-full h-3 rounded-full overflow-hidden mb-1.5 ${isDark ? 'bg-stone-800' : 'bg-white/15'}`}>
            <div 
              className="bg-[#6cf8bb] h-full rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${progressRatio}%` }}
            />
          </div>
          <p className={`text-[10px] leading-none ${isDark ? 'text-stone-400' : 'text-blue-200'}`}>
            {progressRatio === 100 
              ? 'Wspaniale! Przyjąłeś wszystkie zalecane leki na dziś!' 
              : `Zrealizowałeś ${Math.round(progressRatio)}% planu na dziś.`}
          </p>
        </div>
      </div>

      <div className="px-5 space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-stone-450">
            <div className={`w-8 h-8 border-3 border-t-transparent rounded-full animate-spin ${isDark ? 'border-[#6cf8bb]' : 'border-[#00478d]'}`} />
            <p className="text-xs font-medium">Ładowanie planu leczenia...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {renderSlotGroup('rano', 'Rano', '07:00 - 11:00', <Sun className="w-5.5 h-5.5" />)}
            {renderSlotGroup('poludnie', 'Południe', '12:00 - 16:00', <CloudSun className="w-5.5 h-5.5" />)}
            {renderSlotGroup('wieczor', 'Wieczór', '17:00 - 23:00', <Moon className="w-5.5 h-5.5" />)}
          </div>
        )}
      </div>

      {/* MODAL SHEET FOR ADDING A NEW MEDICATION (Nowy lek) as requested by screenshots 3 & 5 */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 0 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 0, transition: { duration: 0.2 } }}
              className="w-full max-w-md bg-[#f7f9fb] rounded-3xl shadow-2xl flex flex-col max-h-[85vh] border border-white/50"
            >
              {/* Head */}
              <div className="px-6 pt-6 pb-4 shrink-0 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-950 font-sans">Zaprojektuj Nowy Lek</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Ustaw pory i dawkę leku by otrzymywać logowania.</p>
                </div>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-900 bg-white border border-gray-200 rounded-full transition-colors cursor-pointer shadow-sm"
                  aria-label="Zamknij"
                >
                  <span className="text-lg font-bold leading-none mb-0.5">&times;</span>
                </button>
              </div>

              {/* Body Form */}
              <form onSubmit={handleCreateMedication} className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar">
                
                {/* Medicine Name */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <label htmlFor="med_name" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    NAZWA LEKU
                  </label>
                  <input
                    id="med_name"
                    type="text"
                    required
                    placeholder="np. Paracetamol, Euthyrox, Insulina"
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    className="w-full h-11 px-3 bg-stone-50 border border-gray-200 hover:border-gray-300 focus:border-[#00478d] focus:ring-1 focus:ring-[#00478d] outline-none rounded-xl font-sans text-sm font-medium transition-all"
                  />
                </div>

                {/* Frequency Selector */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                    CZĘSTOTLIWOŚĆ
                  </label>
                  <div className="relative">
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as 'daily' | 'custom')}
                      className="w-full h-11 px-3 bg-stone-50 border border-gray-200 rounded-xl font-sans text-sm outline-none appearance-none cursor-pointer focus:border-[#00478d] focus:ring-1 focus:ring-[#00478d]"
                    >
                      <option value="daily">Codziennie</option>
                      <option value="custom">Wybrane dni tygodnia</option>
                    </select>
                  </div>

                  {frequency === 'custom' && (
                    <div className="space-y-1.5 mt-2 animate-fadeIn">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                        Wybierz dni tygodnia
                      </p>
                      <div className="flex flex-wrap gap-1.5 justify-between">
                        {daysOfWeekFull.map((day) => {
                          const isSelected = customDays.includes(day);
                          return (
                            <button
                              type="button"
                              key={day}
                              onClick={() => toggleDayChip(day)}
                              className={`w-11 h-11 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-[#00478d] text-white border-[#00478d]' 
                                  : 'bg-stone-50 border-gray-100 text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Slots with dosage and amounts, structured beautifully as requested by screenshot #5 */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    PORY DNIA I DAWKOWANIE
                  </label>

                  <div className="space-y-3.5">
                    {/* Morning slot */}
                    <div className="p-3 bg-stone-50/60 rounded-xl border border-transparent hover:border-gray-200 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-3 font-sans text-sm font-semibold select-none cursor-pointer text-gray-950">
                          <input
                            type="checkbox"
                            checked={slots.rano.selected}
                            onChange={(e) => setSlots(p => ({
                              ...p,
                              rano: { ...p.rano, selected: e.target.checked }
                            }))}
                            className="w-5 h-5 rounded border-gray-300 text-[#00478d] focus:ring-[#00478d]"
                          />
                          <Sun className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                          <span>Rano (07:00 - 11:00)</span>
                        </label>
                      </div>

                      {slots.rano.selected && (
                        <div className="flex gap-2 animate-fadeIn mt-2.5">
                          <input
                            type="text"
                            placeholder="Ilość"
                            value={slots.rano.amount}
                            onChange={(e) => setSlots(p => ({
                              ...p,
                              rano: { ...p.rano, amount: e.target.value }
                            }))}
                            className="w-16 h-9 px-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium outline-none"
                          />
                          <select
                            value={slots.rano.dosage}
                            onChange={(e) => setSlots(p => ({
                              ...p,
                              rano: { ...p.rano, dosage: e.target.value }
                            }))}
                            className="flex-1 h-9 px-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium outline-none appearance-none"
                          >
                            <option value="tabletka">tabletka</option>
                            <option value="tabletki">tabletki</option>
                            <option value="saszetka">saszetka</option>
                            <option value="saszetki">saszetki</option>
                            <option value="ml">ml</option>
                            <option value="g">g</option>
                            <option value="krople">krople</option>
                            <option value="IU">IU</option>
                            <option value="kapsułka">kapsułka</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Noon slot */}
                    <div className="p-3 bg-stone-50/60 rounded-xl border border-transparent hover:border-gray-200 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-3 font-sans text-sm font-semibold select-none cursor-pointer text-gray-950">
                          <input
                            type="checkbox"
                            checked={slots.poludnie.selected}
                            onChange={(e) => setSlots(p => ({
                              ...p,
                              poludnie: { ...p.poludnie, selected: e.target.checked }
                            }))}
                            className="w-5 h-5 rounded border-gray-300 text-[#00478d] focus:ring-[#00478d]"
                          />
                          <CloudSun className="w-4.5 h-4.5 text-blue-500 shrink-0" />
                          <span>Południe (12:00 - 16:00)</span>
                        </label>
                      </div>

                      {slots.poludnie.selected && (
                        <div className="flex gap-2 animate-fadeIn mt-2.5">
                          <input
                            type="text"
                            placeholder="Ilość"
                            value={slots.poludnie.amount}
                            onChange={(e) => setSlots(p => ({
                              ...p,
                              poludnie: { ...p.poludnie, amount: e.target.value }
                            }))}
                            className="w-16 h-9 px-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium outline-none"
                          />
                          <select
                            value={slots.poludnie.dosage}
                            onChange={(e) => setSlots(p => ({
                              ...p,
                              poludnie: { ...p.poludnie, dosage: e.target.value }
                            }))}
                            className="flex-1 h-9 px-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium outline-none appearance-none"
                          >
                            <option value="tabletka">tabletka</option>
                            <option value="tabletki">tabletki</option>
                            <option value="saszetka">saszetka</option>
                            <option value="saszetki">saszetki</option>
                            <option value="ml">ml</option>
                            <option value="g">g</option>
                            <option value="krople">krople</option>
                            <option value="IU">IU</option>
                            <option value="kapsułka">kapsułka</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Evening slot */}
                    <div className="p-3 bg-stone-50/60 rounded-xl border border-transparent hover:border-gray-200 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-3 font-sans text-sm font-semibold select-none cursor-pointer text-gray-950">
                          <input
                            type="checkbox"
                            checked={slots.wieczor.selected}
                            onChange={(e) => setSlots(p => ({
                              ...p,
                              wieczor: { ...p.wieczor, selected: e.target.checked }
                            }))}
                            className="w-5 h-5 rounded border-gray-300 text-[#00478d] focus:ring-[#00478d]"
                          />
                          <Moon className="w-4.5 h-4.5 text-[#00478d] shrink-0" />
                          <span>Wieczór (17:00 - 23:00)</span>
                        </label>
                      </div>

                      {slots.wieczor.selected && (
                        <div className="flex gap-2 animate-fadeIn mt-2.5">
                          <input
                            type="text"
                            placeholder="Ilość"
                            value={slots.wieczor.amount}
                            onChange={(e) => setSlots(p => ({
                              ...p,
                              wieczor: { ...p.wieczor, amount: e.target.value }
                            }))}
                            className="w-16 h-9 px-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium outline-none"
                          />
                          <select
                            value={slots.wieczor.dosage}
                            onChange={(e) => setSlots(p => ({
                              ...p,
                              wieczor: { ...p.wieczor, dosage: e.target.value }
                            }))}
                            className="flex-1 h-9 px-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium outline-none appearance-none"
                          >
                            <option value="tabletka">tabletka</option>
                            <option value="tabletki">tabletki</option>
                            <option value="saszetka">saszetka</option>
                            <option value="saszetki">saszetki</option>
                            <option value="ml">ml</option>
                            <option value="g">g</option>
                            <option value="krople">krople</option>
                            <option value="IU">IU</option>
                            <option value="kapsułka">kapsułka</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stage Plan details as seen in screenshot */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">
                      PLAN ETAPOWY (FAZOWY)
                    </label>
                    <button
                      type="button"
                      onClick={() => setStagePlanEnabled(!stagePlanEnabled)}
                      className={`text-[10px] font-bold px-2 py-1 rounded transition-colors uppercase ${
                        stagePlanEnabled ? 'bg-blue-100 text-[#00478d]' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {stagePlanEnabled ? 'Włączony' : 'Wyłączony'}
                    </button>
                  </div>

                  {stagePlanEnabled && (
                    <div className="p-3 border border-dashed border-gray-200 rounded-xl space-y-3 bg-stone-50/50 animate-fadeIn text-xs">
                      <div className="flex justify-between items-center text-xs font-bold text-[#00478d]">
                        <span>ETAP 1 (Pierwsza faza planu)</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Faza (np. Tydzień 1)"
                          value={stageName}
                          onChange={(e) => setStageName(e.target.value)}
                          className="flex-1 h-9 px-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:border-[#00478d]"
                        />
                        <input
                          type="number"
                          placeholder="Dni"
                          value={stageDays}
                          onChange={(e) => setStageDays(e.target.value)}
                          className="w-20 h-9 px-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:border-[#00478d]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Stock Tracking Configuration section */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">
                        MONITOROWANIE STANU ZAPASU
                      </label>
                      <span className="text-[10px] text-gray-405 mt-1 block">Ostrzeż mnie o konieczności zakupu</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStockTracking(!stockTracking)}
                      className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors uppercase cursor-pointer ${
                        stockTracking ? 'bg-blue-100 text-[#00478d]' : 'bg-gray-100 text-gray-405'
                      }`}
                    >
                      {stockTracking ? 'Włączone' : 'Wyłączone'}
                    </button>
                  </div>

                  {stockTracking && (
                    <div className="space-y-3.5 pt-1.5 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">Rozmiar opakowania</label>
                          <input
                            type="number"
                            required
                            value={initialStock}
                            onChange={(e) => {
                              setInitialStock(e.target.value);
                              setCurrentStock(e.target.value); // set current stock equal by default initially
                            }}
                            className="w-full h-9 px-2.5 bg-stone-50 border border-gray-200 rounded-lg text-xs font-bold focus:border-[#00478d]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase text-right">Jednostka</label>
                          <select
                            value={stockUnit}
                            onChange={(e) => setStockUnit(e.target.value)}
                            className="w-full h-9 px-1.5 bg-stone-50 border border-gray-200 rounded-lg text-xs font-semibold focus:border-[#00478d]"
                          >
                            <option value="tabletka">Tabletki (tabl.)</option>
                            <option value="kapsułka">Kapsułki (kaps.)</option>
                            <option value="ml">Mililitry (ml)</option>
                            <option value="sztuk">Sztuki (szt.)</option>
                            <option value="krople">Krople</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">Aktualny stan zapasu</label>
                          <input
                            type="number"
                            required
                            value={currentStock}
                            onChange={(e) => setCurrentStock(e.target.value)}
                            className="w-full h-9 px-2.5 bg-stone-50 border border-gray-200 rounded-lg text-xs font-bold focus:border-[#00478d]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase">Próg niskiego zapasu</label>
                          <input
                            type="number"
                            required
                            value={lowStockThreshold}
                            onChange={(e) => setLowStockThreshold(e.target.value)}
                            className="w-full h-9 px-2.5 bg-stone-50 border border-gray-200 rounded-lg text-xs font-bold focus:border-[#00478d]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Active Medication Duration */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    CZAS TRWANIA CAŁEGO PLANU
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="number"
                      value={durationDays}
                      onChange={(e) => setDurationDays(e.target.value)}
                      className="w-24 h-11 px-3 bg-stone-50 border border-gray-200 rounded-xl focus:border-[#00478d] outline-none text-sm font-semibold"
                    />
                    <span className="font-sans text-sm font-semibold text-gray-650">dni kuracji lekiem</span>
                  </div>
                </div>

                {/* Create submit */}
                <div className="pt-3 block pb-[env(safe-area-inset-bottom,20px)]">
                  <button
                    type="submit"
                    className="w-full h-13 bg-[#00478d] hover:bg-[#005eb8] text-white font-sans text-sm font-semibold rounded-2xl shadow-lg flex items-center justify-center gap-2 group cursor-pointer transition-colors"
                  >
                    <Save className="w-5 h-5 text-white" />
                    Zapisz plan dawkowania
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
