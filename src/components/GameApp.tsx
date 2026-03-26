'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useGame, GameView } from '@/lib/use-game';

// ============ PRIMITIVES ============

const bebas = "font-['Gentika']";
const dm = "font-['Space_Mono']";

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-5">
      <div className="w-10 h-10 border-2 border-white/10 border-t-accent2 rounded-full animate-spin" />
      <div className="text-[10px] tracking-[4px] uppercase text-muted">Laster...</div>
    </div>
  );
}

function Logo() {
  return (
    <div className="text-center">
      <div className="mb-6 flex justify-center">
        <div className="w-12 h-px bg-gradient-to-r from-transparent via-accent2/60 to-transparent" />
      </div>
      <div className="flex justify-center mb-4">
        <Image src="/icons/Quizling_hovedikon.png" alt="Quizling" width={48} height={48} className="opacity-80" />
      </div>
      <div className="flex justify-center">
        <h1
          className={`${bebas} text-[clamp(48px,13vw,100px)] text-white leading-none whitespace-nowrap`}
          style={{ textShadow: '0 0 60px rgba(139,0,0,0.6), 0 0 120px rgba(139,0,0,0.2)' }}
        >
          QUIZLING
        </h1>
      </div>
      <div className="mt-6 flex justify-center">
        <div className="w-12 h-px bg-gradient-to-r from-transparent via-accent2/60 to-transparent" />
      </div>
    </div>
  );
}

