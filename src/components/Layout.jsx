import { NavLink, Outlet } from 'react-router-dom';
import { isSupabaseConfigured } from '../lib/supabase';
import { BookOpen, Settings as SettingsIcon, Cloud, HardDrive, SlidersHorizontal, Play } from 'lucide-react';

export default function Layout() {
  return (
    <div className="min-h-screen text-slate-900 flex flex-col selection:bg-emerald-200/40 pb-16 sm:pb-0">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 glass-nav shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3">
            <NavLink to="/" className="flex items-center gap-2.5 font-bold text-slate-900 hover:opacity-95 transition group">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 font-black text-xl select-none leading-none group-hover:scale-105 transition-transform duration-200">
                Z
              </span>
              <div className="flex flex-col leading-tight">
                <span className="tracking-tight text-base sm:text-lg font-black text-slate-900">
                  Zion Songbook
                </span>
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-600">
                  Live Projector
                </span>
              </div>
            </NavLink>

            {/* Cloud/Local Sync Badge */}
            <div className="hidden md:flex items-center gap-1.5 ml-2 rounded-full border border-slate-200/80 bg-slate-100/90 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 shadow-2xs">
              {isSupabaseConfigured ? (
                <>
                  <Cloud className="h-3 w-3 text-emerald-600" />
                  <span className="text-emerald-700">Cloud Sync</span>
                </>
              ) : (
                <>
                  <HardDrive className="h-3 w-3 text-slate-500" />
                  <span className="text-slate-600">Offline / Local</span>
                </>
              )}
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden sm:flex items-center gap-1.5 text-xs sm:text-sm font-bold">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition-all duration-150 ${isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Present</span>
            </NavLink>

            <NavLink
              to="/manage"
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition-all duration-150 ${isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Manage</span>
            </NavLink>

            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition-all duration-150 ${isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <SettingsIcon className="h-3.5 w-3.5" />
              <span>Settings</span>
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 border-t border-slate-200 backdrop-blur-lg flex items-center justify-around py-1.5 px-3 shadow-lg">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-xs font-bold py-1 px-4 rounded-xl transition ${isActive ? 'text-emerald-600 bg-emerald-50 font-black' : 'text-slate-500'
            }`
          }
        >
          <Play className="h-4 w-4 fill-current" />
          <span>Present</span>
        </NavLink>

        <NavLink
          to="/manage"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-xs font-bold py-1 px-4 rounded-xl transition ${isActive ? 'text-emerald-600 bg-emerald-50 font-black' : 'text-slate-500'
            }`
          }
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Manage</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-xs font-bold py-1 px-4 rounded-xl transition ${isActive ? 'text-emerald-600 bg-emerald-50 font-black' : 'text-slate-500'
            }`
          }
        >
          <SettingsIcon className="h-4 w-4" />
          <span>Settings</span>
        </NavLink>
      </div>

      {/* Desktop Footer */}
      <footer className="hidden sm:block border-t border-slate-200/80 bg-white/60 py-3 text-center text-xs font-semibold text-slate-400">
        Zion Songbook • Live Projector & Worship Presentation
      </footer>
    </div>
  );
}
