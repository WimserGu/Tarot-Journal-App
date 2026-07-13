import type { Reading, UUID } from '../../domain/types';
import type { DrawSession } from './drawTypes';

export type CreateDrawSessionInput = Omit<
  DrawSession,
  'id' | 'userId' | 'createdAt' | 'updatedAt' | 'status' | 'linkedReadingId'
>;

export type UpdateDrawSessionInput = Pick<DrawSession, 'cards' | 'configuration' | 'spreadId'> & {
  status?: DrawSession['status'];
  linkedReadingId?: UUID | null;
};

export interface DrawSessionRepository {
  subscribe(listener: () => void): () => void;
  create(input: CreateDrawSessionInput): Promise<DrawSession>;
  update(id: UUID, input: UpdateDrawSessionInput): Promise<DrawSession>;
  get(id: UUID): Promise<DrawSession | null>;
  list(): Promise<DrawSession[]>;
  getActiveDraft(): Promise<DrawSession | null>;
  listRelatedReadings(id: UUID): Promise<Reading[]>;
  delete(id: UUID): Promise<void>;
}

export class DrawSessionNotFoundError extends Error {
  constructor() {
    super('Draw session not found.');
    this.name = 'DrawSessionNotFoundError';
  }
}