function Btn({
  variant = 'primary',
  disabled,
  onClick,
  children,
  className = '',
}: {
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const base = `block w-full py-4 sm:py-5 px-6 rounded-md ${bebas} text-[18px] sm:text-[20px] tracking-[3px] cursor-pointer transition-all duration-200 text-center select-none`;
  const variants = {
    primary: `bg-accent2 text-white hover:bg-[#cc0000] active:scale-[0.98] shadow-[0_2px_20px_rgba(139,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]`,
    secondary: `bg-white/[0.04] text-white/70 border border-white/[0.08] hover:bg-white/[0.07] hover:text-white hover:border-white/15 active:scale-[0.98]`,
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${disabled ? '!opacity-30 !cursor-not-allowed !transform-none' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  type = 'text',
  inputMode,
  large,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  type?: string;
  inputMode?: 'numeric' | 'text';
  large?: boolean;
}) {
  return (
    <div className="mb-7">
      <label className="block text-[10px] sm:text-[11px] tracking-[4px] uppercase text-muted/80 mb-3 text-center">
        {label}
      </label>
      <input
        type={type}
        className={`w-full bg-white/[0.04] border border-white/[0.08] rounded-md text-white ${dm} px-6 py-5 sm:px-7 sm:py-6 outline-none transition-all duration-200 focus:border-accent2/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(139,0,0,0.15)] placeholder:text-white/20 ${
          large ? `text-[36px] sm:text-[42px] text-center tracking-[12px] indent-[12px] ${bebas}` : 'text-base sm:text-lg'
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
      />
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] tracking-[5px] uppercase text-accent2/80 block mb-2">
      {children}
    </span>
  );
}

function Title({ children, size = 'md' }: { children: React.ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'text-[24px] sm:text-[28px]', md: 'text-[30px] sm:text-[36px]', lg: 'text-[36px] sm:text-[42px]' };
  return (
    <h2 className={`${bebas} ${sizes[size]} tracking-[3px] leading-tight text-white`}>
      {children}
    </h2>
  );
}

function Card({ children, className = '', glow, style }: { children: React.ReactNode; className?: string; glow?: boolean; style?: React.CSSProperties }) {
  return (
    <div className={`bg-white/[0.03] border border-white/[0.06] rounded-lg p-6 backdrop-blur-sm ${glow ? 'animate-[glowPulse_3s_ease-in-out_infinite]' : ''} ${className}`} style={style}>
      {children}
    </div>
  );
}

function PlayerList({ players, hostId }: { players: GameView['players']; hostId: string }) {
  return (
    <ul className="space-y-2">
      {players.map((p, i) => (
        <li
          key={p.id}
          className="flex items-center gap-4 px-5 py-3.5 bg-white/[0.03] rounded-lg border border-white/[0.05]"
          style={{ animation: `slideIn 0.3s ease ${i * 0.05}s both` }}
        >
          <div className="w-8 h-8 rounded-full bg-accent2/20 border border-accent2/30 flex items-center justify-center text-xs text-accent2 font-medium">
            {p.name[0].toUpperCase()}
          </div>
          <span className="text-[15px] font-medium text-white/90">{p.name}</span>
          {p.id === hostId && (
            <span className={`ml-auto text-[9px] tracking-[3px] uppercase text-gold/80 ${bebas}`}>Vert</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function RoomCode({ code, label }: { code: string; label: string }) {
  return (
    <div className="text-center py-8 px-6 bg-white/[0.02] border border-white/[0.06] rounded-xl relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(139,0,0,0.08)_0%,transparent_70%)] pointer-events-none" />
      <div className="text-[10px] tracking-[5px] uppercase text-muted/60 mb-4 relative z-10">{label}</div>
      <div
        className={`${bebas} text-[64px] tracking-[16px] text-white relative z-10 leading-none`}
        style={{ textShadow: '0 0 30px rgba(139,0,0,0.5), 0 0 60px rgba(139,0,0,0.2)' }}
      >
        {code}
      </div>
    </div>
  );
}

function Progress({ progress }: { progress: number }) {
  return (
    <div className="h-[2px] bg-white/[0.05] rounded-full mb-8 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-accent2/80 to-accent2 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function Alert({ type, children }: { type: 'info' | 'warning' | 'danger'; children: React.ReactNode }) {
  const styles = {
    info: 'bg-[#3498db]/[0.08] border-[#3498db]/20 text-[#7ec8e3]',
    warning: 'bg-gold/[0.08] border-gold/20 text-gold/90',
    danger: 'bg-danger/[0.08] border-danger/20 text-danger/90',
  };
  return (
    <div className={`px-5 py-3.5 rounded-lg text-sm leading-relaxed border ${styles[type]} mb-4`}>
      {children}
    </div>
  );
}

function Waiting({ text }: { text: string }) {
  return (
    <div className="text-center py-8 flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-white/[0.06] border-t-accent2/60 rounded-full animate-spin" />
      <span className="text-[11px] tracking-[3px] uppercase text-muted/60">{text}</span>
    </div>
  );
}

/** Main layout shell — always horizontally centered, vertically centered when `center` is true */
function Screen({ children, center, onHome }: { children: React.ReactNode; center?: boolean; onHome?: () => void }) {
  return (
    <div className="min-h-dvh w-full flex justify-center">
      <div
        className={`flex flex-col w-full max-w-[480px] px-7 py-10 relative z-10 sm:max-w-[520px] sm:px-10 sm:py-14 ${
          center ? 'justify-center' : ''
        }`}
        style={{ animation: 'fadeUp 0.5s ease' }}
      >
        {onHome && (
          <button
            onClick={onHome}
            className="absolute top-4 right-4 z-20 text-white/30 hover:text-white/60 transition-colors p-2"
            title="Avslutt spillet"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

/** Compute progress % based on phase, total questions, and total power questions */
function getProgress(phase: string, totalQ: number, totalPQ: number): number {
  // Total steps: lagnavn(2) + quiz(totalQ) + power(totalPQ*2 for q+result) + voting + reveal + fasit + result
  const totalSteps = 2 + totalQ + totalPQ * 2 + 4;
  let step = 0;

  if (phase === 'role-reveal') return 3;
  if (phase === 'lagnavn' || phase === 'lagnavn-confirmed') return 6;

  // Build ordered phase list to compute position
  // Simpler: just compute a rough percentage based on what phase we're in
  const powerQMatch = phase.match(/^power-q-(\d+)$/);
  const powerRMatch = phase.match(/^power-result-(\d+)$/);
  const quizMatch = phase.match(/^quiz-(\d+)$/);

  if (quizMatch) {
    step = 3 + parseInt(quizMatch[1]);
  } else if (powerQMatch) {
    step = 3 + parseInt(powerQMatch[1]) * 2 + parseInt(powerQMatch[1]);
  } else if (powerRMatch) {
    step = 4 + parseInt(powerRMatch[1]) * 2 + parseInt(powerRMatch[1]);
  } else if (phase === 'voting') return 88;
  else if (phase === 'reveal') return 93;
  else if (phase === 'fasit') return 97;
  else if (phase === 'result') return 100;
  else return 2;

  return Math.min(85, Math.round(10 + (step / totalSteps) * 78));
}

// ============ SCREENS ============

function HomeScreen({ onCreateClick, onJoinClick }: { onCreateClick: () => void; onJoinClick: () => void }) {
  return (
    <Screen center>
      <Logo />
      <p className={`text-sm sm:text-base text-white/50 leading-relaxed text-center px-6 mt-8 mb-14 italic ${dm}`}>
        Kunnskap er makt, men bløff gjør samme nytte
      </p>
      <div className="space-y-4">
        <Btn onClick={onCreateClick}>OPPRETT ROM</Btn>
        <Btn variant="secondary" onClick={onJoinClick}>BLI MED I ROM</Btn>
      </div>

      <div className="mt-auto pt-14 text-center space-y-3">
        <p className="text-[9px] sm:text-[10px] tracking-[3px] text-white/50">
          Ide av Kristoffer Wergeland
        </p>
        <a href="https://saligkaos.no" target="_blank" rel="noopener noreferrer" className="inline-block opacity-50 hover:opacity-80 transition-opacity">
          <Image src="/icons/salig_kaos.png.webp" alt="Salig Kaos" width={100} height={28} />
        </a>
      </div>
    </Screen>
  );
}

function RulesScreen({
  game,
  onAdvance,
  onHome,
}: {
  game: GameView;
  onAdvance: () => void;
  onHome: () => void;
}) {
  const rules = [
    { icon: '1', title: 'Roller', text: 'Én spiller er Quizlingen (sabotør), resten er Trofaste. Bare Quizlingen vet hvem som er hvem.' },
    { icon: '2', title: 'Lagnavn', text: 'Laget velger et lagnavn. Quizlingen har en hemmelig kategori og prøver å påvirke valget.' },
    { icon: '3', title: 'Maktspørsmål', text: 'Alle svarer individuelt med et tall. Den som er nærmest vinner en maktpinne.' },
    { icon: '4', title: 'Fellesspørsmål', text: 'Laget diskuterer og én person skriver svaret. Quizlingen prøver å sabotere uten å bli avslørt.' },
    { icon: '5', title: 'Eliminering', text: 'Etter alle spørsmål stemmer laget på hvem de tror er Quizlingen.' },
  ];

  return (
    <Screen onHome={onHome}>
      <div className="text-center mb-8 mt-4">
        <Tag>Før vi begynner</Tag>
        <Title>SPILLREGLER</Title>
        <p className="text-sm text-white/50 mt-3">Les gjennom før rollene deles ut</p>
      </div>

      <div className="space-y-3">
        {rules.map((r, i) => (
          <Card key={i} style={{ animation: `fadeUp 0.3s ease ${i * 0.08}s both` }}>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-accent2/20 border border-accent2/30 flex items-center justify-center text-sm text-accent2 font-medium shrink-0">
                {r.icon}
              </div>
              <div>
                <div className={`${bebas} text-[18px] tracking-[2px] text-white mb-1`}>{r.title}</div>
                <div className="text-sm text-white/50 leading-relaxed">{r.text}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex-1" />
      <div className="mt-8">
        {game.isHost ? (
          <Btn onClick={onAdvance}>NESTE: ROLLEUTDELING</Btn>
        ) : (
          <Waiting text="Venter på at verten fortsetter" />
        )}
      </div>
    </Screen>
  );
}

function CreateScreen({
  onBack,
  onCreate,
  loading,
}: {
  onBack: () => void;
  onCreate: (name: string) => void;
  loading: boolean;
}) {
  const [name, setName] = useState('');
  return (
    <Screen center>
      <div className="text-center mb-10">
        <Tag>Nytt spill</Tag>
        <Title>OPPRETT ROM</Title>
      </div>
      <Input label="Ditt navn" value={name} onChange={setName} placeholder="Skriv inn navnet ditt" maxLength={20} />
      <div className="space-y-4 mt-8">
        <Btn onClick={() => onCreate(name)} disabled={!name.trim() || loading}>
          {loading ? 'OPPRETTER...' : 'OPPRETT ROM'}
        </Btn>
        <Btn variant="secondary" onClick={onBack}>TILBAKE</Btn>
      </div>
    </Screen>
  );
}

function JoinScreen({
  onBack,
  onJoin,
  loading,
  error,
}: {
  onBack: () => void;
  onJoin: (code: string, name: string) => void;
  loading: boolean;
  error: string | null;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  return (
    <Screen center>
      <div className="text-center mb-10">
        <Tag>Bli med</Tag>
        <Title>BLI MED I ROM</Title>
      </div>
      <Input label="Romkode (4 siffer)" value={code} onChange={setCode} placeholder="0000" maxLength={4} inputMode="numeric" large />
      <Input label="Ditt navn" value={name} onChange={setName} placeholder="Skriv inn navnet ditt" maxLength={20} />
      {error && <Alert type="danger">{error}</Alert>}
      <div className="space-y-4 mt-8">
        <Btn onClick={() => onJoin(code, name)} disabled={code.length !== 4 || !name.trim() || loading}>
          {loading ? 'KOBLER TIL...' : 'BLI MED'}
        </Btn>
        <Btn variant="secondary" onClick={onBack}>TILBAKE</Btn>
      </div>
    </Screen>
  );
}

function LobbyScreen({
  game,
  onStart,
  onSetMode,
  loading,
}: {
  game: GameView;
  onStart: () => void;
  onSetMode: (mode: 'short' | 'medium' | 'long') => void;
  loading: boolean;
}) {
  const canStart = game.players.length >= 3;
  const modes = [
    { id: 'short' as const, label: 'KORT', desc: '4 spørsmål, 2 makt' },
    { id: 'medium' as const, label: 'MEDIUM', desc: '6 spørsmål, 2 makt' },
    { id: 'long' as const, label: 'LANG', desc: '10 spørsmål, 3 makt' },
  ];
  return (
    <Screen>
      <RoomCode code={game.code} label="Romkode — del med alle" />

      <div className="flex justify-center mt-6 mb-8">
        <div className="inline-flex items-center gap-2 bg-white/[0.03] rounded-full px-4 py-2 border border-white/[0.06]">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-[blink_1.5s_ease-in-out_infinite]" />
          <span className="text-[10px] tracking-[3px] uppercase text-muted/60">Venter på spillere</span>
        </div>
      </div>

      <div className="text-center mb-5">
        <Tag>Spillere</Tag>
        <Title size="sm">LOBBY</Title>
        <p className="text-xs text-muted/50 mt-2 tracking-wide">
          {game.players.length} spiller{game.players.length !== 1 ? 'e' : ''} i rommet
        </p>
      </div>

      <PlayerList players={game.players} hostId={game.hostId} />

      {/* Mode selector - host only */}
      {game.isHost && (
        <div className="mt-6">
          <div className="text-[9px] tracking-[4px] uppercase text-muted/50 text-center mb-3">Spillmodus</div>
          <div className="flex gap-2">
            {modes.map(m => (
              <button
                key={m.id}
                onClick={() => onSetMode(m.id)}
                className={`flex-1 py-3 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                  game.mode === m.id
                    ? 'border-accent2/50 bg-accent2/[0.1]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10'
                }`}
              >
                <div className={`${bebas} text-[15px] tracking-[2px] ${game.mode === m.id ? 'text-white' : 'text-white/60'}`}>{m.label}</div>
                <div className="text-[9px] text-muted/40 mt-1">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1" />

      <div className="mt-8">
        {game.isHost ? (
          <>
            {!canStart && <Alert type="info">Du trenger minst 3 spillere for å starte.</Alert>}
            <Btn onClick={onStart} disabled={!canStart || loading}>
              {loading ? 'STARTER...' : 'START SPILLET'}
            </Btn>
          </>
        ) : (
          <Waiting text="Venter på at verten starter" />
        )}
      </div>
    </Screen>
  );
}

function RoleRevealScreen({
  game,
  playerId,
  onConfirm,
}: {
  game: GameView;
  playerId: string;
  onConfirm: () => void;
}) {
  const isQ = game.isQuizling;
  return (
    <Screen>
      <div className="text-center mb-8 mt-4">
        <Tag>Din rolle</Tag>
        <Title>DIN ROLLE</Title>
        <p className="text-xs text-muted/50 mt-2 tracking-wide">Ikke vis dette til andre!</p>
      </div>

      <Card glow className="text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,0,0,0.2)_0%,transparent_70%)] pointer-events-none" />
        <div className="flex justify-center mb-4 relative z-10" style={{ animation: 'scaleIn 0.5s ease 0.2s both' }}>
          <Image
            src={isQ ? '/icons/Quizling_Quizlingikon.png' : '/icons/Quizling_Trofastikon.png'}
            alt={isQ ? 'Quizling' : 'Trofast'}
            width={64}
            height={64}
          />
        </div>
        <div
          className={`${bebas} text-[42px] tracking-[5px] mb-3 relative z-10 ${isQ ? 'text-danger' : 'text-success'}`}
          style={{
            textShadow: isQ ? '0 0 30px rgba(255,68,68,0.4)' : '0 0 30px rgba(46,204,113,0.4)',
            animation: 'fadeUp 0.5s ease 0.3s both',
          }}
        >
          {isQ ? 'QUIZLING' : 'TROFAST'}
        </div>
        <p className="text-sm text-muted/70 leading-relaxed mb-5 relative z-10 px-2" style={{ animation: 'fadeUp 0.5s ease 0.4s both' }}>
          {isQ
            ? 'Under kan du lese fasiten og den hemmelige kategorien til lagnavnet. Sørg for at laget ditt gjør det så dårlig som mulig, uten å bli avslørt!'
            : 'Svar riktig på spørsmålene og eliminer Quizlingen!'}
        </p>
        {isQ && game.category && (
          <div className="bg-danger/[0.08] border border-danger/15 rounded-lg p-5 text-left relative z-10 space-y-4" style={{ animation: 'fadeUp 0.5s ease 0.5s both' }}>
            <div>
              <div className="text-[9px] tracking-[4px] uppercase text-muted/50 mb-1.5">Hemmelig kategori for lagnavn</div>
              <div className={`text-xl font-semibold text-danger ${bebas} tracking-[2px]`}>{game.category}</div>
            </div>
            {game.answerSheet && (
              <div>
                <div className="text-[9px] tracking-[4px] uppercase text-muted/50 mb-2">Fasit på quizspørsmålene</div>
                <div className="text-sm text-muted/80 leading-relaxed space-y-1">
                  {game.answerSheet.map((a, i) => (
                    <div key={i}><span className="text-white/40">Q{i + 1}:</span> {a}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="flex-1" />

      <div className="mt-8">
        {isQ && <Alert type="danger">Du er Quizlingen! Sabotér laget — men bli ikke avslørt!</Alert>}
        {game.confirmedRoles.includes(playerId) ? (
          <Btn variant="secondary" disabled>BEKREFTET</Btn>
        ) : (
          <Btn onClick={onConfirm}>JEG HAR LEST ROLLEN MIN</Btn>
        )}
        <p className="text-[10px] text-muted/40 text-center mt-4 tracking-[2px]">
          {game.confirmedRoles.length}/{game.totalPlayers} har bekreftet
        </p>
      </div>
    </Screen>
  );
}

function LagnavnScreen({
  game,
  onSubmit,
  onAdvance,
}: {
  game: GameView;
  onSubmit: (lagnavn: string) => void;
  onAdvance: () => void;
}) {
  const [lagnavn, setLagnavn] = useState('');
  const confirmed = game.phase === 'lagnavn-confirmed';

  return (
    <Screen>
      <Progress progress={getProgress(game.phase, game.totalQuestions, game.totalPowerQuestions ?? 2)} />
      <div className="text-center mb-8">
        <Tag>Steg 1</Tag>
        <Title>VELG LAGNAVN</Title>
        <p className="text-sm text-muted/50 mt-3 leading-relaxed px-4">
          Diskuter og bli enige om et lagnavn, men husk Quizlingen har en formening av hva lagnavnet skal være.
        </p>
      </div>

      {!confirmed ? (
        game.isHost ? (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <Alert type="info">Du er vert — skriv inn det dere blir enige om. Alle vil kunne se hva du skriver.</Alert>
            <Input label="Lagets navn" value={lagnavn} onChange={setLagnavn} placeholder="Lagets navn..." maxLength={30} />
            <Btn onClick={() => onSubmit(lagnavn)} disabled={!lagnavn.trim()}>BEKREFT LAGNAVN</Btn>
          </div>
        ) : (
          <Waiting text="Venter på at verten velger lagnavn" />
        )
      ) : (
        <div style={{ animation: 'scaleIn 0.4s ease' }}>
          <Card className="text-center mb-6">
            <div className="text-[9px] tracking-[5px] uppercase text-muted/50 mb-3">Lagets navn</div>
            <div className={`${bebas} text-[32px] tracking-[4px] text-white`}>
              {game.lagnavn}
            </div>
          </Card>
          {game.isHost ? (
            <Btn onClick={onAdvance}>NESTE: SPØRSMÅL 1</Btn>
          ) : (
            <Waiting text="Venter på verten" />
          )}
        </div>
      )}
    </Screen>
  );
}

function QuestionCard({ label, text }: { label: string; text: string }) {
  return (
    <Card className="border-t-2 border-t-accent2/50 mb-6">
      <div className="text-[9px] tracking-[4px] uppercase text-muted/50 mb-3">{label}</div>
      <div className="text-[17px] font-medium leading-relaxed text-white/90">{text}</div>
    </Card>
  );
}

function PowerQuestionScreen({
  game,
  playerId,
  onSubmit,
}: {
  game: GameView;
  playerId: string;
  onSubmit: (answer: number) => void;
}) {
  const [answer, setAnswer] = useState('');
  const roundMatch = game.phase.match(/^power-q-(\d+)$/);
  const round = roundMatch ? parseInt(roundMatch[1]) : 0;
  const pq = game.currentPowerQuestion;
  const hasAnswered = game.powerAnswers?.[round]?.[playerId] !== undefined;

  return (
    <Screen>
      <Progress progress={getProgress(game.phase, game.totalQuestions, game.totalPowerQuestions ?? 2)} />
      <div className="text-center mb-8">
        <Tag>Maktspørsmål {round + 1}</Tag>
        <Title>MAKTSPØRSMÅL</Title>
        <p className="text-sm text-muted/50 mt-3">Besvares individuelt! Nærmest vinner.</p>
      </div>

      {pq && <QuestionCard label={`Maktspørsmål ${pq.number} av ${game.totalPowerQuestions ?? 2}`} text={pq.question} />}

      {!hasAnswered ? (
        <div style={{ animation: 'fadeUp 0.3s ease' }}>
          <Input label="Ditt svar (tall)" value={answer} onChange={setAnswer} placeholder="Skriv tall..." type="number" inputMode="numeric" />
          <Btn onClick={() => onSubmit(Number(answer))} disabled={!answer}>SEND SVAR</Btn>
        </div>
      ) : (
        <Waiting text="Venter på alle svar" />
      )}
    </Screen>
  );
}

function PowerResultScreen({
  game,
  onChoosePin,
  onAdvance,
}: {
  game: GameView;
  onChoosePin: (pin: string) => void;
  onAdvance: () => void;
}) {
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const roundMatch = game.phase.match(/^power-result-(\d+)$/);
  const round = roundMatch ? parseInt(roundMatch[1]) : 0;
  const winnerId = game.powerWinners[round];
  const winner = game.players.find(p => p.id === winnerId);
  const isWinner = game.wonPowerRound === round;
  const answers = game.powerAnswers[round] ?? {};
  const correctAnswer = game.allPowerQuestions?.[round]?.answer;

  return (
    <Screen>
      <Progress progress={getProgress(game.phase, game.totalQuestions, game.totalPowerQuestions ?? 2)} />
      <div className="text-center mb-8 mt-4">
        <Tag>Resultat</Tag>
        <Title>MAKTPINNE</Title>
      </div>

      <Card className="text-center mb-6">
        <p className="text-xs text-muted/50 mb-3 tracking-wide">Vinneren er</p>
        <div className={`${bebas} text-[32px] tracking-[4px] text-gold`} style={{ textShadow: '0 0 20px rgba(201,168,76,0.3)' }}>
          {winner?.name ?? 'Ukjent'}
        </div>
      </Card>

      {/* Answer table */}
      <Card className="mb-6">
        <div className="text-[9px] tracking-[4px] uppercase text-muted/50 mb-4">Alle svar</div>
        {correctAnswer && (
          <div className="flex justify-between items-center pb-3 mb-3 border-b border-white/[0.06]">
            <span className="text-xs text-muted/50">Fasit</span>
            <span className={`${bebas} text-lg text-success`}>{correctAnswer}</span>
          </div>
        )}
        <div className="space-y-2">
          {game.players.map(p => {
            const ans = answers[p.id];
            const diff = ans !== undefined && correctAnswer ? ans - Number(correctAnswer) : null;
            return (
              <div key={p.id} className={`flex justify-between items-center py-1.5 ${p.id === winnerId ? 'text-gold' : 'text-white/70'}`}>
                <span className="text-sm">{p.name}{p.id === winnerId ? ' *' : ''}</span>
                <div className="flex items-center gap-3">
                  <span className={`${bebas} text-base`}>{ans ?? '—'}</span>
                  {diff !== null && (
                    <span className={`text-xs ${Math.abs(diff) === 0 ? 'text-success' : 'text-muted/40'}`}>
                      ({diff >= 0 ? '+' : ''}{diff})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {isWinner && !game.powerPins[winnerId] && (
        <div style={{ animation: 'fadeUp 0.4s ease' }}>
          <div className="text-center mb-5">
            <Tag>Velg maktpinne</Tag>
            <Title size="sm">DIN MAKT</Title>
          </div>
          <div className="space-y-3 mb-6">
            {[
              { id: 'blue', color: 'bg-[#3498db]', shadow: 'shadow-[0_0_12px_rgba(52,152,219,0.4)]', name: 'Blå pinne', desc: 'Se fasiten på det siste spørsmålet i quizen.' },
              { id: 'white', color: 'bg-white/80', shadow: 'shadow-[0_0_12px_rgba(255,255,255,0.3)]', name: 'Hvit pinne', desc: 'Se fasiten på det forrige spørsmålet laget svarte på.' },
            ].map(pin => (
              <div
                key={pin.id}
                className={`flex items-start gap-4 bg-white/[0.03] rounded-lg p-5 border cursor-pointer transition-all duration-200 ${
                  selectedPin === pin.id ? 'border-gold/40 bg-gold/[0.05]' : 'border-white/[0.05] hover:border-white/10'
                }`}
                onClick={() => setSelectedPin(pin.id)}
              >
                <div className={`w-7 h-7 rounded-full ${pin.color} ${pin.shadow} shrink-0 mt-0.5`} />
                <div className="flex-1">
                  <div className="font-medium text-[15px] mb-1 text-white/90">{pin.name}</div>
                  <div className="text-sm text-muted/50 leading-relaxed">{pin.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <Btn onClick={() => selectedPin && onChoosePin(selectedPin)} disabled={!selectedPin}>VELG PINNE</Btn>
        </div>
      )}

      <div className="flex-1" />

      <div className="mt-6">
        {game.isHost ? (
          <Btn onClick={onAdvance}>NESTE</Btn>
        ) : (
          <Waiting text="Venter" />
        )}
      </div>
    </Screen>
  );
}

function QuizQuestionScreen({
  game,
  playerId,
  onSubmit,
  onAdvance,
}: {
  game: GameView;
  playerId: string;
  onSubmit: (answer: string) => void;
  onAdvance: () => void;
}) {
  const [answer, setAnswer] = useState('');
  const q = game.currentQuestion;
  const qi = q ? q.number - 1 : 0;
  const answered = game.quizAnswers[qi] !== undefined;
  const totalQ = game.totalQuestions;

  return (
    <Screen>
      <Progress progress={getProgress(game.phase, totalQ, game.totalPowerQuestions ?? 2)} />
      <div className="text-center mb-8">
        <Tag>Spørsmål {q?.number ?? 1} av {totalQ}</Tag>
        <Title>FELLESSPØRSMÅL</Title>
        <p className="text-sm text-muted/50 mt-3">Diskuter i laget. Det er kun den som skriver som faktisk blir svart.</p>
      </div>

      {q && <QuestionCard label={`Spørsmål ${q.number} av ${totalQ}`} text={q.question} />}

      {/* Auto pin reveal */}
      {game.pinReveal && (
        <Alert type="warning">
          {game.myPin === 'blue'
            ? `Blå pinne: Fasiten på dette spørsmålet er «${game.pinReveal}»`
            : `Hvit pinne: Fasiten på forrige spørsmål var «${game.pinReveal}»`}
        </Alert>
      )}

      {!answered ? (
        game.isWriter ? (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <Alert type="warning">Du er skriveren! Bare du ser svaret.</Alert>
            <div className="mb-7">
              <label className="block text-[10px] sm:text-[11px] tracking-[4px] uppercase text-muted/80 mb-3 text-center">Lagets svar</label>
              <textarea
                className={`w-full bg-white/[0.04] border border-white/[0.08] rounded-md text-white ${dm} text-base sm:text-lg px-6 py-5 sm:px-7 sm:py-6 outline-none resize-none min-h-[120px] transition-all duration-200 focus:border-accent2/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(139,0,0,0.15)] placeholder:text-white/20`}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Skriv lagets svar..."
              />
            </div>
            <Btn onClick={() => onSubmit(answer)} disabled={!answer.trim()}>LEVER SVAR</Btn>
          </div>
        ) : (
          <Waiting text="Skriveren leverer svaret" />
        )
      ) : (
        <div style={{ animation: 'scaleIn 0.3s ease' }}>
          <Card className="text-center mb-6">
            <p className="text-xs text-muted/50 mb-2 tracking-wide">Levert svar</p>
            {game.isWriter ? (
              <p className="text-white font-medium text-base">{game.quizAnswers[qi]}</p>
            ) : (
              <p className="text-muted/60 text-sm italic">Svaret er levert</p>
            )}
          </Card>
          {game.isHost ? (
            <Btn onClick={onAdvance}>NESTE</Btn>
          ) : (
            <Waiting text="Venter på verten" />
          )}
        </div>
      )}
    </Screen>
  );
}

function VotingScreen({
  game,
  playerId,
  onVote,
}: {
  game: GameView;
  playerId: string;
  onVote: (targetId: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const hasVoted = game.votes[playerId] !== undefined;
  const totalVotes = Object.keys(game.votes).length;

  return (
    <Screen>
      <Progress progress={getProgress(game.phase, game.totalQuestions, game.totalPowerQuestions ?? 2)} />
      <div className="text-center mb-8">
        <Tag>Eliminering</Tag>
        <Title>ELIMINERING</Title>
        <p className="text-sm text-muted/50 mt-3">Hvem er Quizlingen?</p>
      </div>

      {!hasVoted ? (
        <>
          <div className="space-y-2.5 mb-6">
            {game.players.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-4 px-5 py-4 bg-white/[0.03] rounded-lg border cursor-pointer transition-all duration-200 ${
                  selected === p.id ? 'border-accent2/50 bg-accent2/[0.08]' : 'border-white/[0.05] hover:border-white/10'
                }`}
                onClick={() => setSelected(p.id)}
                style={{ animation: `fadeUp 0.3s ease ${i * 0.05}s both` }}
              >
                <div className="w-10 h-10 rounded-full bg-accent2/15 border border-accent2/25 flex items-center justify-center text-sm text-accent2/80 font-medium">
                  {p.name[0].toUpperCase()}
                </div>
                <span className="text-[15px] font-medium text-white/90">{p.name}</span>
                {selected === p.id && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-accent2 flex items-center justify-center">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
          <Btn onClick={() => selected && onVote(selected)} disabled={!selected}>STEM</Btn>
        </>
      ) : (
        <Waiting text={`Venter på alle stemmer (${totalVotes}/${game.totalPlayers})`} />
      )}
    </Screen>
  );
}

