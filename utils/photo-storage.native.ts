import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

const PHOTO_PROOF_DIRECTORY = new Directory(Paths.document, 'photo-proofs');

function safeExtension(source: File) {
  const extension = source.extension.toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(extension) ? extension : '.jpg';
}

/** Copies a picker-owned temporary file into app-owned, persistent storage. */
export async function persistPhotoProof(uri: string): Promise<string> {
  PHOTO_PROOF_DIRECTORY.create({ idempotent: true, intermediates: true });

  const source = new File(uri);
  const destination = new File(
    PHOTO_PROOF_DIRECTORY,
    `${Crypto.randomUUID()}${safeExtension(source)}`,
  );
  source.copy(destination);
  return destination.uri;
}
