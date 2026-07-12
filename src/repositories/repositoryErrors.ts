export type RepositoryErrorCode =
  'unauthorized' | 'forbidden' | 'not_found' | 'validation' | 'conflict' | 'network' | 'unknown';

export class RepositoryError extends Error {
  constructor(
    readonly code: RepositoryErrorCode,
    message: string,
    readonly operation?: string,
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export class UnauthorizedRepositoryError extends RepositoryError {
  constructor(operation?: string) {
    super('unauthorized', 'Sign in is required to access this data.', operation);
  }
}

export class ForbiddenRepositoryError extends RepositoryError {
  constructor(operation?: string) {
    super('forbidden', 'Permission denied.', operation);
  }
}
export class NotFoundRepositoryError extends RepositoryError {
  constructor(message = 'Record not found.', operation?: string) {
    super('not_found', message, operation);
  }
}
export class ValidationRepositoryError extends RepositoryError {
  constructor(message: string, operation?: string) {
    super('validation', message, operation);
  }
}
export class ConflictRepositoryError extends RepositoryError {
  constructor(message: string, operation?: string) {
    super('conflict', message, operation);
  }
}
export class NetworkRepositoryError extends RepositoryError {
  constructor(operation?: string) {
    super('network', 'Network request failed.', operation);
  }
}
export class UnknownRepositoryError extends RepositoryError {
  constructor(operation?: string) {
    super('unknown', 'Request failed.', operation);
  }
}
