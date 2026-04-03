'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useGame, GameView } from '@/lib/use-game';
import { isAnswerCorrect } from '@/lib/fuzzy-match';
import { APP_VERSION } from '@/lib/version';

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
      <div className="mb-3 flex justify-center">
        <Image
          src="/icons/Quizling_hovedikon.png"
          alt=""
          width={36}
          height={58}
          className="w-7 sm:w-8 h-auto opacity-80"
        />
      </div>
      <div className="mb-6 flex justify-center">
        <div className="w-12 h-px bg-gradient-to-r from-transparent via-accent2/60 to-transparent" />
      </div>
      <div className="flex justify-center">
        <Image
          src="/icons/QUIZLING_logo-WHITE-isolated.png"
          alt="Quizling"
          width={353}
          height={64}
          className="w-[clamp(220px,65vw,340px)] h-auto"
          priority
        />
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
    <span className="text-[11px] tracking-[5px] uppercase text-accent2 block mb-2">
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

function Card({ children, className = '', glow, style, onClick }: { children: React.ReactNode; className?: string; glow?: boolean; style?: React.CSSProperties; onClick?: () => void }) {
  return (
    <div className={`bg-white/[0.03] border border-white/[0.06] rounded-lg p-6 backdrop-blur-sm ${glow ? 'animate-[glowPulse_3s_ease-in-out_infinite]' : ''} ${className}`} style={style} onClick={onClick}>
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
function Screen({ children, center, onHome, onRestart, onManual }: { children: React.ReactNode; center?: boolean; onHome?: () => void; onRestart?: () => void; onManual?: () => void }) {
  return (
    <div className="min-h-dvh w-full flex justify-center">
      <div
        className={`flex flex-col w-full max-w-[480px] px-7 py-10 relative z-10 sm:max-w-[520px] sm:px-10 sm:py-14 ${
          center ? 'justify-center' : ''
        }`}
        style={{ animation: 'fadeUp 0.5s ease' }}
      >
        {(onRestart || onManual) && (
          <div className="absolute top-4 left-4 z-20 flex gap-2">
            {onManual && (
              <button onClick={onManual} className="text-white/50 hover:text-white/70 transition-colors p-2" title="Brukermanual">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </button>
            )}
            {onRestart && (
              <button onClick={onRestart} className="text-white/50 hover:text-white/70 transition-colors p-2" title="Begynn på nytt">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
              </button>
            )}
          </div>
        )}
        {onHome && (
          <button
            onClick={onHome}
            className="absolute top-4 right-4 z-20 text-white/50 hover:text-white/70 transition-colors p-2"
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

// ============ SCREENS ============

function BrukermanualModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-bg border border-white/10 rounded-xl p-6 max-w-[480px] w-full my-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
        <div className="text-center mb-6">
          <Tag>Guide</Tag>
          <Title size="sm">BRUKERMANUAL</Title>
        </div>
        <div className="space-y-4 text-sm text-white/70 leading-relaxed">
          <div>
            <h3 className="text-white font-medium mb-1">Hva er Quizling?</h3>
            <p>Quizling er et samarbeidsspill der laget svarer på quizspørsmål sammen. Samtidig skjuler det seg en Quizling blant spillerne – en sabotør som prøver å påvirke laget til å svare feil.</p>
          </div>
          <div>
            <h3 className="text-white font-medium mb-1">Starte et spill</h3>
            <p>Trykk «Opprett rom» for å opprette et nytt spillrom. Del den firesifrede romkoden med medspillerne dine. Minst 3 spillere trengs (maks 9).</p>
          </div>
          <div>
            <h3 className="text-white font-medium mb-1">Bli med</h3>
            <p>Trykk «Bli med i rom», skriv inn romkoden og navnet ditt.</p>
          </div>
          <div>
            <h3 className="text-white font-medium mb-1">Spillmodus</h3>
            <p>Verten velger kort (4 spørsmål), medium (6 spørsmål) eller lang (10 spørsmål) modus.</p>
          </div>
          <div>
            <h3 className="text-white font-medium mb-1">Maktpinne</h3>
            <p>Hvit: Se fasit på forrige spørsmål. Blå: Se fasit på siste spørsmål. Svart: Se lagets svar på forrige spørsmål.</p>
          </div>
        </div>
        <div className="mt-6">
          <Btn variant="secondary" onClick={onClose}>LUKK</Btn>
        </div>
      </div>
    </div>
  );
}

function HomeScreen({ onCreateClick, onJoinClick, onManual }: { onCreateClick: () => void; onJoinClick: () => void; onManual: () => void }) {
  const [showCredits, setShowCredits] = useState(false);

  return (
    <Screen center>
      {/* Credits icon — top right */}
      <button
        onClick={() => setShowCredits(true)}
        className="absolute top-4 right-4 z-20 p-2 text-white/50 hover:text-white/70 transition-colors cursor-pointer"
        title="Krediteringer"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="8.01"/>
          <line x1="12" y1="12" x2="12" y2="16"/>
        </svg>
      </button>

      {/* Credits modal */}
      {showCredits && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowCredits(false)}
        >
          <div
            className="bg-[#12030a] border border-white/[0.08] rounded-xl p-8 w-full max-w-xs text-center space-y-5"
            style={{ animation: 'scaleIn 0.2s ease', boxShadow: '0 0 60px rgba(139,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className={`${bebas} text-[22px] tracking-[4px] text-white/80`}>KREDITERINGER</div>
            <div className="space-y-3 text-[11px] tracking-[2px] text-white/50">
              <div>
                <div className="text-white/40 uppercase mb-0.5">Idé</div>
                <div>Kristoffer Wergeland</div>
              </div>
              <div>
                <div className="text-white/40 uppercase mb-0.5">Utvikling</div>
                <div>Peter Skoland</div>
              </div>
            </div>
            <div className="flex justify-center">
              <a href="https://saligkaos.no" target="_blank" rel="noopener noreferrer" className="opacity-40 hover:opacity-70 transition-opacity">
                <Image src="/icons/salig_kaos.png.webp" alt="Salig Kaos" width={90} height={25} />
              </a>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => setShowCredits(false)}
                className="mt-2 text-[10px] tracking-[3px] uppercase text-white/40 hover:text-white/60 transition-colors cursor-pointer"
              >
                Lukk
              </button>
            </div>
          </div>
        </div>
      )}

      <Logo />
      <p className={`text-sm sm:text-base text-white/50 leading-relaxed text-center px-6 mt-8 mb-10 italic ${dm}`}>
        Kunnskap er makt,<br />men bløff gjør samme nytte
      </p>
      <div className="flex justify-center mb-8">
        <button
          onClick={onManual}
          className="text-[10px] tracking-[3px] uppercase text-white/50 hover:text-white/70 transition-colors underline underline-offset-4 cursor-pointer"
        >
          Brukermanual
        </button>
      </div>
      <div className="space-y-4">
        <Btn onClick={onCreateClick}>OPPRETT ROM</Btn>
        <Btn variant="secondary" onClick={onJoinClick}>BLI MED I ROM</Btn>
      </div>

      <div className="mt-auto pt-14 flex flex-col items-center gap-4">
        <a
          href="https://www.youtube.com/watch?v=Ht9c5eVOIz4&list=PLP075BL7qEkbonoR39C8sm_8nCfE8Ao-d"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] sm:text-[11px] tracking-[2px] text-accent2/70 hover:text-accent2 transition-colors cursor-pointer"
        >
          Se sesong 1 av Quizling nå!
        </a>
        <a href="https://saligkaos.no" target="_blank" rel="noopener noreferrer" className="opacity-40 hover:opacity-70 transition-opacity">
          <Image src="/icons/salig_kaos.png.webp" alt="Salig Kaos" width={90} height={25} />
        </a>
        <span className="text-[9px] tracking-[2px] text-white/30">v{APP_VERSION}</span>
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
    { icon: '1', title: 'Roller', text: 'Én spiller (to spillere ved 5 spillere eller mer) er Quizlingen, resten er Trofaste. Bare Quizlingen vet hvem som er hvem.' },
    { icon: '2', title: 'Lagnavn', text: 'Laget må bli enige om et lagnavn. Velg ett av fem alternativer. Quizlingen har i oppdrag å få laget til å velge et bestemt alternativ.' },
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
          <div className="space-y-3">
            <Btn onClick={onAdvance}>NESTE: ROLLEUTDELING</Btn>
            <Btn variant="secondary" onClick={onAdvance}>HOPP OVER</Btn>
          </div>
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

function getQuizlingCountForDisplay(playerCount: number, mode: string): number {
  if (mode === 'short') return 1;
  if (playerCount >= 5) return 2;
  return 1;
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
  const shortDisabled = game.players.length > 5;
  const canStart = game.players.length >= 3 && !(game.mode === 'short' && shortDisabled);
  const modes = [
    { id: 'short' as const, label: 'KORT', desc: '4 spørsmål, 2 makt', disabled: shortDisabled },
    { id: 'medium' as const, label: 'MEDIUM', desc: '6 spørsmål, 2 makt', disabled: false },
    { id: 'long' as const, label: 'LANG', desc: '10 spørsmål, 3 makt', disabled: false },
  ];
  return (
    <Screen>
      <RoomCode code={game.code} label="Romkode" />

      <div className="flex justify-center mt-6 mb-8">
        <div className="inline-flex items-center gap-2 bg-white/[0.03] rounded-full px-4 py-2 border border-white/[0.06]">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-[blink_1.5s_ease-in-out_infinite]" />
          <span className="text-[10px] tracking-[3px] uppercase text-muted/60">Venter på spillere</span>
        </div>
      </div>

      <div className="text-center mb-5">
        <Tag>Spillere</Tag>
        <Title size="sm">LOBBY</Title>
        <p className="text-xs text-muted/70 mt-2 tracking-wide">
          {game.players.length} spiller{game.players.length !== 1 ? 'e' : ''} i rommet
        </p>
        <p className="text-xs text-accent2/50 mt-1 tracking-wide">
          {getQuizlingCountForDisplay(game.players.length, game.mode)} Quizling{getQuizlingCountForDisplay(game.players.length, game.mode) > 1 ? 'er' : ''} i spillet
        </p>
      </div>

      <PlayerList players={game.players} hostId={game.hostId} />

      {/* Mode selector - host only */}
      {game.isHost && (
        <div className="mt-6">
          <div className="text-[10px] tracking-[4px] uppercase text-muted/70 text-center mb-3">Spillmodus</div>
          <div className="flex gap-2">
            {modes.map(m => (
              <button
                key={m.id}
                onClick={() => !m.disabled && onSetMode(m.id)}
                disabled={m.disabled}
                className={`flex-1 py-3 px-2 rounded-lg border text-center transition-all ${
                  m.disabled
                    ? 'opacity-30 cursor-not-allowed'
                    : 'cursor-pointer'
                } ${
                  game.mode === m.id && !m.disabled
                    ? 'border-accent2/50 bg-accent2/[0.1]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/10'
                }`}
              >
                <div className={`${bebas} text-[15px] tracking-[2px] ${game.mode === m.id && !m.disabled ? 'text-white' : 'text-white/60'}`}>{m.label}</div>
                <div className="text-[9px] text-muted/60 mt-1">{m.disabled ? 'Maks 5 spillere' : m.desc}</div>
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
  const [showRole, setShowRole] = useState(false);
  const isQ = game.isQuizling;

  if (!showRole) {
    return (
      <Screen>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center mb-8">
            <Tag>Rollefordeling</Tag>
            <Title>GJØR DERE KLARE</Title>
          </div>

          <Card glow className="text-center w-full">
            <Alert type="warning">Skjul skjermen din fra de andre spillerne!</Alert>
          </Card>

          <div className="mt-8 w-full">
            <Btn onClick={() => setShowRole(true)}>VIS MIN ROLLE</Btn>
          </div>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="text-center mb-8 mt-4">
        <Tag>Hemmelig</Tag>
        <Title>ROLLEFORDELING</Title>
        <p className="text-xs text-muted/70 mt-2 tracking-wide">Følg med på din egen skjerm!</p>
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
            ? 'Du får fasiten på hvert spørsmål når det stilles. Sørg for at laget ditt gjør det så dårlig som mulig, uten å bli avslørt!'
            : 'Svar riktig på spørsmålene og eliminer Quizlingen!'}
        </p>
        {isQ && (
          <div className="bg-danger/[0.08] border border-danger/15 rounded-lg p-5 text-left relative z-10" style={{ animation: 'fadeUp 0.5s ease 0.5s both' }}>
            <div className="text-[10px] tracking-[4px] uppercase text-muted/70 mb-1.5">Lagnavn</div>
            <div className="text-sm text-muted/70 leading-relaxed">
              Du vil snart se hvilket lagnavn du må få laget til å velge!
            </div>
          </div>
        )}
      </Card>

      <div className="flex-1" />

      <div className="mt-8">
        {isQ && game.fellowQuizlings && game.fellowQuizlings.length > 0 && (
          <Alert type="danger">
            {game.fellowQuizlings.join(' og ')} har også rollen som Quizling
          </Alert>
        )}
        {isQ && <Alert type="danger">Du er Quizlingen. Lykke til – det trenger du.</Alert>}
        <Alert type="info">Alle må følge med på sin egen skjerm til alle har bekreftet rollen sin.</Alert>
        {game.confirmedRoles.includes(playerId) ? (
          <Btn variant="secondary" disabled>BEKREFTET</Btn>
        ) : (
          <Btn onClick={onConfirm}>JEG HAR LEST ROLLEN MIN</Btn>
        )}
        <p className="text-[10px] text-muted/60 text-center mt-4 tracking-[2px]">
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
  const [selected, setSelected] = useState<string | null>(null);
  const confirmed = game.phase === 'lagnavn-confirmed';
  const options = game.lagnavnOptions ?? [];

  return (
    <Screen>
      <div className="text-center mb-8">
        <Tag>Steg 1</Tag>
        <Title>VELG LAGNAVN</Title>
        <p className="text-sm text-muted/70 mt-3 leading-relaxed px-4">
          Laget må bli enige om et av lagnavnene. Diskuter og velg!
        </p>
      </div>

      {/* Quizling target hint - only visible to quizlings */}
      {game.isQuizling && game.quizlingLagnavnTarget && !confirmed && (
        <Alert type="danger">
          Du må få laget til å velge: <strong>{game.quizlingLagnavnTarget}</strong>
        </Alert>
      )}

      {!confirmed ? (
        <>
          <div className="space-y-2.5 mb-6">
            {options.map((name, i) => {
              const isTarget = game.isQuizling && name === game.quizlingLagnavnTarget;
              return (
                <div
                  key={i}
                  className={`px-5 py-4 bg-white/[0.03] rounded-lg border cursor-pointer transition-all duration-200 text-center ${
                    selected === name
                      ? 'border-accent2/50 bg-accent2/[0.08]'
                      : isTarget
                        ? 'border-danger/30 bg-danger/[0.04]'
                        : 'border-white/[0.05] hover:border-white/10'
                  }`}
                  onClick={() => game.isHost && setSelected(name)}
                  style={{ animation: `fadeUp 0.3s ease ${i * 0.05}s both` }}
                >
                  <span className={`${bebas} text-[20px] tracking-[3px] ${
                    selected === name ? 'text-white' : 'text-white/70'
                  }`}>
                    {name}
                  </span>
                  {isTarget && (
                    <div className="text-[9px] text-danger/60 mt-1 tracking-[2px] uppercase">Ditt mål</div>
                  )}
                </div>
              );
            })}
          </div>
          {game.isHost ? (
            <Btn onClick={() => selected && onSubmit(selected)} disabled={!selected}>
              BEKREFT LAGNAVN
            </Btn>
          ) : (
            <Waiting text="Diskuter og vent på at verten velger" />
          )}
        </>
      ) : (
        <div style={{ animation: 'scaleIn 0.4s ease' }}>
          <Card className="text-center mb-6">
            <div className="text-[10px] tracking-[5px] uppercase text-muted/70 mb-3">Lagets navn</div>
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
      <div className="text-[10px] tracking-[4px] uppercase text-muted/70 mb-3">{label}</div>
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
      <div className="text-center mb-8">
        <Tag>Maktspørsmål {round + 1}</Tag>
        <Title>MAKTSPØRSMÅL</Title>
        <p className="text-sm text-muted/70 mt-3">Besvares individuelt! Den som svarer nærmest vinner.</p>
      </div>

      <Card className="mb-4 border-l-2 border-l-gold/40">
        <div className="text-sm text-muted/60 leading-relaxed space-y-1.5">
          <p>Alle svarer individuelt med et tall.</p>
          <p>Den som svarer nærmest vinner en <span className="text-gold/80 font-medium">maktpinne</span> som kan gi fordeler i quizen.</p>
        </div>
      </Card>

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
  const isWinner = game.wonCurrentPowerRound === true;
  const answers = game.powerAnswers[round] ?? {};
  const correctAnswer = game.allPowerQuestions?.[round]?.answer;

  return (
    <Screen>
      <div className="text-center mb-8 mt-4">
        <Tag>Resultat</Tag>
        <Title>MAKTPINNE</Title>
      </div>

      <Card className="text-center mb-6">
        <p className="text-xs text-muted/70 mb-3 tracking-wide">Vinneren er</p>
        <div className={`${bebas} text-[32px] tracking-[4px] text-gold`} style={{ textShadow: '0 0 20px rgba(201,168,76,0.3)' }}>
          {winner?.name ?? 'Ukjent'}
        </div>
      </Card>

      {/* Answer table */}
      <Card className="mb-6">
        <div className="text-[10px] tracking-[4px] uppercase text-muted/70 mb-4">Alle svar</div>
        {correctAnswer && (
          <div className="flex justify-between items-center pb-3 mb-3 border-b border-white/[0.06]">
            <span className="text-xs text-muted/70">Fasit</span>
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
                    <span className={`text-xs ${Math.abs(diff) === 0 ? 'text-success' : 'text-muted/60'}`}>
                      ({diff >= 0 ? '+' : ''}{diff})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {isWinner && game.powerPins[round] === undefined && (
        <div style={{ animation: 'fadeUp 0.4s ease' }}>
          <div className="text-center mb-5">
            <Tag>Velg maktpinne</Tag>
            <Title size="sm">DIN MAKT</Title>
          </div>
          <div className="space-y-3 mb-6">
            {[
              { id: 'blue', color: 'bg-[#3498db]', shadow: 'shadow-[0_0_12px_rgba(52,152,219,0.4)]', name: 'Blå pinne', desc: 'Se fasiten på det siste spørsmålet i quizen.' },
              { id: 'white', color: 'bg-white/80', shadow: 'shadow-[0_0_12px_rgba(255,255,255,0.3)]', name: 'Hvit pinne', desc: 'Se fasiten på forrige spørsmål (ikke svaret som ble avlevert). Bruk én gang.' },
              { id: 'black', color: 'bg-[#1a1a2e]', shadow: 'shadow-[0_0_12px_rgba(26,26,46,0.6)]', name: 'Svart pinne', desc: 'Se hva laget svarte på et valgfritt spørsmål. Brukes før eliminering.' },
            ].filter(pin => {
              if (pin.id === 'black' && !game.isLastPowerRound) return false;
              if (game.usedPinTypes?.includes(pin.id)) return false;
              return true;
            }).map(pin => (
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
                  <div className="text-sm text-muted/70 leading-relaxed">{pin.desc}</div>
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
          <Btn onClick={onAdvance} disabled={!!(winnerId && game.powerPins[round] === undefined)}>
            {winnerId && game.powerPins[round] === undefined ? 'VENTER PÅ VALG' : 'NESTE'}
          </Btn>
        ) : (
          <Waiting text="Venter på valg" />
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
  onUsePin,
}: {
  game: GameView;
  playerId: string;
  onSubmit: (answer: string) => void;
  onAdvance: () => void;
  onUsePin: () => void;
}) {
  const [answer, setAnswer] = useState('');
  const [editing, setEditing] = useState(false);
  const q = game.currentQuestion;
  const qi = q ? q.number - 1 : 0;
  const answered = game.quizAnswers[qi] !== undefined && !editing;
  const totalQ = game.totalQuestions;

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!game.questionStartedAt) return;
    const tick = () => setElapsed(Math.floor((Date.now() - game.questionStartedAt!) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [game.questionStartedAt]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <Screen>
      <div className="text-center mb-8">
        <Tag>Spørsmål {q?.number ?? 1} av {totalQ}</Tag>
        <Title>FELLESSPØRSMÅL</Title>
        <p className="text-sm text-muted/70 mt-3">Diskuter i laget og bli enige om et svar. Bare én av dere vet hva som faktisk leveres.</p>
        {game.questionStartedAt && !answered && (
          <div className="text-[10px] tracking-[2px] text-muted/60 mt-2">
            {minutes > 0 ? `${minutes}m ${seconds.toString().padStart(2, '0')}s` : `${seconds}s`}
          </div>
        )}
      </div>

      {q && <QuestionCard label={`Spørsmål ${q.number} av ${totalQ}`} text={q.question} />}

      {game.isQuizling && game.currentAnswerForQuizling && (
        <Alert type="danger">
          Fasiten: {game.currentAnswerForQuizling}
        </Alert>
      )}

      {/* Pin: auto-reveal for blue, on-demand button for white/black */}
      {game.pinReveal && (
        <Alert type="warning">
          {game.pinType === 'blue'
            ? `Blå pinne: Fasiten på dette spørsmålet er «${game.pinReveal}»`
            : game.pinType === 'white'
            ? `Hvit pinne: Fasiten på forrige spørsmål var «${game.pinReveal}»`
            : `Svart pinne: Laget svarte «${game.pinReveal}» på forrige spørsmål`}
        </Alert>
      )}
      {game.canUsePin && game.myPin === 'white' && (
        <div className="mb-4" style={{ animation: 'fadeUp 0.3s ease' }}>
          {qi === totalQ - 1 && (
            <div className="text-[11px] text-gold/70 text-center mb-2 tracking-[1px]">
              Siste sjanse til å bruke pinnen!
            </div>
          )}
          <button
            onClick={() => onUsePin()}
            className={`w-full py-3 px-5 rounded-lg border ${qi === totalQ - 1 ? 'border-gold/60 bg-gold/[0.12] animate-[glowPulse_3s_ease-in-out_infinite]' : 'border-gold/40 bg-gold/[0.08]'} text-gold/90 text-sm ${bebas} tracking-[2px] cursor-pointer hover:bg-gold/[0.15] transition-all`}
          >
            BRUK HVIT PINNE — SE FASIT PÅ FORRIGE
          </button>
        </div>
      )}

      {!answered ? (
        game.isWriter ? (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <Alert type="warning">Du skriver svaret. De andre må stole på deg.</Alert>
            <div className="mb-7">
              <label className="block text-[10px] sm:text-[11px] tracking-[4px] uppercase text-muted/80 mb-3 text-center">Lagets svar</label>
              <textarea
                className={`w-full bg-white/[0.04] border border-white/[0.08] rounded-md text-white ${dm} text-base sm:text-lg px-6 py-5 sm:px-7 sm:py-6 outline-none resize-none min-h-[120px] transition-all duration-200 focus:border-accent2/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(139,0,0,0.15)] placeholder:text-white/20`}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Skriv lagets svar..."
              />
            </div>
            <Btn onClick={() => { onSubmit(answer); setEditing(false); }} disabled={!answer.trim()}>LEVER SVAR</Btn>
          </div>
        ) : (
          <Waiting text={`${game.players.find(p => p.id === game.writerId)?.name ?? 'Skriveren'} skriver svaret`} />
        )
      ) : (
        <div style={{ animation: 'scaleIn 0.3s ease' }}>
          <Card className="text-center mb-6">
            <p className="text-xs text-muted/70 mb-2 tracking-wide">Levert svar</p>
            {game.isWriter ? (
              <>
                <p className="text-white font-medium text-base">{game.quizAnswers[qi]}</p>
                <button
                  onClick={() => { setAnswer(game.quizAnswers[qi] || ''); setEditing(true); }}
                  className="mt-3 text-xs text-muted/60 hover:text-white/80 underline underline-offset-2 cursor-pointer transition-colors"
                >
                  Endre svar
                </button>
              </>
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
  onUseBlackPin,
}: {
  game: GameView;
  playerId: string;
  onVote: (targetIds: string[]) => void;
  onUseBlackPin: (questionIndex: number) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const myVotes = game.votes[playerId];
  const hasVoted = Array.isArray(myVotes) && myVotes.length > 0;
  const totalVotes = Object.values(game.votes).filter(v => Array.isArray(v) && v.length > 0).length;

  return (
    <Screen>
      <div className="text-center mb-8">
        <Tag>Eliminering</Tag>
        <Title>ELIMINERING</Title>
        <p className="text-sm text-muted/70 mt-3">
          {game.quizlingCount > 1 ? `Hvem er de ${game.quizlingCount} Quizlingene?` : 'Hvem er Quizlingen?'}
        </p>
        <p className="text-xs text-muted/60 mt-2 tracking-wide">
          Velg {game.quizlingCount} {game.quizlingCount > 1 ? 'spillere' : 'spiller'}
        </p>
      </div>

      {/* Black pin: choose which question to see team answer for */}
      {game.canUsePin && game.myPin === 'black' && (
        <Card className="mb-6 border-l-2 border-l-gold/40" style={{ animation: 'fadeUp 0.3s ease' }}>
          <div className={`text-[10px] tracking-[4px] uppercase text-gold/70 mb-3 ${bebas}`}>Svart maktpinne</div>
          <p className="text-sm text-muted/60 mb-4">Velg et spørsmål for å se lagets svar:</p>
          <div className="space-y-2">
            {Array.from({ length: game.totalQuestions }, (_, i) => (
              <button
                key={i}
                onClick={() => onUseBlackPin(i)}
                className="w-full text-left px-4 py-3 bg-white/[0.03] rounded border border-white/[0.06] hover:border-gold/30 hover:bg-gold/[0.05] transition-all cursor-pointer"
              >
                <span className="text-[10px] tracking-[2px] uppercase text-muted/60">Spørsmål {i + 1}</span>
                <p className="text-sm text-white/70 mt-0.5 leading-snug">{game.questionTexts?.[i] ?? `Spørsmål ${i + 1}`}</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Black pin reveal */}
      {game.blackPinReveal && game.blackPinQuestionIndex !== undefined && (
        <Alert type="warning">
          Svart pinne: «{game.questionTexts?.[game.blackPinQuestionIndex] ?? `Spørsmål ${game.blackPinQuestionIndex + 1}`}» — Lagets svar: «{game.blackPinReveal}»
        </Alert>
      )}

      {!hasVoted ? (
        <>
          <div className="space-y-2.5 mb-6">
            {game.players.filter(p => p.id !== playerId).map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-4 px-5 py-4 bg-white/[0.03] rounded-lg border cursor-pointer transition-all duration-200 ${
                  selected.includes(p.id) ? 'border-accent2/50 bg-accent2/[0.08]' : 'border-white/[0.05] hover:border-white/10'
                }`}
                onClick={() => setSelected(prev =>
                  prev.includes(p.id)
                    ? prev.filter(id => id !== p.id)
                    : prev.length < game.quizlingCount
                      ? [...prev, p.id]
                      : prev
                )}
                style={{ animation: `fadeUp 0.3s ease ${i * 0.05}s both` }}
              >
                <div className="w-10 h-10 rounded-full bg-accent2/15 border border-accent2/25 flex items-center justify-center text-sm text-accent2/80 font-medium">
                  {p.name[0].toUpperCase()}
                </div>
                <span className="text-[15px] font-medium text-white/90">{p.name}</span>
                {selected.includes(p.id) && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-accent2 flex items-center justify-center">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
          <Btn onClick={() => selected.length === game.quizlingCount && onVote(selected)} disabled={selected.length !== game.quizlingCount}>
            STEM ({selected.length}/{game.quizlingCount})
          </Btn>
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
  onAdvanceRevealStep,
}: {
  game: GameView;
  onAdvance: () => void;
  onAdvanceRevealStep: () => void;
}) {
  const step = game.revealStep ?? 0;
  const quizlingIds = game.quizlingIds ?? [];
  const quizlingCount = game.quizlingCount ?? 1;
  const quizlings = game.players.filter(p => quizlingIds.includes(p.id));

  const voteCounts: Record<string, number> = {};
  Object.values(game.votes).forEach(targetIds => {
    targetIds.forEach(targetId => {
      voteCounts[targetId] = (voteCounts[targetId] ?? 0) + 1;
    });
  });

  const sorted = Object.entries(voteCounts).sort(([, a], [, b]) => b - a);
  const eliminated: [string, number][] = [];
  for (let i = 0; i < sorted.length && eliminated.length < quizlingCount; i++) {
    if (eliminated.length === quizlingCount - 1) {
      const tiedCount = sorted.filter(([, c]) => c === sorted[i][1]).length;
      const alreadyAtThisCount = eliminated.filter(([, c]) => c === sorted[i][1]).length;
      if (tiedCount - alreadyAtThisCount > 1) break;
    }
    eliminated.push(sorted[i]);
  }

  const eliminatedIds = eliminated.map(([id]) => id);
  const eliminatedPlayers = eliminated.map(([id, votes]) => ({
    player: game.players.find(p => p.id === id),
    votes,
    isQuizling: quizlingIds.includes(id),
  }));
  const correctlyEliminated = eliminatedIds.filter(id => quizlingIds.includes(id));
  const hasElimination = eliminated.length > 0;

  // Check if quizling's lagnavn matched the real lagnavn
  const quizlingSucceededLagnavn = game.lagnavn ? true : false;

  const isMulti = quizlingCount > 1;

  return (
    <Screen center>
      <div className="text-center" style={{ animation: 'scaleIn 0.6s ease' }}>
        <Tag>Avsløring</Tag>
        <Title>AVSLØRING</Title>
      </div>

      {/* Step 0: Hidden elimination name */}
      {step === 0 && (
        <Card className="text-center mb-6 mt-8" style={{ animation: 'fadeUp 0.5s ease 0.3s both' }}>
          <div className="text-xs text-muted/60 mb-2 tracking-wide">
            {hasElimination ? (isMulti ? 'De som ble eliminert er...' : 'Den som ble eliminert er...') : 'Resultat av avstemningen...'}
          </div>
          <div className={`${bebas} text-[36px] tracking-[5px] text-white/20`}>???</div>
        </Card>
      )}

      {/* Step 1: Show eliminated players */}
      {step >= 1 && (
        <>
          {hasElimination ? (
            <Card className="text-center mb-6 mt-8" style={{ animation: step === 1 ? 'fadeUp 0.5s ease 0.1s both' : undefined }}>
              <div className="text-xs text-muted/60 mb-2 tracking-wide">Laget stemte ut</div>
              {eliminatedPlayers.map(({ player, votes }) => (
                <div key={player?.id ?? 'unknown'} className="mb-2">
                  <div className={`${bebas} text-[28px] tracking-[4px]`}>
                    {player?.name ?? 'Ukjent'}
                  </div>
                  <div className="text-sm text-muted/70">
                    med {votes} {votes === 1 ? 'stemme' : 'stemmer'}
                  </div>
                </div>
              ))}
            </Card>
          ) : (
            <Card className="text-center mb-6 mt-8" style={{ animation: step === 1 ? 'fadeUp 0.5s ease 0.1s both' : undefined }}>
              <div className="text-xs text-muted/60 mb-2 tracking-wide">Ingen ble stemt ut</div>
              <div className={`${bebas} text-[22px] tracking-[3px] text-danger`}>
                Stemmene var delte — ingen eliminering!
              </div>
              <div className="text-sm text-muted/70 mt-2">
                {isMulti ? 'Quizlingene slipper unna med -3 poeng per stykk for laget' : 'Quizlingen slipper unna med -3 poeng for laget'}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Step 2: Hidden quizling name */}
      {step === 2 && (
        <Card glow className="text-center mb-6" style={{ animation: 'fadeUp 0.5s ease 0.1s both' }}>
          <div className="text-xs text-muted/60 mb-3 tracking-wide">{isMulti ? 'Quizlingene er...' : 'Quizlingen er...'}</div>
          <div className="flex justify-center mb-3">
            <Image src="/icons/Quizling_hovedikon.png" alt="Quizling" width={48} height={48} className="opacity-30" />
          </div>
          <div className={`${bebas} text-[36px] tracking-[5px] text-white/20`}>???</div>
        </Card>
      )}

      {/* Step 3+: Quizlings revealed */}
      {step >= 3 && (
        <Card glow className="text-center mb-6" style={{ animation: step === 3 ? 'fadeUp 0.6s ease 0.1s both' : undefined }}>
          <div className="text-xs text-muted/60 mb-3 tracking-wide">{isMulti ? 'Quizlingene var' : 'Quizlingen var'}</div>
          <div className="flex justify-center mb-3">
            <Image src="/icons/Quizling_hovedikon.png" alt="Quizling" width={48} height={48} />
          </div>
          <div
            className={`${bebas} text-[36px] tracking-[5px] text-danger`}
            style={{ textShadow: '0 0 30px rgba(255,68,68,0.4)' }}
          >
            {quizlings.map(q => q.name).join(', ') || 'Ukjent'}
          </div>
          <div className={`mt-3 text-sm font-semibold ${correctlyEliminated.length === quizlingCount ? 'text-success' : 'text-danger'}`}>
            {correctlyEliminated.length === quizlingCount
              ? (isMulti ? 'Laget fant alle Quizlingene!' : 'Laget fant Quizlingen!')
              : hasElimination
                ? (correctlyEliminated.length > 0
                  ? `Laget fant ${correctlyEliminated.length} av ${quizlingCount} ${isMulti ? 'Quizlinger' : 'Quizlingen'}!`
                  : (isMulti ? 'Quizlingene slapp unna!' : 'Quizlingen slapp unna!'))
                : (isMulti ? 'Ingen ble eliminert — Quizlingene vant avstemningen!' : 'Ingen ble eliminert — Quizlingen vant avstemningen!')}
          </div>
        </Card>
      )}

      {/* Step 4: Lagnavn + category card */}
      {step >= 4 && (
        <Card className="text-center mb-6" style={{ animation: step === 4 ? 'fadeUp 0.5s ease 0.1s both' : undefined }}>
          <div className="text-xs text-muted/60 mb-2 tracking-wide">Lagnavn</div>
          <div className={`${bebas} text-[24px] tracking-[3px] mb-3`}>
            {game.lagnavn ?? 'Ikke valgt'}
          </div>
          {game.quizlingLagnavnTarget && (
            <>
              <div className="w-full h-px bg-white/[0.06] my-3" />
              <div className="text-xs text-muted/60 mb-2 tracking-wide">Quizlingen skulle få laget til å velge</div>
              <div className={`${bebas} text-[20px] tracking-[2px] text-accent2`}>
                {game.quizlingLagnavnTarget}
              </div>
              <div className={`text-sm mt-2 font-semibold ${game.quizlingLagnavnSuccess ? 'text-danger' : 'text-success'}`}>
                {game.quizlingLagnavnSuccess ? 'Quizlingen klarte det!' : 'Quizlingen klarte det ikke!'}
              </div>
            </>
          )}
        </Card>
      )}

      {/* Advance button */}
      <div className="mt-8" style={{ animation: 'fadeUp 0.4s ease 0.3s both' }}>
        {step >= 4 ? (
          game.isHost ? (
            <Btn onClick={onAdvance}>SE RESULTAT</Btn>
          ) : (
            <Waiting text="Venter på verten" />
          )
        ) : (
          game.isHost ? (
            <Btn onClick={onAdvanceRevealStep}>NESTE</Btn>
          ) : (
            <Waiting text="Venter på verten" />
          )
        )}
      </div>
    </Screen>
  );
}

function FasitScreen({
  game,
  onAdvance,
  onRevealQuestion,
}: {
  game: GameView;
  onAdvance: () => void;
  onRevealQuestion: () => void;
}) {
  const revealedCount = game.fasitRevealCount ?? 0;
  const totalQ = game.allQuestions?.length ?? 0;
  // 3 steps per question: 0=question only, 1=+fasit, 2=+team answer
  const questionIndex = Math.floor(revealedCount / 3);
  const stepInQuestion = revealedCount % 3; // 0, 1, or 2
  const allRevealed = questionIndex >= totalQ;

  return (
    <Screen>
      <div className="text-center mb-8">
        <Tag>Fasit</Tag>
        <Title>SVARENE</Title>
        <p className="text-sm text-muted/70 mt-3">
          {game.isHost ? 'Trykk for å avsløre hvert spørsmål' : 'Verten avslører spørsmålene'}
        </p>
      </div>

      <div className="space-y-3">
        {game.allQuestions?.map((q, i) => {
          if (i > questionIndex) return null;

          const fullyRevealed = i < questionIndex;
          const isCurrent = i === questionIndex && !allRevealed;
          const playerAnswer = game.quizAnswers[i];
          const correct = isAnswerCorrect(playerAnswer, q.answer);

          // Determine what to show for this question
          const showFasit = fullyRevealed || (isCurrent && stepInQuestion >= 1);
          const showTeamAnswer = fullyRevealed || (isCurrent && stepInQuestion >= 2);
          const isClickable = isCurrent && game.isHost;

          // What does the next click prompt say?
          let clickPrompt = '';
          if (isCurrent) {
            if (stepInQuestion === 0) clickPrompt = 'TRYKK FOR Å SE FASIT';
            else if (stepInQuestion === 1) clickPrompt = 'TRYKK FOR Å SE LAGETS SVAR';
            else clickPrompt = 'TRYKK FOR NESTE SPØRSMÅL';
          }

          return (
            <Card
              key={i}
              className={`border-l-2 ${showTeamAnswer ? (correct ? 'border-l-success/50' : 'border-l-danger/50') : showFasit ? 'border-l-gold/40' : 'border-l-white/20'} ${isClickable ? 'cursor-pointer hover:bg-white/[0.05]' : ''} transition-colors`}
              style={isCurrent && stepInQuestion > 0 ? { animation: 'fadeUp 0.3s ease' } : undefined}
              onClick={isClickable ? onRevealQuestion : undefined}
            >
              <div className="text-[10px] tracking-[4px] uppercase text-muted/60 mb-2">Spørsmål {i + 1}</div>
              <div className="text-[15px] font-medium text-white/90 mb-3">{q.question}</div>
              <div className="flex flex-col gap-1.5 text-sm">
                {showFasit && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted/70 text-xs">Fasit:</span>
                    <span className="text-success font-medium">{q.answer}</span>
                  </div>
                )}
                {showTeamAnswer && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted/70 text-xs">Lagets svar:</span>
                    <span className={correct ? 'text-success' : 'text-danger'}>{playerAnswer ?? '—'}</span>
                  </div>
                )}
              </div>
              {isClickable && game.isHost && (
                <div className={`text-xs text-accent2/60 mt-3 ${bebas} tracking-[2px]`}>{clickPrompt}</div>
              )}
              </Card>
            );
        })}
      </div>

      <div className="flex-1" />
      <div className="mt-8">
        {game.isHost ? (
          <Btn onClick={onAdvance} disabled={!allRevealed}>
            {allRevealed ? 'NESTE: AVSLØRING' : `AVSLØR ALLE SPØRSMÅL FØRST (${questionIndex}/${totalQ})`}
          </Btn>
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
  const quizlingIds = game.quizlingIds ?? [];
  const quizlingCount = game.quizlingCount ?? 1;
  const isMulti = quizlingCount > 1;

  const questionResults = game.allQuestions?.map((q, i) => {
    const ans = game.quizAnswers[i];
    const correct = ans ? isAnswerCorrect(ans, q.answer) : false;
    if (correct) {
      score += 1;
    } else {
      score -= 1;
    }
    return { question: q.question, answer: q.answer, playerAnswer: ans, correct };
  }) ?? [];

  const voteCounts: Record<string, number> = {};
  Object.values(game.votes).forEach(targetIds => {
    targetIds.forEach(targetId => {
      voteCounts[targetId] = (voteCounts[targetId] ?? 0) + 1;
    });
  });

  const sorted = Object.entries(voteCounts).sort(([, a], [, b]) => b - a);
  const eliminated: [string, number][] = [];
  for (let i = 0; i < sorted.length && eliminated.length < quizlingCount; i++) {
    if (eliminated.length === quizlingCount - 1) {
      const tiedCount = sorted.filter(([, c]) => c === sorted[i][1]).length;
      const alreadyAtThisCount = eliminated.filter(([, c]) => c === sorted[i][1]).length;
      if (tiedCount - alreadyAtThisCount > 1) break;
    }
    eliminated.push(sorted[i]);
  }

  const eliminatedIds = eliminated.map(([id]) => id);
  const correctlyEliminated = eliminatedIds.filter(id => quizlingIds.includes(id));
  const wronglyEliminated = eliminatedIds.filter(id => !quizlingIds.includes(id));
  const escapedQuizlings = quizlingIds.filter(id => !eliminatedIds.includes(id));

  score += correctlyEliminated.length * 3;
  score -= escapedQuizlings.length * 3;
  void wronglyEliminated; // no extra penalty — quizling escaping already covers this

  // Lagnavn scoring: +1 if quizling failed to get their target, -1 if they succeeded
  if (game.quizlingLagnavnSuccess === true) {
    score -= 1;
  } else if (game.quizlingLagnavnSuccess === false) {
    score += 1;
  }

  const quizlings = game.players.filter(p => quizlingIds.includes(p.id));
  const trofasteWin = score >= 1;

  return (
    <Screen>

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
          {trofasteWin ? 'TROFASTE VINNER!' : (isMulti ? 'QUIZLINGENE VINNER!' : 'QUIZLING VINNER!')}
        </div>
        <p className="text-sm text-muted/70">
          {trofasteWin ? 'Laget klarte oppdraget!' : (isMulti ? 'Quizlingene lurte alle!' : 'Quizlingen lurte alle!')}
        </p>
      </div>

      <Card className="text-center mb-6" style={{ animation: 'fadeUp 0.4s ease 0.2s both' }}>
        <div className={`text-[10px] tracking-[4px] uppercase text-muted/60 mb-3 ${bebas}`}>Poengsum</div>
        <span className={`${bebas} text-[56px] leading-none ${trofasteWin ? 'text-success' : 'text-danger'}`}>
          {score >= 1 ? '+' : ''}{score}
        </span>
      </Card>

      {/* Fasit summary */}
      {questionResults.length > 0 && (
        <Card className="mb-4" style={{ animation: 'fadeUp 0.4s ease 0.3s both' }}>
          <div className={`text-[10px] tracking-[4px] uppercase text-muted/60 mb-4 ${bebas}`}>Fasit</div>
          <div className="space-y-2">
            {questionResults.map((r, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] ${r.correct ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                  {r.correct ? '\u2713' : '\u2717'}
                </div>
                <span className="text-white/70 truncate flex-1">{r.question}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Lagnavn */}
      {game.lagnavn && (
        <Card className="mb-4" style={{ animation: 'fadeUp 0.4s ease 0.4s both' }}>
          <div className={`text-[10px] tracking-[4px] uppercase text-muted/60 mb-2 ${bebas}`}>Lagnavn</div>
          <div className={`${bebas} text-[20px] tracking-[2px]`}>{game.lagnavn}</div>
          {game.quizlingLagnavnTarget && (
            <div className={`text-xs mt-2 ${game.quizlingLagnavnSuccess ? 'text-danger/80' : 'text-success/80'}`}>
              Quizlingens mål: {game.quizlingLagnavnTarget} — {game.quizlingLagnavnSuccess ? 'Klarte det!' : 'Klarte det ikke!'}
            </div>
          )}
        </Card>
      )}

      {/* Eliminering */}
      <Card className="mb-4" style={{ animation: 'fadeUp 0.4s ease 0.5s both' }}>
        <div className={`text-[10px] tracking-[4px] uppercase text-muted/60 mb-2 ${bebas}`}>Eliminering</div>
        {eliminated.length > 0 ? (
          <div className="space-y-2">
            {eliminated.map(([id]) => {
              const player = game.players.find(p => p.id === id);
              const isCorrect = quizlingIds.includes(id);
              return (
                <div key={id} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] ${isCorrect ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                    {isCorrect ? '\u2713' : '\u2717'}
                  </div>
                  <div>
                    <span className="text-white/80 text-sm">{player?.name ?? 'Ukjent'}</span>
                    <span className="text-muted/60 text-xs ml-2">
                      ({isCorrect ? (isMulti ? 'Quizling funnet!' : 'Quizlingen funnet!') : 'Feil person'})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-danger/80">
            {isMulti ? 'Ingen ble eliminert — Quizlingene slapp unna' : 'Ingen ble eliminert — Quizlingen slapp unna'}
          </div>
        )}
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
  const [showManual, setShowManual] = useState(false);

  // Scroll to top on phase change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [gameState?.phase]);

  const openManual = () => setShowManual(true);
  const closeManual = () => setShowManual(false);

  const manualModal = showManual ? <BrukermanualModal onClose={closeManual} /> : null;

  // Floating utility bar for in-game screens
  const inGameOverlay = (
    <>
      {manualModal}
      <div className="fixed top-4 left-4 z-40 flex gap-2">
        <button onClick={openManual} className="text-white/50 hover:text-white/70 transition-colors p-2" title="Brukermanual">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </button>
        <button onClick={leave} className="text-white/50 hover:text-white/70 transition-colors p-2" title="Begynn på nytt">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
        </button>
      </div>
    </>
  );

  if (session && gameState) {
    const phase = gameState.phase;

    if (phase === 'lobby') return <>{inGameOverlay}<LobbyScreen game={gameState} onStart={start} onSetMode={(mode) => action('set-mode', { mode })} loading={loading} /></>;
    if (phase === 'rules') return <>{inGameOverlay}<RulesScreen game={gameState} onAdvance={() => action('advance-phase')} onHome={leave} /></>;
    if (phase === 'role-reveal') return <>{inGameOverlay}<RoleRevealScreen game={gameState} playerId={playerId!} onConfirm={() => action('confirm-role')} /></>;
    if (phase === 'lagnavn' || phase === 'lagnavn-confirmed') {
      return <>{inGameOverlay}<LagnavnScreen game={gameState} onSubmit={(lagnavn) => action('submit-lagnavn', { lagnavn })} onAdvance={() => action('advance-phase')} /></>;
    }
    if (phase.startsWith('power-q-')) {
      return <>{inGameOverlay}<PowerQuestionScreen game={gameState} playerId={playerId!} onSubmit={(answer) => action('submit-power-answer', { answer })} /></>;
    }
    if (phase.startsWith('power-result-')) {
      return <>{inGameOverlay}<PowerResultScreen game={gameState} onChoosePin={(pin) => action('choose-pin', { pin })} onAdvance={() => action('advance-phase')} /></>;
    }
    if (phase.startsWith('quiz-')) {
      return <>{inGameOverlay}<QuizQuestionScreen game={gameState} playerId={playerId!} onSubmit={(answer) => action('submit-quiz-answer', { answer })} onAdvance={() => action('advance-phase')} onUsePin={() => action('use-pin')} /></>;
    }
    if (phase === 'voting') return <>{inGameOverlay}<VotingScreen game={gameState} playerId={playerId!} onVote={(targetIds) => action('submit-vote', { targetIds })} onUseBlackPin={(questionIndex) => action('use-black-pin', { questionIndex })} /></>;
    if (phase === 'fasit') return <>{inGameOverlay}<FasitScreen game={gameState} onAdvance={() => action('advance-phase')} onRevealQuestion={() => action('reveal-fasit-question')} /></>;
    if (phase === 'reveal') return <>{inGameOverlay}<RevealScreen game={gameState} onAdvance={() => action('advance-phase')} onAdvanceRevealStep={() => action('advance-reveal-step')} /></>;
    if (phase === 'result') return <>{inGameOverlay}<ResultScreen game={gameState} onPlayAgain={() => action('restart-game')} onHome={leave} /></>;

    return <Spinner />;
  }

  if (screen === 'create') return <>{manualModal}<CreateScreen onBack={() => setScreen('home')} onCreate={(name) => create(name)} loading={loading} /></>;
  if (screen === 'join') return <>{manualModal}<JoinScreen onBack={() => setScreen('home')} onJoin={(code, name) => join(code, name)} loading={loading} error={error} /></>;

  return <>{manualModal}<HomeScreen onCreateClick={() => setScreen('create')} onJoinClick={() => setScreen('join')} onManual={openManual} /></>;
}
