import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSongs } from '../store/SongContext';
import {
  getGroups,
  createGroup,
  deleteGroup,
  subscribeGroups,
} from '../lib/groups';
import {
  Layers,
  Plus,
  Play,
  Trash2,
  Calendar,
  Music,
  ArrowRight,
  FolderHeart,
  ChevronRight,
  X,
  CheckCircle2,
  Search,
} from 'lucide-react';

export default function GroupList() {
  const navigate = useNavigate();
  const { songs } = useSongs();
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    setGroups(getGroups());
    const unsubscribe = subscribeGroups((updated) => setGroups(updated));
    return unsubscribe;
  }, []);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.trim().toLowerCase();
    return groups.filter(
      (g) =>
        (g.name || '').toLowerCase().includes(q) ||
        (g.description || '').toLowerCase().includes(q)
    );
  }, [groups, search]);

  const handleCreateGroup = (e) => {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;

    try {
      const created = createGroup(name, newGroupDesc.trim());
      setNewGroupName('');
      setNewGroupDesc('');
      setIsModalOpen(false);
      setToastMessage(`Created group "${created.name}"`);
      setTimeout(() => setToastMessage(null), 3000);
      navigate(`/groups/${created.id}`);
    } catch (err) {
      alert(err.message || 'Failed to create group');
    }
  };

  const handleDeleteGroup = (e, groupId, groupName) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete the group "${groupName}"?`)) {
      deleteGroup(groupId);
      setToastMessage(`Deleted "${groupName}"`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handlePresentGroup = (e, group) => {
    e.stopPropagation();
    if (!group.songIds.length) {
      alert('This group has no songs yet. Add some songs first!');
      return;
    }
    const firstSongId = group.songIds[0];
    navigate(`/present/${firstSongId}?groupId=${group.id}`);
  };

  return (
    <div className="space-y-3.5 pb-20 w-full max-w-full overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 sm:top-20 right-4 left-4 sm:left-auto sm:max-w-md z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900/95 text-white p-3.5 shadow-xl border border-slate-800 backdrop-blur-md text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="flex-1 truncate">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Compact Top Action Bar */}
      <div className="flex items-center justify-between gap-2 pb-0.5">
        <span className="text-xs font-bold text-slate-500">
          {filteredGroups.length} of {groups.length} {groups.length === 1 ? 'Collection' : 'Collections'}
        </span>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Group</span>
        </button>
      </div>

      {/* Search Input when multiple groups exist */}
      {groups.length > 2 && (
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search collections by name..."
            className="w-full rounded-xl border border-slate-200/90 bg-white pl-10 pr-9 py-2 text-sm font-normal text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none shadow-2xs transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {groups.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-xs">
          <FolderHeart className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-900">No Groups Created Yet</h3>
          <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto">
            Organize songs into groups for Sunday worship services, youth fellowships, or praise nights.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create First Group</span>
          </button>
        </div>
      )}

      {/* Compact Groups List View (Matching SongList.jsx) */}
      {groups.length > 0 && (
        <div className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs w-full max-w-full">
          {filteredGroups.map((group) => {
            const songCount = group.songIds.length;

            return (
              <div
                key={group.id}
                onClick={() => navigate(`/groups/${group.id}`)}
                className="group flex items-center justify-between gap-3 px-3.5 py-3 sm:px-5 sm:py-3.5 transition-colors cursor-pointer hover:bg-slate-50/90 active:bg-slate-100/80"
              >
                {/* Left: Icon, Group Name, Song Count, Description */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-700 font-bold shrink-0 group-hover:scale-105 transition-transform">
                    <Layers className="h-4 w-4" />
                  </span>

                  <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-2.5">
                    <span className="font-semibold text-sm sm:text-base text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                      {group.name}
                    </span>

                    {group.description && (
                      <span className="hidden md:inline text-xs text-slate-400 font-normal truncate max-w-md">
                        · {group.description}
                      </span>
                    )}
                  </div>

                  <span className="rounded-full bg-slate-100 border border-slate-200/70 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 shrink-0">
                    {songCount} {songCount === 1 ? 'song' : 'songs'}
                  </span>
                </div>

                {/* Right: Actions */}
                <div className="shrink-0 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {songCount > 0 && (
                    <button
                      type="button"
                      onClick={(e) => handlePresentGroup(e, group)}
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-900 text-white hover:bg-slate-800 px-2.5 py-1.5 text-xs font-bold transition shadow-2xs active:scale-95"
                      title="Present songs in this group"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span className="hidden sm:inline">Present</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleDeleteGroup(e, group.id, group.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition active:scale-95"
                    title="Delete group"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  <span className="p-1 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
                  <Plus className="h-4 w-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900">Create Song Group</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Group / Collection Name *
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Sunday Worship 18 Oct"
                  autoFocus
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="e.g. Setlist for morning praise service"
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newGroupName.trim()}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50 transition active:scale-95"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
