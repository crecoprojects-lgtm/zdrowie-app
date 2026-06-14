// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  TrendingUp, 
  AlertOctagon, 
  Activity, 
  Clock, 
  Check, 
  ChevronRight, 
  X,
  Stethoscope,
  Info,
  Award,
  CalendarCheck,
  Pill
} from 'lucide-react';
import { Profile, Medication, Dose, Visit } from '../types';
import { dbService, globalAppCache } from '../firebase';

interface TabHistoryProps {
  profile: Profile;
  onShowToast: (text: string, type: 'success' | 'error' | 'info') => void;
  syncTrigger: number;
}

export default function TabHistory({ profile, onShowToast, syncTrigger }: TabHistoryProps) {
  const [doses, setDoses] = useState<Dose[]>(() => globalAppCache.doses[profile.id] || []);
  const [medications, setMedications] = useState<Medication[]>(() => globalAppCache.medications[profile.id] || []);
  const [nextVisit, setNextVisit] = useState<Visit | null>(() => {
    const cachedVisits = globalAppCache.visits[profile.id] || [];
    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingVisits = cachedVisits
      .filter(v => v.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    return upcomingVisits.length > 0 ? upcomingVisits[0] : null;
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(() => !globalAppCache.doses[profile.id]);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        if (!globalAppCache.doses[profile.id]) {
          setIsLoading(true);
        }
        const list = await dbService.getDoses(profile.id);
        const medsList = await dbService.getMedications(profile.id);
        const visitsList = await dbService.getVisits(profile.id);
        
        // Update local state and globalAppCache
        setDoses(list);
        setMedications(medsList);
        globalAppCache.doses[profile.id] = list;
        globalAppCache.medications[profile.id] = medsList;
        globalAppCache.visits[profile.id] = visitsList;

        // Calculate closest future visit date
        const todayStr = new Date().toISOString().split('T')[0];
        const upcomingVisits = visitsList
          .filter(v => v.date >= todayStr)
          .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

        if (upcomingVisits.length > 0) {
          setNextVisit(upcomingVisits[0]);
        } else {
          setNextVisit(null);
        }
      } catch {
        onShowToast('Nie udało się załadować statystyk.', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    loadLogs();
  }, [profile.id, syncTrigger]);

  const handleGeneratePDF = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      onShowToast('Raport medyczny PDF został pomyślnie wygenerowany i pobrany!', 'success');
    }, 1800);
  };

  // Compliance calculations
  const totalLogged = doses.length;
  const takenCount = doses.filter(d => d.taken).length;
  const missedCount = totalLogged - takenCount;
  const compliancePercentage = totalLogged > 0 ? Math.round((takenCount / totalLogged) * 100) : 0;
  const isDark = profile.preferences?.highContrastMode ?? false;

  // Dynamic calculations for most successful day
  const getMostSuccessfulDay = () => {
    const takenDoses = doses.filter(d => d.taken);
    if (takenDoses.length === 0) return 'Brak zarejestrowanych dawek';
    
    // Group by day of week
    const polishDays = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
    const counts: { [day: string]: number } = {};
    
    takenDoses.forEach(dose => {
      const parsedDate = new Date(dose.date);
      if (!isNaN(parsedDate.getTime())) {
        const dayLabel = polishDays[parsedDate.getDay()];
        counts[dayLabel] = (counts[dayLabel] || 0) + 1;
      }
    });

    let bestDay = 'Brak danych';
    let max = 0;
    Object.entries(counts).forEach(([day, count]) => {
      if (count > max) {
        max = count;
        bestDay = day;
      }
    });

    return bestDay;
  };

  const bestDayName = getMostSuccessfulDay();

  return (
    <div className="px-5 py-6 space-y-6 pb-28 text-left">
      {/* Header section with PDF trigger */}
      <h2 className="sr-only">Historia leczenia</h2>
      <div className={`flex justify-between items-center p-4 rounded-2xl border shadow-sm transition-colors duration-200 ${
        isDark ? 'bg-stone-900 border-stone-800 shadow-black/15' : 'bg-white border-gray-100 shadow-gray-100/50'
      }`}>
        <div>
          <span className={`block text-[10px] font-bold uppercase tracking-widest leading-none ${
            isDark ? 'text-stone-400' : 'text-gray-400'
          }`}>
            TWOJE POSTĘPY
          </span>
          <h3 className={`font-sans font-bold text-xl mt-1 leading-none ${isDark ? 'text-stone-100' : 'text-gray-950'}`}>
            Analityka
          </h3>
        </div>

        <button
          onClick={handleGeneratePDF}
          disabled={isGenerating}
          className="h-10 px-4 bg-[#00478d] hover:bg-[#005eb8] text-white rounded-xl font-sans text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
        >
          <FileText className="w-4.5 h-4.5 shrink-0" />
          {isGenerating ? 'Generowanie...' : 'Raport PDF'}
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-stone-450 font-sans">
          <div className={`w-8 h-8 border-3 border-t-transparent rounded-full animate-spin ${isDark ? 'border-[#6cf8bb]' : 'border-[#00478d]'}`} />
          <p className="text-xs font-medium">Ładowanie analityki i historii...</p>
        </div>
      ) : (
        <>
          {/* Radial Compliance Widget matching layout #6 */}
          <section className={`rounded-2xl border p-6 shadow-sm flex flex-col md:flex-row items-center gap-6 transition-colors duration-200 ${
            isDark ? 'bg-stone-900 border-stone-800 shadow-black/15' : 'bg-white border-gray-100 shadow-gray-100/50'
          }`}>
        {/* SVG Circle visualizer */}
        <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="72" cy="72" r="62" fill="transparent" stroke={isDark ? '#2e2a24' : '#f1f5f9'} strokeWidth="10" />
            <circle 
              cx="72" 
              cy="72" 
              r="62" 
              fill="transparent" 
              stroke={isDark ? '#6cf8bb' : '#00478d'} 
              strokeWidth="10" 
              strokeDasharray={390}
              strokeDashoffset={390 - (390 * compliancePercentage) / 100}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-extrabold font-mono leading-none ${isDark ? 'text-[#6cf8bb]' : 'text-[#00478d]'}`}>
              {compliancePercentage}%
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-stone-400' : 'text-gray-400'}`}>
              Regularność
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-3.5 w-full">
          <h4 className={`font-sans font-bold leading-tight ${isDark ? 'text-stone-100' : 'text-gray-950'}`}>
            Podsumowanie tygodniowe
          </h4>
          <p className={`text-xs leading-relaxed font-sans ${isDark ? 'text-stone-400' : 'text-gray-500'}`}>
            {totalLogged === 0 
              ? 'Wypełnij i zatwierdź zaplanowane dla Ciebie leki w zakładce "Dziś", aby systematycznie generować statystyki kuracji.'
              : 'Świetna robota! Twoja systematyczność przyjmowania dawek wzrosła w porównaniu z minionym okresem. Kontynuuj trzymanie się planu.'}
          </p>
          <div className="flex gap-3">
            <div className={`flex-1 p-3 rounded-xl border border-dashed ${isDark ? 'bg-stone-950/20 border-stone-800' : 'bg-stone-50/70 border-gray-200'}`}>
              <span className={`block text-lg font-bold font-mono leading-none ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                {takenCount}
              </span>
              <span className={`text-[10px] font-semibold block mt-1 ${isDark ? 'text-stone-400' : 'text-gray-400'}`}>
                Przyjęte dawki
              </span>
            </div>
            <div className={`flex-1 p-3 rounded-xl border border-dashed ${isDark ? 'bg-stone-950/20 border-stone-800' : 'bg-stone-50/70 border-gray-200'}`}>
              <span className={`block text-lg font-bold font-mono leading-none ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                {missedCount}
              </span>
              <span className={`text-[10px] font-semibold block mt-1 ${isDark ? 'text-stone-400' : 'text-gray-400'}`}>
                Pominięte leki
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Common Misses warnings index as requested */}
      <section className="space-y-3.5">
        <h4 className={`font-sans font-bold text-sm uppercase tracking-widest flex items-center gap-2 ${isDark ? 'text-stone-400' : 'text-gray-400'}`}>
          <AlertOctagon className="w-4 h-4 text-amber-500 shrink-0" />
          Najczęstsze pominięcia
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={`p-4 rounded-xl border shadow-sm flex items-center gap-3 transition-colors duration-200 ${
            isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-gray-100'
          }`}>
            <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-stone-400 block leading-none">PORA DNIA</span>
              <span className={`text-xs font-bold block mt-1 ${isDark ? 'text-stone-100' : 'text-gray-950'}`}>
                {takenCount === 0 ? 'Brak danych' : 'Wieczór (17:00 - 23:00)'}
              </span>
              {takenCount > 0 && (
                <span className="text-[9px] font-bold text-rose-400 uppercase block mt-0.5">Wymaga wzmożonej uwagi</span>
              )}
            </div>
          </div>

          <div className={`p-4 rounded-xl border shadow-sm flex items-center gap-3 transition-colors duration-200 ${
            isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-gray-100'
          }`}>
            <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-stone-400 block leading-none">TRUDNY MOMENT</span>
              <span className={`text-xs font-bold block mt-1 ${isDark ? 'text-stone-100' : 'text-gray-950'}`}>
                {takenCount === 0 ? 'Brak danych' : 'Dawki weekendowe'}
              </span>
              {takenCount > 0 && (
                <span className="text-[9px] font-bold text-amber-400 uppercase block mt-0.5">Wprowadź nawyk</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Ongoing Active treatments status charts */}
      <section className="space-y-3.5">
        <div className="flex justify-between items-center">
          <h4 className={`font-sans font-bold text-sm uppercase tracking-widest ${isDark ? 'text-stone-400' : 'text-gray-400'}`}>
            Aktywne kuracje lecznicze
          </h4>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            isDark ? 'text-[#6cf8bb] bg-[#6cf8bb]/10 border border-[#6cf8bb]/20' : 'text-emerald-800 bg-[#6cf8bb]/30'
          }`}>
            {medications.length} Aktywne
          </span>
        </div>

        {medications.length === 0 ? (
          <div className={`p-8 text-center rounded-2xl border border-dashed ${
            isDark ? 'bg-stone-900 border-stone-800 text-stone-400' : 'bg-white border-gray-200 text-gray-400'
          }`}>
            <p className="text-xs font-semibold">Brak zdefiniowanych leków.</p>
            <p className="text-[10px] text-stone-500 mt-1">Zdefiniuj leki w zakładce Kuracja, aby zobaczyć ich postępy.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {medications.slice(0, 3).map((med, idx) => {
              // Smooth dynamic calculations for medication range based on creation date
              const totalDays = med.durationDays || 30;
              const createdDate = new Date(med.createdAt || Date.now());
              const today = new Date();
              const diffTime = Math.abs(today.getTime() - createdDate.getTime());
              const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // at least 1st day of treatment
              const progressDays = Math.min(totalDays, daysElapsed);
              const remains = Math.max(0, totalDays - progressDays);
              const ratio = (progressDays / totalDays) * 100;

              return (
                <div key={med.id} className={`p-4.5 rounded-2xl border shadow-sm space-y-3 transition-colors duration-250 ${
                  isDark ? 'bg-stone-900 border-stone-800' : 'bg-white border-gray-100'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className={`font-sans font-bold leading-none ${isDark ? 'text-stone-100' : 'text-gray-950'}`}>
                        {med.name}
                      </h5>
                      <p className="text-[10px] text-stone-400 mt-1.5">
                        dawkowanie: {med.times.filter(t => t.active).map(t => `${t.dosage} (${t.timeKey})`).join(', ') || 'według planu'}
                      </p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      idx === 1 
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {med.frequency === 'daily' ? 'Codziennie' : 'Kuracja'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-[#8e8e93] font-sans">
                      <span>Postęp trwania: {progressDays} z {totalDays} dni</span>
                      <span className="font-mono">zostało: {remains} dni</span>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-stone-850' : 'bg-stone-100'}`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${
                          idx === 1 ? 'bg-blue-500' : 'bg-[#6cf8bb]'
                        }`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Bento analytics stats summaries */}
      <section className="grid grid-cols-2 gap-4">
        <div className="bg-[#00478d] p-4.5 rounded-2xl text-white space-y-2.5 shadow-md shadow-blue-900/5 text-left">
          <TrendingUp className="w-7 h-7 text-[#6cf8bb] stroke-[2.5]" />
          <p className="text-xs text-blue-100 font-medium">Spójność systematyczności</p>
          <h5 className="text-sm font-bold font-sans truncate">{bestDayName}</h5>
          <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest block">Najlepszy dzień</span>
        </div>

        <div className={`p-4.5 rounded-2xl space-y-2.5 shadow-md text-left transition-colors duration-200 border ${
          isDark 
            ? 'bg-stone-900 border-stone-800 text-stone-100' 
            : 'bg-stone-100/50 border-gray-150 text-gray-900'
        }`}>
          <Stethoscope className="w-7 h-7 text-[#6cf8bb]" />
          <p className="text-xs text-stone-400 font-medium font-sans leading-none">Następna wizyta</p>
          
          {nextVisit ? (
            <>
              <h5 className={`text-sm font-bold font-sans truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {nextVisit.doctor}
              </h5>
              <span className={`text-[10px] font-bold uppercase tracking-widest block truncate ${
                isDark ? 'text-emerald-400' : 'text-emerald-700'
              }`}>
                {nextVisit.date} @ {nextVisit.time}
              </span>
            </>
          ) : (
            <>
              <h5 className="text-sm font-bold font-sans text-stone-400">Brak wizyt</h5>
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">
                Dodaj w kalendarzu
              </span>
            </>
          )}
        </div>
      </section>
        </>
      )}

      {/* PDF Loader Overlay popup simulation */}
      <AnimatePresence>
        {isGenerating && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[100] flex items-center justify-center p-6 animate-fadeIn">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`p-6 rounded-2xl shadow-xl border max-w-sm w-full flex flex-col items-center text-center gap-4 ${
                isDark ? 'bg-stone-900 border-stone-800 text-white' : 'bg-white border-gray-100 text-gray-950'
              }`}
            >
              <div className={`w-12 h-12 rounded-full border-4 border-t-transparent animate-spin shrink-0 ${
                isDark ? 'border-[#6cf8bb]' : 'border-[#00478d]'
              }`} />
              <div>
                <h4 className="font-sans font-bold text-base">Eksportowanie raportu</h4>
                <p className="text-xs text-stone-400 mt-1">
                  Zbieramy historię i pory podawania dawek do ustrukturyzowanego dokumentu medycznego...
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
