const GROUPS_STORAGE_KEY = 'church-songbook:groups:v1';
const EVENT_NAME = 'songbook:groups-changed';

/**
 * Generates unique group ID
 */
function uid() {
  return `grp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Safely read groups array from localStorage
 */
export function getGroups() {
  try {
    const raw = localStorage.getItem(GROUPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read groups from localStorage:', err);
    return [];
  }
}

/**
 * Save groups array to localStorage and dispatch update event
 */
function saveGroups(groups) {
  try {
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: groups }));
    }
  } catch (err) {
    console.error('Failed to save groups to localStorage:', err);
  }
}

/**
 * Get a single group by ID
 */
export function getGroup(id) {
  const groups = getGroups();
  return groups.find((g) => g.id === id) || null;
}

/**
 * Create a new group
 */
export function createGroup(name, description = '', initialSongIds = []) {
  const cleanName = String(name || '').trim();
  if (!cleanName) {
    throw new Error('Group name is required');
  }

  const groups = getGroups();
  const newGroup = {
    id: uid(),
    name: cleanName,
    description: String(description || '').trim(),
    songIds: Array.isArray(initialSongIds) ? Array.from(new Set(initialSongIds)) : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  groups.unshift(newGroup);
  saveGroups(groups);
  return newGroup;
}

/**
 * Update an existing group's metadata
 */
export function updateGroup(id, updates = {}) {
  const groups = getGroups();
  const index = groups.findIndex((g) => g.id === id);
  if (index === -1) {
    throw new Error(`Group not found: ${id}`);
  }

  const updated = {
    ...groups[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  groups[index] = updated;
  saveGroups(groups);
  return updated;
}

/**
 * Delete a group by ID
 */
export function deleteGroup(id) {
  const groups = getGroups();
  const filtered = groups.filter((g) => g.id !== id);
  saveGroups(filtered);
  return filtered;
}

/**
 * Add a song to a group
 */
export function addSongToGroup(groupId, songId) {
  if (!groupId || !songId) return;
  const groups = getGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) throw new Error(`Group not found: ${groupId}`);

  if (!group.songIds.includes(songId)) {
    group.songIds.push(songId);
    group.updatedAt = new Date().toISOString();
    saveGroups(groups);
  }
  return group;
}

/**
 * Remove a song from a group
 */
export function removeSongFromGroup(groupId, songId) {
  if (!groupId || !songId) return;
  const groups = getGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) throw new Error(`Group not found: ${groupId}`);

  group.songIds = group.songIds.filter((id) => id !== songId);
  group.updatedAt = new Date().toISOString();
  saveGroups(groups);
  return group;
}

/**
 * Reorder songs in a group
 */
export function reorderSongsInGroup(groupId, newSongIds) {
  if (!groupId || !Array.isArray(newSongIds)) return;
  const groups = getGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) throw new Error(`Group not found: ${groupId}`);

  group.songIds = newSongIds;
  group.updatedAt = new Date().toISOString();
  saveGroups(groups);
  return group;
}

/**
 * Get all group IDs that contain a given songId
 */
export function getSongGroupIds(songId) {
  if (!songId) return [];
  const groups = getGroups();
  return groups.filter((g) => g.songIds.includes(songId)).map((g) => g.id);
}

/**
 * Toggle a song's membership in a group
 */
export function toggleSongInGroup(groupId, songId) {
  const groups = getGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) throw new Error(`Group not found: ${groupId}`);

  const hasSong = group.songIds.includes(songId);
  if (hasSong) {
    group.songIds = group.songIds.filter((id) => id !== songId);
  } else {
    group.songIds.push(songId);
  }
  group.updatedAt = new Date().toISOString();
  saveGroups(groups);
  return { group, isAdded: !hasSong };
}

/**
 * Subscribe to group changes across tabs/windows or components
 */
export function subscribeGroups(callback) {
  const handler = (e) => {
    callback(e.detail || getGroups());
  };

  const storageHandler = (e) => {
    if (e.key === GROUPS_STORAGE_KEY) {
      callback(getGroups());
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener('storage', storageHandler);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener('storage', storageHandler);
    }
  };
}
