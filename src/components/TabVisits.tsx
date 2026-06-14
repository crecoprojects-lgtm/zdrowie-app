// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Stethoscope, 
  Clock, 
  Building, 
  Plus, 
  AlertCircle, 
  Search, 
  Trash2, 
  Clipboard,
  CalendarCheck,
  ChevronRight,
  ShieldEllipsis
} from 'lucide-react';
import { Profile, Visit } from '../types';
import { dbService, globalAppCache } from '../firebase';

interface TabVisitsProps {
  profile: Profile;
  onShowToast: (text: string, type: 'success' | 'error' | 'info') => void;
  syncTrigger: number;
}

export default function TabVisits({ profile, onShowToast, syncTrigger }: TabVisitsProps) {
  const [visits, setVisits] = useState<Visit[]>(() => globalAppCache.visits[profile.id] || []);
  const [filter, setFilter] = useState<'all' | 'labs' | 'consults'>('all');
  const [isLoading, setIsLoading] = useState(() => !globalAppCache.visits[profile.id]);

  // Sync memory cache automatically
  useEffect(() => {
    if (profile.id) {
      globalAppCache.visits[profile.id] = visits;
    }
  }, [visits, profile.id]);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [doctor, setDoctor] = useState('');
  const [clinic, setClinic] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');

  const loadVisits = async () => {
    try {
      if (!globalAppCache.visits[profile.id]) {
        setIsLoading(true);
      }
      const list = await dbService.getVisits(profile.id);
      setVisits(list);
    } catch {
      onShowToast('Nie udało się wczytać listy wizyt.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVisits();
  }, [profile.id, syncTrigger]);

  // Block body scroll when modal is open
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !doctor.trim() || !clinic.trim() || !date || !time) {
      onShowToast('Uzupełnij wszystkie pola oznaczone gwiazdką.', 'error');
      return;
    }

    try {
      dbService.setSyncState('syncing');
      const newVisit: Visit = {
        id: `visit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        profileId: profile.id,
        title: title.trim(),
        doctor: doctor.trim(),
        clinic: clinic.trim(),
        date,
        time,
        notes: notes.trim() || undefined
      };

      await dbService.saveVisit(newVisit);
      onShowToast('Wizyta lekarska została pomyślnie dodana!', 'success');
      setIsFormOpen(false);
      
      // Reset inputs
      setTitle('');
      setDoctor('');
      setClinic('');
      setDate('');
      setTime('');
      setNotes('');
      
      loadVisits();
    } catch {
      onShowToast('Wystąpił błąd zapisu wizyty.', 'error');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await dbService.deleteVisit(profile.id, id);
      onShowToast('Wizyta została odwołana i usunięta z widoku.', 'info');
      loadVisits();
    } catch {
      onShowToast('Błąd usuwania wizyty.', 'error');
    }
  };

  // Sort visits chronologically
  const sortedVisits = [...visits].sort((a, b) => {
    const dateTimeA = `${a.date}T${a.time}`;
    const dateTimeB = `${b.date}T${b.time}`;
    return dateTimeA.localeCompare(dateTimeB);
  });

  // Filter clinical vs diagnostic lab events
  const filteredVisits = sortedVisits.filter(v => {
    if (filter === 'labs') {
      return v.title.toLowerCase().includes('morfologia') || 
             v.title.toLowerCase().includes('lab') || 
             v.title.toLowerCase().includes('rtg') || 
             v.doctor.toLowerCase().includes('laboratorium');
    }
    if (filter === 'consults') {
      return !v.title.toLowerCase().includes('morfologia') && 
             !v.title.toLowerCase().includes('lab') && 
             !v.title.toLowerCase().includes('rtg') && 
             !v.doctor.toLowerCase().includes('laboratorium');
    }
    return true;
  });

  // Highlight of reminder tip note matching exactly screenshot #4
  const fastDrawingLab = visits.find(v => v.title.toLowerCase().includes('morfologia') || v.notes?.toLowerCase().includes('czczo'));

  return (
    <div className="px-5 py-6 space-y-6 pb-28">
      {/* Nadchodzące wydarzenia list header */}
      <div className="flex flex-col gap-1">
        <h2 className="sr-only">Wizyty i Badania</h2>
        <h3 className="font-sans font-extrabold text-2xl text-gray-950 tracking-tight">Nadchodzące wydarzenia</h3>
        <p className="text-xs text-stone-400 font-medium">
          Masz {sortedVisits.length} zaplanowane aktywności w tym miesiącu.
        </p>
      </div>

      <button
        onClick={() => setIsFormOpen(true)}
        className="w-full h-12 bg-[#00478d] hover:bg-[#005eb8] text-white font-sans text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        <Plus className="w-4.5 h-4.5" />
        DODAJ NOWĄ WIZYTĘ
      </button>

      {/* Main upcoming highlight card matching layout #4 */}
      {sortedVisits.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm shadow-gray-100/50 space-y-4">
          <div className="flex justify-between items-center">
            <div className="w-10 h-10 bg-blue-50 text-[#00478d] rounded-xl flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5.5 h-5.5" />
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 text-emerald-800 bg-[#6cf8bb]/30 rounded-full font-sans tracking-wider uppercase">
              Najbliższa
            </span>
          </div>

          <div className="space-y-1">
            <h4 className="font-sans font-bold text-lg text-gray-950 leading-none">
              {sortedVisits[0].title}
            </h4>
            <p className="text-sm font-medium text-gray-600 mt-2">
              {sortedVisits[0].doctor} • {sortedVisits[0].clinic}
            </p>
          </div>

          <div className="pt-2 border-t border-dashed border-gray-100 flex items-center gap-2 text-xs font-bold text-gray-500 font-sans">
            <Clock className="w-4 h-4 text-[#00478d]" />
            <span>Zaplanowana: {sortedVisits[0].date} o {sortedVisits[0].time}</span>
          </div>
        </div>
      )}

      {/* Structured "PAMIĘTAJ" stick note as seen in screenshot #4 */}
      {fastDrawingLab && (
        <div className="bg-amber-50/70 border border-amber-200/50 rounded-2xl p-4 flex gap-3 text-amber-900 shadow-sm shadow-amber-50/20">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="text-xs font-bold uppercase tracking-wider text-amber-800 leading-none">PAMIĘTAJ</h5>
            <p className="text-xs font-medium leading-relaxed font-sans mt-0.5">
              {fastDrawingLab.notes || 'Przyjdź na badanie naczczo, zachowując min. 8 godzin przerw od posiłków.'}
            </p>
          </div>
        </div>
      )}

      {/* Tabs list categorizers */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            filter === 'all' 
              ? 'bg-[#00478d] text-white border-[#00478d] shadow-sm shadow-blue-900/5' 
              : 'bg-white border-gray-100 text-gray-500 hover:bg-neutral-50'
          }`}
        >
          Wszystkie
        </button>
        <button
          onClick={() => setFilter('labs')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            filter === 'labs' 
              ? 'bg-[#00478d] text-white border-[#00478d] shadow-sm shadow-blue-900/5' 
              : 'bg-white border-gray-100 text-gray-500 hover:bg-neutral-50'
          }`}
        >
          Badania
        </button>
        <button
          onClick={() => setFilter('consults')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            filter === 'consults' 
              ? 'bg-[#00478d] text-white border-[#00478d] shadow-sm shadow-blue-900/5' 
              : 'bg-white border-gray-100 text-gray-500 hover:bg-neutral-50'
          }`}
        >
          Konsultacje
        </button>
      </div>

      {/* Connected timelines list */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-6 text-gray-400">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Ładowanie terminów...</p>
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="text-center py-10 bg-white border border-gray-100 rounded-2xl">
            <Clipboard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Brak zaplanowanych aktywności medycznych w tej grupie.</p>
          </div>
        ) : (
          <div className="relative border-l border-gray-200/90 pl-4.5 ml-3 space-y-5 py-1">
            {filteredVisits.map((visit) => {
              const isLab = visit.title.toLowerCase().includes('morfologia') || 
                            visit.title.toLowerCase().includes('diag') || 
                            visit.doctor.toLowerCase().includes('laboratorium');
              
              return (
                <div key={visit.id} className="relative group">
                  {/* Visual bullet on Timeline */}
                  <div className={`absolute -left-[24px] top-4.5 w-3 h-3 rounded-full border-2 border-white shadow-sm shrink-0 ${
                    isLab ? 'bg-[#6cf8bb]' : 'bg-[#00478d]'
                  }`} />

                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center hover:border-blue-100 transition-all">
                    <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-gray-450 uppercase font-mono tracking-wider">
                          {isLab ? 'BADANIE LAB' : 'KONSULTACJA'}
                        </span>
                        {visit.notes && (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded uppercase tracking-wide">
                            Zalecenia
                          </span>
                        )}
                      </div>
                      <h4 className="font-sans font-bold text-sm text-gray-900 truncate">
                        {visit.title}
                      </h4>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5" />
                        <span className="truncate">{visit.doctor} • {visit.clinic}</span>
                      </p>
                      <p className="text-xs font-semibold text-gray-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{visit.date} o {visit.time}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(visit.id, e)}
                      className="p-2 text-stone-400 hover:text-red-500 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer"
                      title="Odwołaj wizytę"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Styled grey clinical background widget at the bottom */}
      <div className="relative overflow-hidden rounded-2xl h-36 bg-gradient-to-r from-stone-850 to-stone-900 p-5 text-white flex flex-col justify-end">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=600')] bg-cover bg-center opacity-30 mix-blend-overlay" />
        <div className="relative z-10 space-y-1">
          <h4 className="font-sans font-bold text-base text-stone-50 leading-none">Przejrzyj historię</h4>
          <p className="text-xs text-stone-300">Zintegrowany dostęp do wyników i zaleceń laboratoryjnych z ostatnich 2 lat.</p>
        </div>
      </div>

      {/* INLINE POPUP SHEET MODAL FOR SCHEDULE VISIT */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[60] overflow-hidden flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 pb-28">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 0 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 0, transition: { duration: 0.2 } }}
              className="w-full max-w-md bg-[#f7f9fb] rounded-3xl border border-white/50 shadow-2xl flex flex-col max-h-[85vh]"
            >

              <div className="px-6 pt-6 pb-4 shrink-0 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-950 font-sans">Zaplanuj Lekarza / Lab</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Dodaj plan dzwonienia, by zapamiętać przygotowanie.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-900 bg-white border border-gray-200 rounded-full transition-colors cursor-pointer shadow-sm"
                  aria-label="Zamknij"
                >
                  <span className="text-lg font-bold leading-none mb-0.5">&times;</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar">
                
                {/* Title */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <label htmlFor="visit_title" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    REASON / BADANIE *
                  </label>
                  <input
                    id="visit_title"
                    type="text"
                    required
                    placeholder="np. Konsultacja lekarska, Morfologia rano"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-11 px-3 bg-stone-50 border border-gray-200 hover:border-gray-300 focus:border-[#00478d] focus:ring-1 focus:ring-[#00478d] outline-none rounded-xl font-sans text-sm font-medium transition-all"
                  />
                </div>

                {/* Doctor */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <label htmlFor="visit_doctor" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    LEKARZ / SPECJALISTA *
                  </label>
                  <input
                    id="visit_doctor"
                    type="text"
                    required
                    placeholder="np. Dr Adam Nowak, Laborant POZ"
                    value={doctor}
                    onChange={(e) => setDoctor(e.target.value)}
                    className="w-full h-11 px-3 bg-stone-50 border border-gray-200 hover:border-gray-300 focus:border-[#00478d] focus:ring-1 focus:ring-[#00478d] outline-none rounded-xl font-sans text-sm font-medium transition-all"
                  />
                </div>

                {/* Clinic */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <label htmlFor="visit_clinic" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    PLACÓWKA MEDYCZNA *
                  </label>
                  <input
                    id="visit_clinic"
                    type="text"
                    required
                    placeholder="np. LuxMed Centrum, Diagnostyka, Szpital"
                    value={clinic}
                    onChange={(e) => setClinic(e.target.value)}
                    className="w-full h-11 px-3 bg-stone-50 border border-gray-200 hover:border-gray-300 focus:border-[#00478d] focus:ring-1 focus:ring-[#00478d] outline-none rounded-xl font-sans text-sm font-medium transition-all"
                  />
                </div>

                {/* Date & Time */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      DATA *
                    </label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full h-11 px-3 bg-stone-50 border border-gray-200 hover:border-gray-300 focus:border-[#00478d] outline-none rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      GODZINA *
                    </label>
                    <input
                      type="time"
                      required
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full h-11 px-3 bg-stone-50 border border-gray-200 hover:border-gray-300 focus:border-[#00478d] outline-none rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Notes/Preparation guides */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <label htmlFor="visit_notes" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    ZALECENIA / PRZYGOTOWANIE
                  </label>
                  <textarea
                    id="visit_notes"
                    placeholder="np. Przyjdź na czczo, Ostatni posiłek o 20:00"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full p-3 bg-stone-50 border border-gray-200 hover:border-gray-300 focus:border-[#00478d] focus:ring-1 focus:ring-[#00478d] outline-none rounded-xl font-sans text-xs font-medium transition-all"
                  />
                </div>

                {/* Submit */}
                <div className="pt-3 block">
                  <button
                    type="submit"
                    className="w-full h-13 bg-[#00478d] hover:bg-[#005eb8] text-white font-sans text-sm font-semibold rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <CalendarCheck className="w-5 h-5 text-white" />
                    Zapisz termin w kalendarzu
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