function RevealScreen({
  game,
  onAdvance,
}: {
  game: GameView;
  onAdvance: () => void;
}) {
  const quizling = game.players.find(p => p.id === game.quizlingId);

  const voteCounts: Record<string, number> = {};
  Object.values(game.votes).forEach(targetId => {
    voteCounts[targetId] = (voteCounts[targetId] ?? 0) + 1;
  });
  const maxVotes = Math.max(...Object.values(voteCounts), 0);
  const eliminated = Object.entries(voteCounts).find(([, c]) => c === maxVotes);
  const correctElimination = eliminated?.[0] === game.quizlingId;

  return (
    <Screen center>
      <div className="text-center" style={{ animation: 'scaleIn 0.6s ease' }}>
        <Tag>Avsløring</Tag>
        <Title>AVSLØRING</Title>
      </div>

      {eliminated && (
        <Card className="text-center mb-6 mt-8" style={{ animation: 'fadeUp 0.5s ease 0.3s both' }}>
          <div className="text-xs text-muted/40 mb-2 tracking-wide">Laget stemte ut</div>
          <div className={`${bebas} text-[28px] tracking-[4px]`}>
            {game.players.find(p => p.id === eliminated[0])?.name ?? 'Ingen'}
          </div>
          <div className="text-sm text-muted/50 mt-2">
            med {maxVotes} {maxVotes === 1 ? 'stemme' : 'stemmer'}
          </div>
        </Card>
      )}

      <Card glow className="text-center mb-6" style={{ animation: 'fadeUp 0.6s ease 0.8s both' }}>
        <div className="text-xs text-muted/40 mb-3 tracking-wide">Quizlingen var</div>
        <div className="flex justify-center mb-3">
          <Image src="/icons/Quizling_Quizlingikon.png" alt="Quizling" width={48} height={48} />
        </div>
        <div
          className={`${bebas} text-[36px] tracking-[5px] text-danger`}
          style={{ textShadow: '0 0 30px rgba(255,68,68,0.4)' }}
        >
          {quizling?.name ?? 'Ukjent'}
        </div>
        <div className={`mt-3 text-sm font-semibold ${correctElimination ? 'text-success' : 'text-danger'}`}>
          {correctElimination ? 'Laget fant Quizlingen!' : 'Quizlingen slapp unna!'}
        </div>
      </Card>

      <div className="mt-8" style={{ animation: 'fadeUp 0.4s ease 1.2s both' }}>
        {game.isHost ? (
          <Btn onClick={onAdvance}>SE FASIT</Btn>
        ) : (
          <Waiting text="Venter på verten" />
        )}
      </div>
    </Screen>
  );
}

