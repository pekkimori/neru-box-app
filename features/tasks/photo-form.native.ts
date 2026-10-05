import type { PendingTaskPhoto } from './task-photos';

// PhotoCompletionModal already copied this file into app-owned persistent storage.
export async function prepareUploadPhoto(uri: string) { return uri; }

export async function photoForm(record: PendingTaskPhoto) {
  const form = new FormData();
  form.append('photoId', record.photoId);
  form.append('purpose', record.purpose);
  const extension = record.uri.toLowerCase().split('.').pop();
  const type = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
  form.append('photo', { uri: record.uri, type, name: `${record.photoId}.${extension === 'png' ? 'png' : extension === 'webp' ? 'webp' : 'jpg'}` } as unknown as Blob);
  return form;
}
