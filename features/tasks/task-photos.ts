import type { ApiClient } from '../../lib/api/client';
import type { KeyValueStorage } from '../../lib/storage/scoped-storage';

export interface PendingTaskPhoto {
  photoId: string;
  operationId: string;
  date: string;
  taskId: string;
  blockId: string;
  purpose: 'setup' | 'completion';
  uri: string;
  createdAt: string;
}
export interface TaskPhotoDto {
  id: string;
  taskId: string;
  purpose: 'setup' | 'completion' | null;
  mimeType: string | null;
  uri: string;
  takenAt: string;
}
const PREFIX = '@neru/photo-outbox/v1/';

/** Both upload and completion retain their IDs until the whole operation succeeds. */
export function createTaskPhotos(
  client: Pick<ApiClient, 'request' | 'getSnapshot'>,
  storage: KeyValueStorage,
  uuid: () => string,
  prepare: (uri: string) => Promise<string>,
  form: (record: PendingTaskPhoto) => Promise<FormData>,
) {
  const owner = client.getSnapshot().user?.id;
  const guard = () => {
    if (!owner || client.getSnapshot().user?.id !== owner || client.getSnapshot().status !== 'signedIn') throw new Error('Account changed. Sign in again.');
  };
  async function pending(): Promise<PendingTaskPhoto[]> {
    guard();
    const keys = (await storage.getAllKeys()).filter(key => key.startsWith(PREFIX));
    const values = await storage.multiGet(keys);
    guard();
    return values.flatMap(([, raw]) => {
      const record = raw ? JSON.parse(raw) as PendingTaskPhoto | null : null;
      if (!record) return [];
      if (!record.photoId || !record.operationId || !record.taskId || !record.date || !record.blockId || !record.uri || !['setup', 'completion'].includes(record.purpose)) throw new Error('A pending photo could not be read. Its record has been preserved.');
      return [record];
    }).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async function deliver(record: PendingTaskPhoto) {
    guard();
    try {
      const body = await form(record);
      guard();
      const { photo } = await client.request<{ photo: TaskPhotoDto }>(`/tasks/${encodeURIComponent(record.taskId)}/photos`, { method: 'POST', body });
      guard();
      if (photo?.id !== record.photoId || photo.taskId !== record.taskId || photo.purpose !== record.purpose) throw new Error('The photo receipt could not be read. Retry this save.');
      if (record.purpose === 'completion') {
        const response = await client.request<{ result: { id: string } }>('/planning/commands', {
          method: 'POST', body: { operationId: record.operationId, command: {
            kind: 'setTaskStatus', date: record.date, blockId: record.blockId,
            taskId: record.taskId, status: 'lit', photoId: record.photoId,
          } },
        });
        guard();
        if (response?.result?.id !== record.taskId) throw new Error('The completion receipt could not be read. Retry this save.');
      }
      await storage.setItem(PREFIX + record.photoId, 'null');
      return photo;
    } catch (error) {
      guard();
      if (error && typeof error === 'object' && 'status' in error && [400, 404, 409, 413].includes(Number(error.status))) await storage.setItem(PREFIX + record.photoId, 'null');
      throw error;
    }
  }
  return {
    pending,
    async upload(input: Omit<PendingTaskPhoto, 'photoId' | 'operationId' | 'createdAt'>) {
      guard();
      if ((await pending()).length) throw new Error('Retry the pending photo before starting another one.');
      const uri = await prepare(input.uri);
      guard();
      const record = { ...input, uri, photoId: uuid(), operationId: uuid(), createdAt: new Date().toISOString() };
      await storage.setItem(PREFIX + record.photoId, JSON.stringify(record));
      return deliver(record);
    },
    async retry(photoId: string) {
      const record = (await pending()).find(photo => photo.photoId === photoId);
      if (!record) throw new Error('This photo save has already been handled. Refresh the plan.');
      return deliver(record);
    },
  };
}
