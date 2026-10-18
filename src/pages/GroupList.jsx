import { useState, useEffect } from 'react';
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
} from 'lucide-react';

export default function GroupList() {
  const navigate = useNavigate();
  const { songs } = useSongs();
  const [groups, setGroups] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    setGroups(getGroups());
    const unsubscribe = subscribeGroups((updated) => setGroups(updated));
    return unsubscribe;
  }, []);

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
    <div className="space-y-5 pb-20 w-full max-w-full overflow-x-hidden">
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
      <div className="flex items-center justify-between pb-1">
        <span className="text-xs font-bold text-slate-500">
          {groups.length} {groups.length === 1 ? 'Collection' : 'Collections'}
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

      {/* Groups Grid / List */}
      {groups.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const songCount = group.songIds.length;
            const previewSongs = group.songIds
              .slice(0, 3)
              .map((id) => songs.find((s) => s.id === id))
              .filter(Boolean);

            return (
              <div
                key={group.id}
                onClick={() => navigate(`/groups/${group.id}`)}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer overflow-hidden"
              >
                <div>
                  {/* Top Bar of Card */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-700 font-bold shrink-0">
                        <Layers className="h-4 w-4" />
                      </span>
                      <h3 className="font-bold text-base text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                        {group.name}
                      </h3>
                    </div>

                    <span className="rounded-full bg-slate-100 border border-slate-200/70 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 shrink-0">
                      {songCount} {songCount === 1 ? 'song' : 'songs'}
                    </span>
                  </div>

                  {/* Description */}
                  {group.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                      {group.description}
                    </p>
                  )}

                  {/* Songs preview */}
                  {previewSongs.length > 0 && (
                    <div className="space-y-1 mb-4 mt-2">
                      {previewSongs.map((s, idx) => (
                        <div key={s.id} className="text-xs text-slate-600 truncate flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-slate-400 w-3">{idx + 1}.</span>
                          <span className="truncate">{s.title}</span>
                        </div>
                      ))}
                      {songCount > 3 && (
                        <p className="text-[11px] text-slate-400 font-medium pl-4.5">
                          +{songCount - 3} more...
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2 mt-2">
                  {songCount > 0 ? (
                    <button
                      type="button"
                      onClick={(e) => handlePresentGroup(e, group)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white px-3 py-1.5 text-xs font-bold transition shadow-2xs active:scale-95"
                      title="Present songs in this group"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Present</span>
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Empty group</span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteGroup(e, group.id, group.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Delete group"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <span className="p-1 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
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
