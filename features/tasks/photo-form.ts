import { File } from 'expo-file-system';
import { imageDataUri } from '../../lib/api/image-data';
import type { PendingTaskPhoto } from './task-photos';

async function image(uri: string) {
  if (uri.startsWith('file://') || uri.startsWith('content://')) {
    const file = new File(uri);
    const data = await file.bytes();
    if (!data.length || data.length > 8 * 1024 * 1024) throw new Error('Choose a photo smaller than 8 MB.');
    const type = file.type || (/\.png(?:[?#]|$)/i.test(uri) ? 'image/png' : /\.webp(?:[?#]|$)/i.test(uri) ? 'image/webp' : 'image/jpeg');
    return new Blob([data], { type });
  }
  const response = await fetch(uri);
  if (!response.ok) throw new Error('The selected photo is unavailable. Choose it again.');
  const blob = await response.blob();
  if (!blob.size || blob.size > 8 * 1024 * 1024) throw new Error('Choose a photo smaller than 8 MB.');
  return blob;
}

/** Blob URLs from the web picker expire on reload; preserve the bytes before sending. */
export async function prepareUploadPhoto(uri: string) {
  const blob = await image(uri);
  return imageDataUri(new Uint8Array(await blob.arrayBuffer()), blob.type || 'image/jpeg');
}

export async function photoForm(record: PendingTaskPhoto) {
  const form = new FormData();
  form.append('photoId', record.photoId);
  form.append('purpose', record.purpose);
  form.append('photo', await image(record.uri), `${record.photoId}.jpg`);
  return form;
}