function FasitScreen({
  game,
  onAdvance,
}: {
  game: GameView;
  onAdvance: () => void;
}) {
  return (
    <Screen>
      <Progress progress={getProgress(game.phase, game.totalQuestions, game.totalPowerQuestions ?? 2)} />
      <div className="text-center mb-8">
        <Tag>Fasit</Tag>
        <Title>SVARENE</Title>
      </div>

      <div className="space-y-3">
        {game.allQuestions?.map((q, i) => {
          const playerAnswer = game.quizAnswers[i];
          const correct = playerAnswer?.toLowerCase().includes(q.answer.toLowerCase());
          return (
            <Card key={i} className={`border-l-2 ${correct ? 'border-l-success/50' : 'border-l-danger/50'}`}>
              <div className="text-[9px] tracking-[4px] uppercase text-muted/40 mb-2">Spørsmål {i + 1}</div>
              <div className="text-[15px] font-medium text-white/90 mb-3">{q.question}</div>
              <div className="flex flex-col gap-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted/50 text-xs">Fasit:</span>
                  <span className="text-success font-medium">{q.answer}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted/50 text-xs">Lagets svar:</span>
                  <span className={correct ? 'text-success' : 'text-danger'}>
                    {playerAnswer ?? '—'}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex-1" />
      <div className="mt-8">
        {game.isHost ? (
          <Btn onClick={onAdvance}>SE RESULTAT</Btn>
        ) : (
          <Waiting text="Venter på verten" />
        )}
      </div>
    </Screen>
  );
}

function ResultScreen({
  game,
  onPlayAgain,
  onHome,
}: {
  game: GameView;
  onPlayAgain: () => void;
  onHome: () => void;
}) {
  let score = 0;

  game.allQuestions?.forEach((q, i) => {
    const ans = game.quizAnswers[i];
    if (ans && ans.toLowerCase().includes(q.answer.toLowerCase())) {
      score += 1;
    } else {
      score -= 1;
    }
  });

  const voteCounts: Record<string, number> = {};
  Object.values(game.votes).forEach(targetId => {
    voteCounts[targetId] = (voteCounts[targetId] ?? 0) + 1;
  });
  const maxVotes = Math.max(...Object.values(voteCounts), 0);
  const eliminated = Object.entries(voteCounts).find(([, c]) => c === maxVotes);
  if (eliminated) {
    score += eliminated[0] === game.quizlingId ? 3 : -3;
  }

  const trofasteWin = score >= 1;

  return (
    <Screen>
      <Progress progress={100} />

      <div className="text-center py-8" style={{ animation: 'scaleIn 0.5s ease' }}>
        <div className="flex justify-center mb-4">
          <Image
            src={trofasteWin ? '/icons/Quizling_Trofastikon.png' : '/icons/Quizling_Quizlingikon.png'}
            alt={trofasteWin ? 'Trofaste' : 'Quizling'}
            width={56}
            height={56}
          />
        </div>
        <div
          className={`${bebas} text-[44px] tracking-[5px] mb-2 ${trofasteWin ? 'text-success' : 'text-danger'}`}
          style={{ textShadow: trofasteWin ? '0 0 40px rgba(46,204,113,0.3)' : '0 0 40px rgba(255,68,68,0.3)' }}
        >
          {trofasteWin ? 'TROFASTE VINNER!' : 'QUIZLING VINNER!'}
        </div>
        <p className="text-sm text-muted/50">
          {trofasteWin ? 'Laget klarte oppdraget!' : 'Quizlingen lurte alle!'}
        </p>
      </div>

      <Card className="text-center mb-6" style={{ animation: 'fadeUp 0.4s ease 0.2s both' }}>
        <div className={`text-[10px] tracking-[4px] uppercase text-muted/40 mb-3 ${bebas}`}>Poengsum</div>
        <span className={`${bebas} text-[56px] leading-none ${score >= 0 ? 'text-success' : 'text-danger'}`}>
          {score >= 0 ? '+' : ''}{score}
        </span>
      </Card>

      <div className="space-y-4">
        {game.isHost ? (
          <Btn onClick={onPlayAgain}>NY RUNDE MED SAMME GJENG</Btn>
        ) : (
          <Waiting text="Venter på at verten starter ny runde" />
        )}
        <Btn variant="secondary" onClick={onHome}>AVSLUTT</Btn>
      </div>
    </Screen>
  );
}

// ============ MAIN APP ============

export default function GameApp() {
  const { session, gameState, error, loading, create, join, start, action, leave, playerId } = useGame();
  const [screen, setScreen] = useState<'home' | 'create' | 'join'>('home');

  if (session && gameState) {
    const phase = gameState.phase;

    if (phase === 'lobby') return <LobbyScreen game={gameState} onStart={start} onSetMode={(mode) => action('set-mode', { mode })} loading={loading} />;
    if (phase === 'rules') return <RulesScreen game={gameState} onAdvance={() => action('advance-phase')} onHome={leave} />;
    if (phase === 'role-reveal') return <RoleRevealScreen game={gameState} playerId={playerId!} onConfirm={() => action('confirm-role')} />;
    if (phase === 'lagnavn' || phase === 'lagnavn-confirmed') {
      return <LagnavnScreen game={gameState} onSubmit={(lagnavn) => action('submit-lagnavn', { lagnavn })} onAdvance={() => action('advance-phase')} />;
    }
    if (phase.startsWith('power-q-')) {
      return <PowerQuestionScreen game={gameState} playerId={playerId!} onSubmit={(answer) => action('submit-power-answer', { answer })} />;
    }
    if (phase.startsWith('power-result-')) {
      return <PowerResultScreen game={gameState} onChoosePin={(pin) => action('choose-pin', { pin })} onAdvance={() => action('advance-phase')} />;
    }
    if (phase.startsWith('quiz-')) {
      return <QuizQuestionScreen game={gameState} playerId={playerId!} onSubmit={(answer) => action('submit-quiz-answer', { answer })} onAdvance={() => action('advance-phase')} />;
    }
    if (phase === 'voting') return <VotingScreen game={gameState} playerId={playerId!} onVote={(targetId) => action('submit-vote', { targetId })} />;
    if (phase === 'reveal') return <RevealScreen game={gameState} onAdvance={() => action('advance-phase')} />;
    if (phase === 'fasit') return <FasitScreen game={gameState} onAdvance={() => action('advance-phase')} />;
    if (phase === 'result') return <ResultScreen game={gameState} onPlayAgain={() => action('restart-game')} onHome={leave} />;

    return <Spinner />;
  }

  if (screen === 'create') return <CreateScreen onBack={() => setScreen('home')} onCreate={(name) => create(name)} loading={loading} />;
  if (screen === 'join') return <JoinScreen onBack={() => setScreen('home')} onJoin={(code, name) => join(code, name)} loading={loading} error={error} />;

  return <HomeScreen onCreateClick={() => setScreen('create')} onJoinClick={() => setScreen('join')} />;
}
