const BASE = '/api/games';

export async function createGame(hostName: string, hostId: string): Promise<string> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create', hostName, hostId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data.code;
}

export async function joinGame(code: string, playerName: string, playerId: string): Promise<void> {
  const res = await fetch(`${BASE}/${code}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName, playerId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

export async function startGame(code: string, hostId: string, seenHashes?: string[]): Promise<void> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'start', code, hostId, seenHashes }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}

export async function getGameState(code: string, playerId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/${code}/state?playerId=${playerId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function sendAction(
  code: string,
  type: string,
  playerId: string,
  payload?: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`${BASE}/${code}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, playerId, payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
}
