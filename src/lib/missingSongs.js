import { supabase, isSupabaseConfigured } from './supabase.js';

/**
 * Validates a reported song keyword and optional notes before saving.
 * Throws a clear Error if validation fails.
 */
export function validateMissingSongInput(keyword, notes = '') {
  if (keyword === null || keyword === undefined) {
    throw new Error('Song name or keyword is required.');
  }

  const trimmedKeyword = String(keyword).trim().replace(/\s+/g, ' ');

  if (!trimmedKeyword) {
    throw new Error('Song name or keyword cannot be blank.');
  }

  if (trimmedKeyword.length < 1) {
    throw new Error('Song keyword must be at least 1 character.');
  }

  if (trimmedKeyword.length > 200) {
    throw new Error('Song keyword must be 200 characters or less.');
  }

  let trimmedNotes = null;
  if (notes !== null && notes !== undefined) {
    const s = String(notes).trim();
    if (s.length > 500) {
      throw new Error('Notes must be 500 characters or less.');
    }
    if (s.length > 0) {
      trimmedNotes = s;
    }
  }

  return {
    keyword: trimmedKeyword,
    notes: trimmedNotes,
  };
}

/**
 * Asserts that Supabase client is configured and available.
 */
function assertSupabaseReady() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Supabase is not configured. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
    );
  }
}

/**
 * Validate that the Supabase `missing_songs` table exists and is accessible.
 * Returns { ok: true } or { ok: false, error: string }.
 */
export async function validateSupabaseConnection() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: false,
      error: 'Supabase credentials not configured in environment (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).',
    };
  }

  try {
    const { error } = await supabase
      .from('missing_songs')
      .select('id')
      .limit(1);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || 'Network error connecting to Supabase.' };
  }
}

/**
 * Fetch all missing songs from Supabase ONLY.
 */
export async function fetchMissingSongs() {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase not configured: cannot fetch missing songs from Supabase.');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('missing_songs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch missing songs from Supabase:', error.message);
      throw new Error(`Supabase query error: ${error.message}`);
    }

    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Supabase fetch error:', err.message);
    throw err;
  }
}

/**
 * Add a missing song keyword to Supabase ONLY.
 * Performs input validation and checks for duplicates.
 */
export async function addMissingSong(keyword, notes = '') {
  // 1. Validate inputs
  const validated = validateMissingSongInput(keyword, notes);

  // 2. Validate Supabase connection
  assertSupabaseReady();

  try {
    // 3. Check if song already exists in Supabase (case-insensitive)
    const { data: existing, error: searchError } = await supabase
      .from('missing_songs')
      .select('id, keyword, notes')
      .ilike('keyword', validated.keyword)
      .limit(1);

    if (searchError) {
      console.warn('Supabase duplicate check query failed, continuing with insert:', searchError.message);
    }

    let insertedOrUpdated;

    if (existing && existing.length > 0) {
      // If already reported, update timestamp and append notes if new notes provided
      const targetId = existing[0].id;
      const mergedNotes = validated.notes
        ? existing[0].notes
          ? `${existing[0].notes} | ${validated.notes}`
          : validated.notes
        : existing[0].notes;

      const { data: updated, error: updateError } = await supabase
        .from('missing_songs')
        .update({
          notes: mergedNotes,
          created_at: new Date().toISOString(),
        })
        .eq('id', targetId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Supabase update error: ${updateError.message}`);
      }
      insertedOrUpdated = updated;
    } else {
      // Insert new record into Supabase
      const { data: inserted, error: insertError } = await supabase
        .from('missing_songs')
        .insert([
          {
            keyword: validated.keyword,
            notes: validated.notes,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (insertError) {
        throw new Error(`Supabase insert error: ${insertError.message}`);
      }
      insertedOrUpdated = inserted;
    }

    // 4. Return refreshed list from Supabase
    const list = await fetchMissingSongs();
    return { entry: insertedOrUpdated, list };
  } catch (err) {
    console.error('addMissingSong failed in Supabase:', err.message);
    throw err;
  }
}

/**
 * Delete a missing song from Supabase ONLY by id.
 */
export async function deleteMissingSong(id) {
  if (!id) {
    throw new Error('Missing song ID is required for deletion.');
  }

  assertSupabaseReady();

  try {
    const { error } = await supabase
      .from('missing_songs')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Supabase delete error: ${error.message}`);
    }

    // Return updated list from Supabase
    const list = await fetchMissingSongs();
    return list;
  } catch (err) {
    console.error('deleteMissingSong failed in Supabase:', err.message);
    throw err;
  }
}
