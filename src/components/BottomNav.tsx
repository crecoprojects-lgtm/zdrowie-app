// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar, History, CalendarRange, Box, Settings } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isDark?: boolean;
}

export default function BottomNav({ activeTab, onTabChange, isDark = false }: BottomNavProps) {
  const tabs = [
    { id: 'today' as ActiveTab, label: 'Dziś', icon: Calendar },
    { id: 'history' as ActiveTab, label: 'Historia', icon: History },
    { id: 'visits' as ActiveTab, label: 'Wizyty', icon: CalendarRange },
    { id: 'organizer' as ActiveTab, label: 'Organizer', icon: Box },
    { id: 'settings' as ActiveTab, label: 'Ustawienia', icon: Settings },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md flex justify-around items-center h-[calc(4rem+env(safe-area-inset-bottom,15px))] shadow-lg transition-colors pb-[env(safe-area-inset-bottom,15px)] pl-[env(safe-area-inset-left,10px)] pr-[env(safe-area-inset-right,10px)] ${
      isDark 
        ? 'bg-stone-900/95 border-t border-stone-800/80 shadow-black/40' 
        : 'bg-white/95 border-t border-gray-100 shadow-lg shadow-black/5'
    }`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className="flex-1 flex flex-col items-center justify-center h-full text-center transition-all duration-150 py-1 cursor-pointer focus:outline-none"
          >
            <div
              className={`flex items-center justify-center p-2 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-[#6cf8bb] text-[#002113] scale-105 shadow-sm' 
                  : isDark
                    ? 'text-stone-400 hover:text-white hover:bg-stone-800'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-neutral-50'
              }`}
            >
              <Icon className="w-5.5 h-5.5" />
            </div>
            <span
              className={`font-sans text-[10px] font-semibold mt-1 transition-colors duration-150 ${
                isActive 
                  ? isDark ? 'text-white' : 'text-[#002113]'
                  : isDark ? 'text-stone-400' : 'text-gray-400'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
