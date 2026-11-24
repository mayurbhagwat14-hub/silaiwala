/*
 * Keeps photos picked during signup on disk (app documents folder) so the signup draft can
 * point at them by path. The draft used to hold the photos as base64 inside AsyncStorage,
 * which on Android silently fails once the value passes ~2 MB — the photos then "disappeared"
 * after a network drop / app restart. A file path is a few bytes and survives both.
 */
import { File, Directory, Paths } from 'expo-file-system';

const signupDir = () => new Directory(Paths.document, 'delivery-signup');

/**
 * Copies a picked file ({ uri, name, type, size }) into the signup folder.
 * Returns a file object in the same shape (pointing at the copy), or the original on failure.
 */
export async function persistPickedFile(file, key) {
  if (!file?.uri) return file;
  try {
    const dir = signupDir();
    dir.create({ intermediates: true, idempotent: true });
    const ext = (String(file.name || '').split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const dest = new File(dir, `${key}_${Date.now()}.${ext}`);
    await new File(file.uri).copy(dest);
    return { uri: dest.uri, name: file.name || `${key}.${ext}`, type: file.type || 'image/jpeg', size: file.size || 0 };
  } catch (e) {
    console.warn('Could not keep a copy of the picked photo:', e?.message || e);
    return { uri: file.uri, name: file.name, type: file.type, size: file.size || 0 };
  }
}

/** True when a saved file path still points at an existing file. */
export function fileStillExists(uri) {
  if (!uri || typeof uri !== 'string') return false;
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

/** Removes every photo kept for the signup draft (after submit, or when the draft is discarded). */
export function clearSignupFiles() {
  try {
    const dir = signupDir();
    if (dir.exists) dir.delete();
  } catch {
    /* nothing to clean */
  }
}
