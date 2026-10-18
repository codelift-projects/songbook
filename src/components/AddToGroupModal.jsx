import { useState, useEffect } from 'react';
import {
  getGroups,
  createGroup,
  toggleSongInGroup,
  subscribeGroups,
} from '../lib/groups';
import {
  X,
  FolderPlus,
  Check,
  Plus,
  Layers,
  Music,
} from 'lucide-react';

export default function AddToGroupModal({ open, song, onClose }) {
  const [groups, setGroups] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!open) {
      setIsCreating(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setFeedback(null);
      return;
    }

    setGroups(getGroups());
    const unsubscribe = subscribeGroups((updated) => setGroups(updated));
    return unsubscribe;
  }, [open]);

  if (!open || !song) return null;

  const handleToggle = (groupId, groupName) => {
    try {
      const { isAdded } = toggleSongInGroup(groupId, song.id);
      setFeedback(
        isAdded
          ? `Added to "${groupName}"`
          : `Removed from "${groupName}"`
      );
      setTimeout(() => setFeedback(null), 2500);
    } catch (err) {
      setFeedback(err.message || 'Failed to update group');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleCreateNewGroup = (e) => {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;

    try {
      const created = createGroup(name, newGroupDesc.trim(), [song.id]);
      setNewGroupName('');
      setNewGroupDesc('');
      setIsCreating(false);
      setFeedback(`Created "${created.name}" & added song!`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback(err.message || 'Failed to create group');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700 font-bold shrink-0">
              <Layers className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Add to Group / Collection
              </h3>
              <p className="text-xs text-slate-500 truncate mt-0.5 max-w-[260px]">
                {song.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feedback message banner */}
        {feedback && (
          <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-100 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-in fade-in duration-150">
            <span>{feedback}</span>
          </div>
        )}

        {/* Groups List */}
        <div className="p-5 flex-1 overflow-y-auto space-y-2">
          {groups.length === 0 && !isCreating && (
            <div className="text-center py-6 px-4">
              <Music className="mx-auto h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-800">
                No groups created yet
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Create a group like "Sunday Worship" or "Youth Service" to organize your songs into collections.
              </p>
            </div>
          )}

          {groups.map((group) => {
            const isMember = group.songIds.includes(song.id);
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => handleToggle(group.id, group.name)}
                className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border text-left transition ${
                  isMember
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm truncate">{group.name}</span>
                    <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-600 shrink-0">
                      {group.songIds.length} {group.songIds.length === 1 ? 'song' : 'songs'}
                    </span>
                  </div>
                  {group.description && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {group.description}
                    </p>
                  )}
                </div>

                <div
                  className={`grid h-6 w-6 place-items-center rounded-lg border transition shrink-0 ${
                    isMember
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isMember && <Check className="h-4 w-4 stroke-[3]" />}
                </div>
              </button>
            );
          })}

          {/* Inline Create Group Form */}
          {isCreating ? (
            <form onSubmit={handleCreateNewGroup} className="mt-4 p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/40 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                New Collection / Group
              </h4>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group Name (e.g. Sunday Service)"
                autoFocus
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
              <input
                type="text"
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                placeholder="Optional description"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newGroupName.trim()}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
                >
                  Create & Add
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-slate-300 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/50 text-xs font-bold transition mt-3"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Group</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 shadow-sm transition active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
