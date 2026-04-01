'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Question {
  id: number;
  type: string;
  question: string;
  answer: string;
  difficulty: string;
  content_hash: string;
  times_shown: number;
  times_correct: number;
  times_wrong: number;
  created_at: string;
}

interface LagnavnItem {
  id: number;
  name: string;
  created_at: string;
}

interface GameStatsOverview {
  totalGames: number;
  totalPlayers: number;
  avgScore: number;
  trofasteWins: number;
  quizlingWins: number;
  winRateByMode: { mode: string; total: number; trofaste_wins: number; quizling_wins: number }[];
  winRateByPlayerCount: { player_count: number; total: number; trofaste_wins: number; quizling_wins: number }[];
  avgCorrectAnswers: number;
  avgGameDuration: number;
  lagnavnSuccessRate: number;
  recentGames: { game_code: string; mode: string; player_count: number; score: number; winner: string; created_at: string }[];
}

const bebas = "font-['Gentika']";
const dm = "font-['Space_Mono']";

function AdminPageInner() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const validTabs = ['questions', 'lagnavn', 'analytics'] as const;
  type Tab = typeof validTabs[number];
  const tabFromUrl = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(
    validTabs.includes(tabFromUrl as Tab) ? (tabFromUrl as Tab) : 'questions'
  );

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    router.replace(`/admin?tab=${tab}`, { scroll: false });
  };
  const [stats, setStats] = useState<GameStatsOverview | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Auth
  const [password, setPassword] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin-password') || '';
    }
    return '';
  });
  const [authenticated, setAuthenticated] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<string>('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('');

  // Add form
  const [newType, setNewType] = useState('quiz');
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newDifficulty, setNewDifficulty] = useState('medium');

  // Bulk add
  const [bulkText, setBulkText] = useState('');
  const [bulkType, setBulkType] = useState('quiz');
  const [bulkDifficulty, setBulkDifficulty] = useState('medium');
  const [showBulk, setShowBulk] = useState(false);

  // Export field selection
  const allExportFields = ['id', 'type', 'question', 'answer', 'difficulty', 'times_shown', 'times_correct', 'times_wrong', 'content_hash', 'created_at'] as const;
  const exportFieldLabels: Record<string, string> = {
    id: 'ID', type: 'Type', question: 'Spørsmål', answer: 'Svar', difficulty: 'Vanskelighetsgrad',
    times_shown: 'Vist', times_correct: 'Riktig', times_wrong: 'Feil', content_hash: 'Hash', created_at: 'Opprettet',
  };
  const [exportFields, setExportFields] = useState<string[]>(['type', 'question', 'answer', 'difficulty']);
  const [showExportOptions, setShowExportOptions] = useState(false);

  const toggleExportField = (field: string) => {
    setExportFields(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  // CSV Import
  const [importResult, setImportResult] = useState<{ total: number; added: number; skippedDuplicates: number; duplicates: string[]; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);

  // Edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<Partial<Question>>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Lagnavn state
  const [lagnavnList, setLagnavnList] = useState<LagnavnItem[]>([]);
  const [lagnavnLoading, setLagnavnLoading] = useState(false);
  const [newLagnavn, setNewLagnavn] = useState('');
  const [lagnavnBulkText, setLagnavnBulkText] = useState('');
  const [showLagnavnBulk, setShowLagnavnBulk] = useState(false);
  const [deletingLagnavnId, setDeletingLagnavnId] = useState<number | null>(null);

  const authHeaders = (): HeadersInit => ({
    'Content-Type': 'application/json',
    'x-admin-password': password,
  });

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set('type', filterType);
      if (filterDifficulty) params.set('difficulty', filterDifficulty);
      const res = await fetch(`/api/admin/questions?${params}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch questions');
      const data = await res.json();
      setQuestions(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterDifficulty, password]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      let res = await fetch('/api/admin/stats', { headers: authHeaders() });
      if (!res.ok) {
        // Auto-init stats table if it doesn't exist
        await fetch('/api/admin/stats', { method: 'POST', headers: authHeaders() });
        res = await fetch('/api/admin/stats', { headers: authHeaders() });
        if (!res.ok) throw new Error('Failed to fetch stats');
      }
      const data = await res.json();
      setStats(data);
    } catch {
      // silently fail
    } finally {
      setStatsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password]);

  const fetchLagnavn = useCallback(async () => {
    setLagnavnLoading(true);
    try {
      const res = await fetch('/api/admin/lagnavn', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch lagnavn');
      setLagnavnList(await res.json());
    } catch {
      // silently fail
    } finally {
      setLagnavnLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password]);

  const handleAddLagnavn = async () => {
    if (!newLagnavn.trim()) return;
    try {
      const res = await fetch('/api/admin/lagnavn', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: newLagnavn.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to add');
        return;
      }
      setNewLagnavn('');
      flash('Lagnavn lagt til');
      fetchLagnavn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const handleBulkAddLagnavn = async () => {
    const lines = lagnavnBulkText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const results = await Promise.allSettled(
      lines.map(name =>
        fetch('/api/admin/lagnavn', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ name }),
        }).then(r => r.ok)
      )
    );
    const added = results.filter(r => r.status === 'fulfilled' && r.value).length;
    setLagnavnBulkText('');
    flash(`Lagt til ${added} lagnavn`);
    fetchLagnavn();
  };

  const handleDeleteLagnavn = async (id: number) => {
    try {
      await fetch(`/api/admin/lagnavn/${id}`, { method: 'DELETE', headers: authHeaders() });
      setDeletingLagnavnId(null);
      flash('Lagnavn slettet');
      fetchLagnavn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  // Auto-login on reload if password is saved
  useEffect(() => {
    if (password && !authenticated) {
      fetch('/api/admin/questions', { headers: { 'Content-Type': 'application/json', 'x-admin-password': password } })
        .then(res => { if (res.ok) setAuthenticated(true); })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async () => {
    setError(null);
    try {
      const res = await fetch('/api/admin/questions', {
        headers: authHeaders(),
      });
      if (res.status === 401) {
        setError('Feil passord');
        return;
      }
      if (res.status === 500) {
        const data = await res.json();
        if (data.error?.includes('ADMIN_PASSWORD')) {
          setError('ADMIN_PASSWORD er ikke satt i miljøvariabler');
          return;
        }
      }
      localStorage.setItem('admin-password', password);
      setAuthenticated(true);
    } catch {
      setError('Kunne ikke koble til serveren');
    }
  };

  useEffect(() => {
    if (authenticated) fetchQuestions();
  }, [authenticated, fetchQuestions]);

  useEffect(() => {
    if (authenticated && activeTab === 'analytics') fetchStats();
  }, [authenticated, activeTab, fetchStats]);

  useEffect(() => {
    if (authenticated && activeTab === 'lagnavn') fetchLagnavn();
  }, [authenticated, activeTab, fetchLagnavn]);

  const handleAdd = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    try {
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          type: newType,
          question: newQuestion.trim(),
          answer: newAnswer.trim(),
          difficulty: newDifficulty,
        }),
      });
      if (!res.ok) throw new Error('Failed to add question');
      setNewQuestion('');
      setNewAnswer('');
      flash('Question added');
      fetchQuestions();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const handleBulkAdd = async () => {
    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.includes('|'));
    if (lines.length === 0) return;

    const entries = lines
      .map(line => { const [q, a] = line.split('|').map(s => s.trim()); return q && a ? { q, a } : null; })
      .filter(Boolean) as { q: string; a: string }[];

    const results = await Promise.allSettled(
      entries.map(({ q, a }) =>
        fetch('/api/admin/questions', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ type: bulkType, question: q, answer: a, difficulty: bulkDifficulty }),
        }).then(r => r.ok)
      )
    );
    const added = results.filter(r => r.status === 'fulfilled' && r.value).length;
    setBulkText('');
    flash(`Added ${added} question${added !== 1 ? 's' : ''}`);
    fetchQuestions();
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      const params = new URLSearchParams();
      params.set('format', format);
      if (filterType) params.set('type', filterType);
      if (filterDifficulty) params.set('difficulty', filterDifficulty);
      if (exportFields.length > 0) params.set('fields', exportFields.join(','));
      const res = await fetch(`/api/admin/questions/export?${params}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'csv'
        ? `questions-${new Date().toISOString().slice(0, 10)}.csv`
        : `questions-${new Date().toISOString().slice(0, 10)}.xls`;
      a.click();
      URL.revokeObjectURL(url);
      flash(`Exported ${questions.length} questions as ${format.toUpperCase()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/questions/import', {
        method: 'POST',
        headers: { 'x-admin-password': password },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Import failed');
      }
      const result = await res.json();
      setImportResult(result);
      flash(`Importert ${result.added} spørsmål (${result.skippedDuplicates} duplikater hoppet over)`);
      fetchQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Slett ALLE ${questions.length} spørsmål? Dette kan ikke angres.`)) return;
    try {
      const res = await fetch('/api/admin/questions', {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete questions');
      const data = await res.json();
      flash(`Deleted ${data.deleted} questions`);
      fetchQuestions();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const handleUpdate = async (id: number) => {
    setEditError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(editFields),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Update failed (${res.status})`);
      }
      setEditingId(null);
      setEditFields({});
      flash('Question updated');
      fetchQuestions();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete question');
      setDeletingId(null);
      flash('Question deleted');
      fetchQuestions();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const handleInitDb = async () => {
    try {
      const res = await fetch('/api/admin/init', { method: 'POST', headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to init database');
      flash('Database initialized');
      fetchQuestions();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const startEdit = (q: Question) => {
    setEditingId(q.id);
    setEditError(null);
    setEditFields({
      type: q.type,
      question: q.question,
      answer: q.answer,
      difficulty: q.difficulty,
    });
  };

  const typeBadge = (type: string) => {
    const colors =
      type === 'power'
        ? 'bg-gold/20 text-gold border-gold/30'
        : 'bg-accent2/20 text-accent2 border-accent2/30';
    return (
      <span
        className={`inline-block px-2 py-0.5 text-[10px] tracking-[2px] uppercase border rounded ${colors}`}
      >
        {type}
      </span>
    );
  };

  const diffBadge = (diff: string) => {
    const colors: Record<string, string> = {
      easy: 'bg-success/20 text-success border-success/30',
      medium: 'bg-gold/20 text-gold border-gold/30',
      hard: 'bg-danger/20 text-danger border-danger/30',
    };
    return (
      <span
        className={`inline-block px-2 py-0.5 text-[10px] tracking-[2px] uppercase border rounded ${colors[diff] || colors.medium}`}
      >
        {diff}
      </span>
    );
  };

  if (!authenticated) {
    return (
      <div className={`relative z-10 min-h-screen ${dm} text-white flex items-center justify-center p-4`}>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-md p-8 w-full max-w-sm space-y-5">
          <h1
            className={`${bebas} text-[32px] tracking-[3px] text-center`}
            style={{ textShadow: '0 0 40px rgba(139,0,0,0.5)' }}
          >
            ADMIN
          </h1>
          <input
            type="password"
            placeholder="Passord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-4 py-3 text-white placeholder:text-white/20 outline-none focus:border-accent2/60"
          />
          {error && <p className="text-danger text-sm text-center">{error}</p>}
          <button
            onClick={handleLogin}
            className={`w-full ${bebas} py-3 text-[15px] tracking-[3px] bg-accent2 text-white rounded hover:bg-[#cc0000] transition-all cursor-pointer shadow-[0_2px_20px_rgba(139,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]`}
          >
            LOGG INN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative z-10 min-h-screen ${dm} text-white`}>
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1
              className={`${bebas} text-[32px] sm:text-[40px] leading-none`}
              style={{
                textShadow: '0 0 40px rgba(139,0,0,0.5)',
              }}
            >
              QUIZLING ADMIN
            </h1>
            <div className="flex gap-1 ml-4">
              <button
                onClick={() => switchTab('questions')}
                className={`px-3 py-1.5 text-[10px] tracking-[2px] uppercase rounded transition-colors cursor-pointer ${
                  activeTab === 'questions' ? 'bg-accent2/20 text-accent2 border border-accent2/30' : 'text-muted hover:text-white'
                }`}
              >
                Questions
              </button>
              <button
                onClick={() => switchTab('lagnavn')}
                className={`px-3 py-1.5 text-[10px] tracking-[2px] uppercase rounded transition-colors cursor-pointer ${
                  activeTab === 'lagnavn' ? 'bg-accent2/20 text-accent2 border border-accent2/30' : 'text-muted hover:text-white'
                }`}
              >
                Lagnavn
              </button>
              <button
                onClick={() => switchTab('analytics')}
                className={`px-3 py-1.5 text-[10px] tracking-[2px] uppercase rounded transition-colors cursor-pointer ${
                  activeTab === 'analytics' ? 'bg-accent2/20 text-accent2 border border-accent2/30' : 'text-muted hover:text-white'
                }`}
              >
                Analytics
              </button>
            </div>
          </div>
          <a
            href="/"
            className="text-[11px] tracking-[2px] uppercase text-muted hover:text-white transition-colors"
          >
            Back to Game
          </a>
        </div>
      </header>

      {activeTab === 'questions' && (
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Alerts */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-danger/10 border border-danger/30 rounded-md text-danger text-sm">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right text-danger/60 hover:text-danger cursor-pointer"
            >
              x
            </button>
          </div>
        )}
        {success && (
          <div className="mb-6 px-4 py-3 bg-success/10 border border-success/30 rounded-md text-success text-sm">
            {success}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <span className="text-[10px] tracking-[4px] uppercase text-muted">
            Filter
          </span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2 text-sm text-white outline-none focus:border-accent2/60 cursor-pointer"
          >
            <option value="">All types</option>
            <option value="quiz">Quiz</option>
            <option value="power">Power</option>
          </select>
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2 text-sm text-white outline-none focus:border-accent2/60 cursor-pointer"
          >
            <option value="">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <span className="text-muted text-xs ml-auto flex items-center gap-3">
            {questions.length} question{questions.length !== 1 ? 's' : ''}
            {questions.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="text-danger/70 hover:text-danger text-[10px] tracking-[2px] uppercase cursor-pointer transition-colors"
              >
                Slett alle
              </button>
            )}
          </span>
        </div>

        {/* Export / Import toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <button
            onClick={() => handleExport('csv')}
            disabled={exportFields.length === 0}
            className={`${bebas} px-4 py-2 text-[12px] tracking-[2px] bg-white/[0.04] border border-white/[0.08] rounded hover:bg-white/[0.07] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            EXPORT CSV
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={exportFields.length === 0}
            className={`${bebas} px-4 py-2 text-[12px] tracking-[2px] bg-white/[0.04] border border-white/[0.08] rounded hover:bg-white/[0.07] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            EXPORT EXCEL
          </button>
          <button
            onClick={() => setShowExportOptions(!showExportOptions)}
            className={`text-[10px] tracking-[2px] uppercase transition-colors cursor-pointer ${showExportOptions ? 'text-accent2' : 'text-muted hover:text-white'}`}
          >
            {showExportOptions ? '- Skjul felter' : '+ Velg felter'}
          </button>
          <div className="border-l border-white/[0.08] h-6 mx-1" />
          <label className={`${bebas} px-4 py-2 text-[12px] tracking-[2px] bg-accent2/20 border border-accent2/30 text-accent2 rounded hover:bg-accent2/30 transition-all cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
            {importing ? 'IMPORTERER...' : 'IMPORT CSV'}
            <input
              type="file"
              accept=".csv,.tsv,.xls,.txt"
              onChange={handleImportFile}
              className="hidden"
              disabled={importing}
            />
          </label>
          {importResult && (
            <div className="text-xs text-muted">
              {importResult.added} lagt til, {importResult.skippedDuplicates} duplikater
              {importResult.errors.length > 0 && `, ${importResult.errors.length} feil`}
            </div>
          )}
        </div>

        {/* Export field picker */}
        {showExportOptions && (
          <div className="mb-6 px-4 py-3 bg-white/[0.02] border border-white/[0.06] rounded-md">
            <div className="flex flex-wrap gap-2">
              {allExportFields.map(field => (
                <button
                  key={field}
                  onClick={() => toggleExportField(field)}
                  className={`px-3 py-1.5 text-[10px] tracking-[1px] rounded border transition-colors cursor-pointer ${
                    exportFields.includes(field)
                      ? 'bg-accent2/20 text-accent2 border-accent2/30'
                      : 'bg-white/[0.02] text-muted/60 border-white/[0.06] hover:text-white hover:border-white/[0.12]'
                  }`}
                >
                  {exportFieldLabels[field]}
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setExportFields(['type', 'question', 'answer', 'difficulty'])}
                className="text-[10px] tracking-[1px] text-muted/50 hover:text-white transition-colors cursor-pointer"
              >
                Standard
              </button>
              <button
                onClick={() => setExportFields([...allExportFields])}
                className="text-[10px] tracking-[1px] text-muted/50 hover:text-white transition-colors cursor-pointer"
              >
                Alle
              </button>
              <button
                onClick={() => setExportFields([])}
                className="text-[10px] tracking-[1px] text-muted/50 hover:text-white transition-colors cursor-pointer"
              >
                Ingen
              </button>
            </div>
          </div>
        )}

        {/* Import result details */}
        {importResult && importResult.skippedDuplicates > 0 && (
          <div className="mb-6 px-4 py-3 bg-gold/10 border border-gold/30 rounded-md text-gold text-xs">
            <span className="font-bold">Duplikater hoppet over:</span>{' '}
            {importResult.duplicates.map((d, i) => (
              <span key={i}>{i > 0 ? ', ' : ''}&quot;{d}&quot;</span>
            ))}
            {importResult.skippedDuplicates > importResult.duplicates.length && ` og ${importResult.skippedDuplicates - importResult.duplicates.length} til...`}
            <button onClick={() => setImportResult(null)} className="float-right text-gold/60 hover:text-gold cursor-pointer ml-2">x</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Questions list */}
          <div className="lg:col-span-2">
            <h2
              className={`${bebas} text-[22px] tracking-[3px] mb-4`}
              style={{ textShadow: '0 0 20px rgba(139,0,0,0.3)' }}
            >
              QUESTIONS
            </h2>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-white/10 border-t-accent2 rounded-full animate-spin" />
              </div>
            ) : questions.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-muted text-sm mb-2">No questions found</p>
                <p className="text-muted/60 text-xs">
                  Add some questions or click Init DB to set up the table
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {questions.map((q) => (
                  <div
                    key={q.id}
                    className="bg-white/[0.03] border border-white/[0.06] rounded-md p-4 hover:bg-white/[0.05] transition-colors"
                  >
                    {editingId === q.id ? (
                      /* Edit mode */
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <select
                            value={editFields.type || 'quiz'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditFields(prev => ({ ...prev, type: val }));
                            }}
                            className="bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-sm text-white outline-none"
                          >
                            <option value="quiz">Quiz</option>
                            <option value="power">Power</option>
                          </select>
                          <select
                            value={editFields.difficulty || 'medium'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditFields(prev => ({ ...prev, difficulty: val }));
                            }}
                            className="bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-sm text-white outline-none"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>
                        <textarea
                          value={editFields.question || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditFields(prev => ({ ...prev, question: val }));
                          }}
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2 text-sm text-white outline-none focus:border-accent2/60 resize-none"
                          rows={2}
                        />
                        <input
                          value={editFields.answer || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditFields(prev => ({ ...prev, answer: val }));
                          }}
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2 text-sm text-white outline-none focus:border-accent2/60"
                          placeholder="Answer"
                        />
                        {editError && (
                          <div className="px-3 py-2 bg-danger/10 border border-danger/30 rounded text-danger text-xs">
                            {editError}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdate(q.id)}
                            disabled={saving}
                            className={`${bebas} px-4 py-2 text-[13px] tracking-[2px] bg-accent2 text-white rounded hover:bg-[#cc0000] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {saving ? 'LAGRER...' : 'SAVE'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditFields({});
                              setEditError(null);
                            }}
                            disabled={saving}
                            className={`${bebas} px-4 py-2 text-[13px] tracking-[2px] bg-white/[0.04] border border-white/[0.08] rounded hover:bg-white/[0.07] transition-all cursor-pointer`}
                          >
                            CANCEL
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* View mode */
                      <>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {typeBadge(q.type)}
                              {diffBadge(q.difficulty)}
                              <span className="text-muted/40 text-[10px]">
                                #{q.id}
                              </span>
                            </div>
                            <p className="text-sm text-white/90 mb-1 leading-relaxed">
                              {q.question}
                            </p>
                            <p className="text-xs text-gold/80">
                              Svar: {q.answer}
                            </p>
                            {q.times_shown > 0 && (
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-[10px] text-muted/50">
                                  Vist {q.times_shown}x
                                </span>
                                <span className="text-[10px] text-success/70">
                                  {q.times_correct} riktig
                                </span>
                                <span className="text-[10px] text-danger/70">
                                  {q.times_wrong} feil
                                </span>
                                <span className={`text-[10px] font-bold ${
                                  (q.times_correct / q.times_shown) >= 0.7 ? 'text-success/60' :
                                  (q.times_correct / q.times_shown) >= 0.4 ? 'text-gold/60' : 'text-danger/60'
                                }`}>
                                  {Math.round((q.times_correct / q.times_shown) * 100)}% riktig
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => startEdit(q)}
                              className="p-2 text-muted hover:text-white hover:bg-white/[0.05] rounded transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            {deletingId === q.id ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleDelete(q.id)}
                                  className="px-2 py-1 text-[10px] tracking-[1px] uppercase bg-danger/20 text-danger border border-danger/30 rounded hover:bg-danger/30 transition-colors cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeletingId(null)}
                                  className="px-2 py-1 text-[10px] tracking-[1px] uppercase text-muted hover:text-white transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingId(q.id)}
                                className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar: Add form */}
          <div>
            <h2
              className={`${bebas} text-[22px] tracking-[3px] mb-4`}
              style={{ textShadow: '0 0 20px rgba(139,0,0,0.3)' }}
            >
              ADD QUESTION
            </h2>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-md p-5 space-y-4">
              <div>
                <label className="block text-[10px] tracking-[3px] uppercase text-muted/80 mb-2">
                  Type
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2.5 text-sm text-white outline-none focus:border-accent2/60 cursor-pointer"
                >
                  <option value="quiz">Quiz</option>
                  <option value="power">Power</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] tracking-[3px] uppercase text-muted/80 mb-2">
                  Question
                </label>
                <textarea
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2.5 text-sm text-white outline-none focus:border-accent2/60 resize-none placeholder:text-white/20"
                  rows={3}
                  placeholder="Enter question..."
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-[3px] uppercase text-muted/80 mb-2">
                  Answer
                </label>
                <input
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2.5 text-sm text-white outline-none focus:border-accent2/60 placeholder:text-white/20"
                  placeholder="Enter answer..."
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-[3px] uppercase text-muted/80 mb-2">
                  Difficulty
                </label>
                <select
                  value={newDifficulty}
                  onChange={(e) => setNewDifficulty(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2.5 text-sm text-white outline-none focus:border-accent2/60 cursor-pointer"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <button
                onClick={handleAdd}
                disabled={!newQuestion.trim() || !newAnswer.trim()}
                className={`w-full ${bebas} py-3 text-[15px] tracking-[3px] bg-accent2 text-white rounded hover:bg-[#cc0000] transition-all cursor-pointer shadow-[0_2px_20px_rgba(139,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                ADD QUESTION
              </button>
            </div>

            {/* Bulk add */}
            <div className="mt-6">
              <button
                onClick={() => setShowBulk(!showBulk)}
                className={`${bebas} text-[14px] tracking-[2px] text-muted hover:text-white transition-colors cursor-pointer`}
              >
                {showBulk ? '- HIDE' : '+'} BULK ADD
              </button>
              {showBulk && (
                <div className="mt-3 bg-white/[0.03] border border-white/[0.06] rounded-md p-5 space-y-4">
                  <p className="text-[10px] tracking-[2px] text-muted/60 leading-relaxed">
                    Paste questions, one per line.
                    <br />
                    Format: question | answer
                  </p>
                  <div className="flex gap-3">
                    <select
                      value={bulkType}
                      onChange={(e) => setBulkType(e.target.value)}
                      className="bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-sm text-white outline-none cursor-pointer"
                    >
                      <option value="quiz">Quiz</option>
                      <option value="power">Power</option>
                    </select>
                    <select
                      value={bulkDifficulty}
                      onChange={(e) => setBulkDifficulty(e.target.value)}
                      className="bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-sm text-white outline-none cursor-pointer"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2.5 text-xs text-white outline-none focus:border-accent2/60 resize-none placeholder:text-white/20 leading-relaxed"
                    rows={8}
                    placeholder={`Hva heter Norges hovedstad? | Oslo\nHvor mange bein har en edderkopp? | 8`}
                  />
                  <button
                    onClick={handleBulkAdd}
                    disabled={!bulkText.trim()}
                    className={`w-full ${bebas} py-3 text-[15px] tracking-[3px] bg-white/[0.04] border border-white/[0.08] text-white rounded hover:bg-white/[0.07] hover:border-white/15 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed`}
                  >
                    BULK ADD
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'lagnavn' && (
        <div className="max-w-6xl mx-auto px-6 py-8">
          {error && (
            <div className="mb-6 px-4 py-3 bg-danger/10 border border-danger/30 rounded-md text-danger text-sm">
              {error}
              <button onClick={() => setError(null)} className="float-right text-danger/60 hover:text-danger cursor-pointer">x</button>
            </div>
          )}
          {success && (
            <div className="mb-6 px-4 py-3 bg-success/10 border border-success/30 rounded-md text-success text-sm">{success}</div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* List */}
            <div className="lg:col-span-2">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className={`${bebas} text-[22px] tracking-[3px]`} style={{ textShadow: '0 0 20px rgba(139,0,0,0.3)' }}>
                  LAGNAVN
                </h2>
                <span className="text-muted text-xs">{lagnavnList.length} navn</span>
              </div>

              {lagnavnLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-white/10 border-t-accent2 rounded-full animate-spin" />
                </div>
              ) : lagnavnList.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-muted text-sm mb-1">Ingen lagnavn i banken ennå</p>
                  <p className="text-muted/60 text-xs">Legg til navn enkeltvis eller bruk bulk-import</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lagnavnList.map(item => (
                    <div key={item.id} className="bg-white/[0.03] border border-white/[0.06] rounded-md px-4 py-3 flex items-center justify-between hover:bg-white/[0.05] transition-colors">
                      <span className="text-sm text-white/90">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted/30 text-[10px]">#{item.id}</span>
                        {deletingLagnavnId === item.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDeleteLagnavn(item.id)}
                              className="px-2 py-1 text-[10px] tracking-[1px] uppercase bg-danger/20 text-danger border border-danger/30 rounded hover:bg-danger/30 transition-colors cursor-pointer"
                            >
                              Slett
                            </button>
                            <button
                              onClick={() => setDeletingLagnavnId(null)}
                              className="px-2 py-1 text-[10px] tracking-[1px] uppercase text-muted hover:text-white transition-colors cursor-pointer"
                            >
                              Avbryt
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingLagnavnId(item.id)}
                            className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded transition-colors cursor-pointer"
                            title="Slett"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar: add + bulk */}
            <div>
              <h2 className={`${bebas} text-[22px] tracking-[3px] mb-4`} style={{ textShadow: '0 0 20px rgba(139,0,0,0.3)' }}>
                LEGG TIL
              </h2>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-md p-5 space-y-4">
                <div>
                  <label className="block text-[10px] tracking-[3px] uppercase text-muted/80 mb-2">Lagnavn</label>
                  <input
                    value={newLagnavn}
                    onChange={e => setNewLagnavn(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddLagnavn()}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2.5 text-sm text-white outline-none focus:border-accent2/60 placeholder:text-white/20"
                    placeholder="F.eks. Fjordfiffen"
                  />
                </div>
                <button
                  onClick={handleAddLagnavn}
                  disabled={!newLagnavn.trim()}
                  className={`w-full ${bebas} py-3 text-[15px] tracking-[3px] bg-accent2 text-white rounded hover:bg-[#cc0000] transition-all cursor-pointer shadow-[0_2px_20px_rgba(139,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  LEGG TIL
                </button>
              </div>

              {/* Bulk add */}
              <div className="mt-6">
                <button
                  onClick={() => setShowLagnavnBulk(!showLagnavnBulk)}
                  className={`${bebas} text-[14px] tracking-[2px] text-muted hover:text-white transition-colors cursor-pointer`}
                >
                  {showLagnavnBulk ? '- SKJUL' : '+'} BULK IMPORT
                </button>
                {showLagnavnBulk && (
                  <div className="mt-3 bg-white/[0.03] border border-white/[0.06] rounded-md p-5 space-y-4">
                    <p className="text-[10px] tracking-[2px] text-muted/60 leading-relaxed">
                      Ett lagnavn per linje.
                    </p>
                    <textarea
                      value={lagnavnBulkText}
                      onChange={e => setLagnavnBulkText(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2.5 text-xs text-white outline-none focus:border-accent2/60 resize-none placeholder:text-white/20 leading-relaxed"
                      rows={10}
                      placeholder={`Turbo Tansen\nBlåbærbandittene\nNordlys Ninjaene`}
                    />
                    <button
                      onClick={handleBulkAddLagnavn}
                      disabled={!lagnavnBulkText.trim()}
                      className={`w-full ${bebas} py-3 text-[15px] tracking-[3px] bg-white/[0.04] border border-white/[0.08] text-white rounded hover:bg-white/[0.07] hover:border-white/15 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      IMPORTER
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="max-w-6xl mx-auto px-6 py-8">
          {statsLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-white/10 border-t-accent2 rounded-full animate-spin" />
            </div>
          ) : !stats ? (
            <div className="py-16 text-center">
              <p className="text-muted text-sm">Ingen statistikk tilgjengelig ennå. Spill noen runder så dukker dataen opp her!</p>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Spill totalt', value: stats.totalGames, color: 'text-white' },
                  { label: 'Spillere totalt', value: stats.totalPlayers, color: 'text-white' },
                  { label: 'Snittpoeng', value: stats.avgScore, color: stats.avgScore >= 0 ? 'text-success' : 'text-danger' },
                  { label: 'Snitt riktige', value: stats.avgCorrectAnswers, color: 'text-success' },
                ].map((card, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-md p-5 text-center">
                    <div className="text-[10px] tracking-[3px] uppercase text-muted/60 mb-2">{card.label}</div>
                    <div className={`${bebas} text-[32px] ${card.color}`}>{card.value}</div>
                  </div>
                ))}
              </div>

              {/* Win rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-md p-5">
                  <div className="text-[10px] tracking-[3px] uppercase text-muted/60 mb-4">Vinnere totalt</div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className={`${bebas} text-[28px] text-success`}>{stats.trofasteWins}</div>
                      <div className="text-[10px] text-muted/60">Trofaste</div>
                    </div>
                    <div className="text-muted/30">vs</div>
                    <div className="text-center">
                      <div className={`${bebas} text-[28px] text-danger`}>{stats.quizlingWins}</div>
                      <div className="text-[10px] text-muted/60">Quizling</div>
                    </div>
                  </div>
                  {stats.totalGames > 0 && (
                    <div className="mt-3 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full bg-success rounded-full"
                        style={{ width: `${(stats.trofasteWins / stats.totalGames) * 100}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="bg-white/[0.03] border border-white/[0.06] rounded-md p-5">
                  <div className="text-[10px] tracking-[3px] uppercase text-muted/60 mb-4">Annet</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted/60">Snitt spilletid</span>
                      <span className="text-white">{Math.floor(stats.avgGameDuration / 60)}m {stats.avgGameDuration % 60}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted/60">Lagnavn suksessrate</span>
                      <span className="text-white">{stats.lagnavnSuccessRate}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Win rate by mode */}
              {stats.winRateByMode.length > 0 && (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-md p-5 mb-6">
                  <div className="text-[10px] tracking-[3px] uppercase text-muted/60 mb-4">Per spillmodus</div>
                  <div className="space-y-3">
                    {stats.winRateByMode.map(row => (
                      <div key={row.mode} className="flex items-center gap-4">
                        <span className={`${bebas} text-[14px] tracking-[2px] w-20 text-white/70 uppercase`}>{row.mode}</span>
                        <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full bg-success rounded-full"
                            style={{ width: row.total > 0 ? `${(row.trofaste_wins / row.total) * 100}%` : '0%' }}
                          />
                        </div>
                        <span className="text-xs text-muted/60 w-24 text-right">{row.trofaste_wins}T / {row.quizling_wins}Q ({row.total})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Win rate by player count */}
              {stats.winRateByPlayerCount.length > 0 && (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-md p-5 mb-6">
                  <div className="text-[10px] tracking-[3px] uppercase text-muted/60 mb-4">Per antall spillere</div>
                  <div className="space-y-3">
                    {stats.winRateByPlayerCount.map(row => (
                      <div key={row.player_count} className="flex items-center gap-4">
                        <span className="text-sm text-white/70 w-20">{row.player_count} spillere</span>
                        <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full bg-success rounded-full"
                            style={{ width: row.total > 0 ? `${(row.trofaste_wins / row.total) * 100}%` : '0%' }}
                          />
                        </div>
                        <span className="text-xs text-muted/60 w-24 text-right">{row.trofaste_wins}T / {row.quizling_wins}Q ({row.total})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent games */}
              {stats.recentGames.length > 0 && (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-md p-5">
                  <div className="text-[10px] tracking-[3px] uppercase text-muted/60 mb-4">Siste spill</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-muted/50 text-[10px] tracking-[2px] uppercase">
                          <th className="text-left pb-3">Kode</th>
                          <th className="text-left pb-3">Modus</th>
                          <th className="text-left pb-3">Spillere</th>
                          <th className="text-left pb-3">Poeng</th>
                          <th className="text-left pb-3">Vinner</th>
                          <th className="text-left pb-3">Dato</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentGames.map((g, i) => (
                          <tr key={i} className="border-t border-white/[0.04]">
                            <td className="py-2 text-white/60">{g.game_code}</td>
                            <td className="py-2 text-white/60 uppercase">{g.mode}</td>
                            <td className="py-2 text-white/60">{g.player_count}</td>
                            <td className={`py-2 ${g.score >= 0 ? 'text-success' : 'text-danger'}`}>{g.score >= 0 ? '+' : ''}{g.score}</td>
                            <td className={`py-2 ${g.winner === 'trofaste' ? 'text-success' : 'text-danger'}`}>{g.winner === 'trofaste' ? 'Trofaste' : 'Quizling'}</td>
                            <td className="py-2 text-muted/40">{new Date(g.created_at).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense>
      <AdminPageInner />
    </Suspense>
  );
}
