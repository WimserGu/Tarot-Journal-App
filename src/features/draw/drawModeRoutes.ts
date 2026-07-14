import type { DrawSession } from './drawTypes';

export type AvailableDrawMode = 'free-table' | 'single-card' | 'three-cards';
export type AvailableDrawRoute = '/draw/table' | '/draw/single' | '/draw/three-card';

export function drawModeForSession(session: DrawSession): AvailableDrawMode {
  if (session.configuration.spreadId === 'single-card') return 'single-card';
  if (session.configuration.spreadId === 'three-cards') return 'three-cards';
  return 'free-table';
}

export function drawRouteForMode(mode: AvailableDrawMode): AvailableDrawRoute {
  if (mode === 'single-card') return '/draw/single';
  if (mode === 'three-cards') return '/draw/three-card';
  return '/draw/table';
}

export function drawRouteForSession(session: DrawSession): AvailableDrawRoute {
  return drawRouteForMode(drawModeForSession(session));
}
