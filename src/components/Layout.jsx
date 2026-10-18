import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { isSupabaseConfigured } from '../lib/supabase';
import { useSongs } from '../store/SongContext';
import { 
  Settings as SettingsIcon, 
  Cloud, 
  HardDrive, 
  SlidersHorizontal, 
  Play, 
  Layers, 
  RefreshCw,
  Maximize2,
  Minimize2
} from 'lucide-react';

export default function Layout() {
  const { syncing, syncProgress, syncWithCloud, lastSyncTime } = useSongs();
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement));

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const toggleAppFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
          await document.documentElement.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err.message);
    }
  };

  const formattedLastSync = lastSyncTime
    ? new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="min-h-screen text-slate-900 flex flex-col selection:bg-emerald-200/40 pb-16 sm:pb-0 overflow-x-hidden w-full max-w-full">
      {/* Beautiful Glowing Sync Progress Bar (Top of Screen) */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 h-1 bg-slate-900/10 transition-all duration-300 ${
          syncing ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="h-full bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.95)] transition-all duration-300 ease-out"
          style={{ width: `${Math.max(6, syncProgress)}%` }}
        />
      </div>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 glass-nav shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2.5 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
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

            {/* Cloud/Local Status Badge */}
            <div className="hidden lg:flex items-center gap-1.5 ml-2 rounded-full border border-slate-200/80 bg-slate-100/90 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 shadow-2xs">
              {isSupabaseConfigured ? (
                <>
                  <Cloud className="h-3 w-3 text-emerald-600" />
                  <span className="text-emerald-700">Offline-Ready JSON Cache</span>
                </>
              ) : (
                <>
                  <HardDrive className="h-3 w-3 text-slate-500" />
                  <span className="text-slate-600">Local Only</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Sync Button (Available on both desktop & mobile) */}
            <button
              type="button"
              onClick={() => syncWithCloud(false)}
              disabled={syncing}
              className={`relative flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-black transition-all shadow-2xs active:scale-95 ${
                syncing
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500/30'
                  : 'border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300'
              }`}
              title={
                syncing
                  ? `Syncing with Supabase DB (${syncProgress}%)...`
                  : formattedLastSync
                  ? `Last synced at ${formattedLastSync}. Click to fetch latest songs from Supabase DB.`
                  : 'Click to sync songs and metadata from Supabase DB into client cache'
              }
            >
              <RefreshCw className={`h-3.5 w-3.5 text-emerald-600 ${syncing ? 'animate-spin' : ''}`} />
              <span className="font-extrabold text-[11px] sm:text-xs">
                {syncing ? `${syncProgress}%` : 'Sync'}
              </span>
            </button>

            {/* Fullscreen Toggle Button */}
            <button
              type="button"
              onClick={toggleAppFullscreen}
              className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-black transition-all shadow-2xs active:scale-95 ${
                isFullscreen
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-emerald-600/20'
                  : 'border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300'
              }`}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5 text-slate-600" />
              )}
              <span className="hidden sm:inline font-extrabold text-[11px] sm:text-xs">
                {isFullscreen ? 'Exit' : 'Full'}
              </span>
            </button>

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
                to="/groups"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition-all duration-150 ${isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Groups</span>
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
            `flex flex-col items-center gap-0.5 text-xs font-bold py-1 px-3 rounded-xl transition ${isActive ? 'text-emerald-600 bg-emerald-50 font-black' : 'text-slate-500'
            }`
          }
        >
          <Play className="h-4 w-4 fill-current" />
          <span>Present</span>
        </NavLink>

        <NavLink
          to="/groups"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-xs font-bold py-1 px-3 rounded-xl transition ${isActive ? 'text-emerald-600 bg-emerald-50 font-black' : 'text-slate-500'
            }`
          }
        >
          <Layers className="h-4 w-4" />
          <span>Groups</span>
        </NavLink>

        <NavLink
          to="/manage"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-xs font-bold py-1 px-3 rounded-xl transition ${isActive ? 'text-emerald-600 bg-emerald-50 font-black' : 'text-slate-500'
            }`
          }
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Manage</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-xs font-bold py-1 px-3 rounded-xl transition ${isActive ? 'text-emerald-600 bg-emerald-50 font-black' : 'text-slate-500'
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
