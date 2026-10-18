import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSongs } from '../store/SongContext';
import {
  getGroup,
  updateGroup,
  deleteGroup,
  removeSongFromGroup,
  reorderSongsInGroup,
  subscribeGroups,
} from '../lib/groups';
import { buildIndex, parseQuery, scoreSongMatch } from '../lib/search';
import {
  Layers,
  Play,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Search,
  Eye,
  Check,
  X,
  Edit2,
  Music,
  CheckCircle2,
} from 'lucide-react';

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { songs } = useSongs();

  const [group, setGroup] = useState(() => getGroup(id));
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Sync group state from storage and listeners
  useEffect(() => {
    const current = getGroup(id);
    if (!current) {
      navigate('/groups', { replace: true });
      return;
    }
    setGroup(current);
    setEditName(current.name);
    setEditDesc(current.description || '');

    const unsubscribe = subscribeGroups(() => {
      const updated = getGroup(id);
      if (updated) {
        setGroup(updated);
      }
    });

    return unsubscribe;
  }, [id, navigate]);

  // Songs mapped in group's custom order
  const groupSongs = useMemo(() => {
    if (!group) return [];
    return group.songIds
      .map((songId) => songs.find((s) => s.id === songId))
      .filter(Boolean);
  }, [group, songs]);

  if (!group) return null;

  const handleSaveMeta = (e) => {
    e.preventDefault();
    if (!editName.trim()) return;

    try {
      const updated = updateGroup(group.id, {
        name: editName.trim(),
        description: editDesc.trim(),
      });
      setGroup(updated);
      setIsEditing(false);
      setToastMessage('Group details updated');
      setTimeout(() => setToastMessage(null), 2500);
    } catch (err) {
      alert(err.message || 'Failed to update group');
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Delete the group "${group.name}"?`)) {
      deleteGroup(group.id);
      navigate('/groups');
    }
  };

  const handleMove = (index, direction) => {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= group.songIds.length) return;

    const newSongIds = [...group.songIds];
    const temp = newSongIds[index];
    newSongIds[index] = newSongIds[newIdx];
    newSongIds[newIdx] = temp;

    const updated = reorderSongsInGroup(group.id, newSongIds);
    setGroup(updated);
  };

  const handleRemoveSong = (songId, songTitle) => {
    const updated = removeSongFromGroup(group.id, songId);
    setGroup(updated);
    setToastMessage(`Removed "${songTitle}" from group`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleToggleAddSong = (songId) => {
    const hasSong = group.songIds.includes(songId);
    let newSongIds;
    if (hasSong) {
      newSongIds = group.songIds.filter((sid) => sid !== songId);
    } else {
      newSongIds = [...group.songIds, songId];
    }
    const updated = reorderSongsInGroup(group.id, newSongIds);
    setGroup(updated);
  };

  const handlePresent = () => {
    if (!group.songIds.length) return;
    navigate(`/present/${group.songIds[0]}?groupId=${group.id}`);
  };

  // Precomputed index for search within the Add Songs modal
  const indexed = useMemo(
    () => songs.map((s) => ({ song: s, index: buildIndex(s) })),
    [songs]
  );
  const parsedAddQuery = useMemo(() => parseQuery(addSearch), [addSearch]);

  const filteredCandidateSongs = useMemo(() => {
    return indexed
      .map(({ song, index }) => ({
        song,
        score: scoreSongMatch(index, parsedAddQuery),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (parsedAddQuery.raw) return b.score - a.score;
        return (a.song.number || 0) - (b.song.number || 0);
      })
      .map((x) => x.song);
  }, [indexed, parsedAddQuery]);

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

      {/* Top Navigation Back link */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/groups')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs hover:bg-slate-50 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>All Groups</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs hover:bg-slate-50 transition"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Edit Info</span>
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 transition"
            title="Delete this group"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Group Header Info */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs">
        {isEditing ? (
          <form onSubmit={handleSaveMeta} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Group Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
              >
                Save
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
                  <Layers className="h-4 w-4" />
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {group.name}
                </h1>
              </div>

              {group.description && (
                <p className="text-xs sm:text-sm text-slate-500 pl-10">
                  {group.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition active:scale-95"
              >
                <Plus className="h-4 w-4 text-emerald-600" />
                <span>Add Songs</span>
              </button>

              {group.songIds.length > 0 && (
                <button
                  type="button"
                  onClick={handlePresent}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-600/25 transition active:scale-95"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Present Collection</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Song List in Group */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Songs in Collection ({groupSongs.length})
          </h2>
          {groupSongs.length > 1 && (
            <span className="text-[11px] text-slate-400">
              Use arrows to reorder songs
            </span>
          )}
        </div>

        {groupSongs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center shadow-xs">
            <Music className="mx-auto h-10 w-10 text-slate-300 mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No songs in this collection</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Click below to pick songs from your songbook and add them to this setlist.
            </p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Add Songs to Group</span>
            </button>
          </div>
        )}

        {groupSongs.length > 0 && (
          <div className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
            {groupSongs.map((song, index) => (
              <div
                key={song.id}
                className="group flex items-center justify-between gap-3 px-3.5 py-3 sm:px-5 sm:py-3.5 hover:bg-slate-50/90 transition-colors"
              >
                {/* Order Number & Title */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-slate-100 text-slate-600 text-xs font-black shrink-0 font-mono">
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p
                      onClick={() => navigate(`/view/${song.id}?groupId=${group.id}`)}
                      className="font-semibold text-sm sm:text-base text-slate-900 hover:text-emerald-700 transition-colors truncate cursor-pointer"
                    >
                      {song.title}
                    </p>
                  </div>
                </div>

                {/* Actions: Reorder, View, Remove */}
                <div className="shrink-0 flex items-center gap-1">
                  {/* Reorder Buttons */}
                  <div className="flex items-center gap-0.5 mr-1 border-r border-slate-200 pr-1.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, -1)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition"
                      title="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === groupSongs.length - 1}
                      onClick={() => handleMove(index, 1)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition"
                      title="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* View Button */}
                  <button
                    type="button"
                    onClick={() => navigate(`/view/${song.id}?groupId=${group.id}`)}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/90 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition shadow-2xs active:scale-95"
                    title="View lyrics"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">View</span>
                  </button>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveSong(song.id, song.title)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Remove from group"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Songs Picker Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/80">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Add Songs to "{group.name}"
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click on any song to toggle it in this collection
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  placeholder="Search songs to add by title or number..."
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
                {addSearch && (
                  <button
                    onClick={() => setAddSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Songs candidate list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
              {filteredCandidateSongs.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-500">
                  No matching songs found for "{addSearch}"
                </div>
              )}

              {filteredCandidateSongs.map((s) => {
                const inGroup = group.songIds.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => handleToggleAddSong(s.id)}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl cursor-pointer transition ${
                      inGroup
                        ? 'bg-emerald-50/80 hover:bg-emerald-100/70 text-emerald-950 font-semibold'
                        : 'hover:bg-slate-50 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`grid h-5 w-5 place-items-center rounded border transition shrink-0 ${
                          inGroup
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {inGroup && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>

                      <span className="text-sm truncate">{s.title}</span>
                    </div>

                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                      {s.language}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">
                {group.songIds.length} {group.songIds.length === 1 ? 'song' : 'songs'} in group
              </span>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 shadow-sm transition active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
