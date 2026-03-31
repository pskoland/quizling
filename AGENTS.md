<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Quizling — Agent Guide

## What this is

A Norwegian-language multiplayer deception quiz game. One player ("Quizlingen") secretly sabotages while others ("Trofaste") try to identify them. The host controls phase progression. All UI text is in Norwegian.

## Architecture — the parts that aren't obvious

### Single-component UI
All game screens live in `src/components/GameApp.tsx` (~1100 lines). Each game phase renders a different section inline — there are no separate page routes per phase. If you need to add a screen, add it here and gate it on `gameState.phase`.

### State lives server-side, client polls
There are no WebSockets. The client polls `GET /api/games/[code]/state?playerId=...` every 1500ms (`src/lib/use-game.ts`). State only updates if `updatedAt` has changed. All mutations go through `POST /api/games/[code]/action`.

### Player view filtering is security-critical
`getPlayerView()` in `game-store.ts` controls what each player sees. The Quizling sees answers and category; others see `***` until voting/fasit phases. **Never return raw GameState to the client** — always filter through `getPlayerView()`.

### Database is optional
When `DATABASE_URL` is not set, the game store falls back to an in-memory `Map`. Tests rely on this. Don't add database-only code paths without preserving the in-memory fallback.

### AI question generation has a 3-tier fallback
1. Question bank DB table → 2. Claude Haiku API → 3. Hardcoded fallback questions. Both `DATABASE_URL` and `ANTHROPIC_API_KEY` are optional. The game must work with neither.

## Game phase flow

```
lobby → rules → role-reveal → lagnavn → lagnavn-confirmed →
  [quiz-N | power-q-N | power-result-N | voting] → fasit → reveal → result
```

Power questions are interleaved before specific quiz indices defined in `GAME_MODES[mode].powerBefore`. The sequence is NOT linear — `quiz-2` might be followed by `power-q-1`, not `quiz-3`.

## Tricky game logic

### Writer rotation
`writerQueue[currentQuizIndex % writerQueue.length]` — the queue is set at game start from player order and never changes. If a player leaves mid-game, their slot still exists.

### Power pin reveal timing
- **Blue pin**: reveals the answer on the LAST quiz question only.
- **White pin**: reveals the PREVIOUS question's answer, but only on the FIRST quiz after winning the pin (one-time use).

Pin logic lives in `getPlayerView()` — it's view-level, not state-level.

### Auto-transitions vs host-controlled
Some phases auto-advance when all players act (voting, power answers). Others require the host to press advance. The `advance-phase` action is host-only.

### Voting edge cases
- Players cannot vote for themselves (enforced server-side).
- Tied votes = no elimination, Quizlingen gets -3 penalty.

## Environment variables

```
DATABASE_URL          # Neon PostgreSQL (optional — falls back to in-memory)
ANTHROPIC_API_KEY     # For AI question generation (optional — falls back to hardcoded)
ADMIN_PASSWORD        # Required for /api/admin/* endpoints
```

## Testing

- **Framework**: Vitest + jsdom
- **Pattern**: Tests use the in-memory store (no DB needed), run full game scenarios end-to-end.
- **Run**: `npx vitest` or `npm test` (if configured)

## Scoring (computed in ResultScreen, not stored in state)

- +1 per correct quiz answer
- -1 per wrong quiz answer
- +3 if Quizlingen is correctly eliminated
- -3 if Quizlingen escapes (no elimination)
- Team wins if total score >= 1

Scoring is calculated client-side in `GameApp.tsx` ResultScreen — it's not persisted in game state.
