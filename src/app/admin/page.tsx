'use client';

import { useState, useEffect, useCallback } from 'react';

interface Question {
  id: number;
  type: string;
  question: string;
  answer: string;
  difficulty: string;
  created_at: string;
}

const bebas = "font-['Gentika']";
const dm = "font-['Space_Mono']";

export default function AdminPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  // Edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<Partial<Question>>({});

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

    let added = 0;
    for (const line of lines) {
      const [q, a] = line.split('|').map((s) => s.trim());
      if (!q || !a) continue;
      try {
        const res = await fetch('/api/admin/questions', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            type: bulkType,
            question: q,
            answer: a,
            difficulty: bulkDifficulty,
          }),
        });
        if (res.ok) added++;
      } catch {
        // skip failed ones
      }
    }
    setBulkText('');
    flash(`Added ${added} question${added !== 1 ? 's' : ''}`);
    fetchQuestions();
  };

  const handleUpdate = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(editFields),
      });
      if (!res.ok) throw new Error('Failed to update question');
      setEditingId(null);
      setEditFields({});
      flash('Question updated');
      fetchQuestions();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
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
            <span className="text-[10px] tracking-[3px] uppercase text-muted">
              Question Bank
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-[11px] tracking-[2px] uppercase text-muted hover:text-white transition-colors"
            >
              Back to Game
            </a>
            <button
              onClick={handleInitDb}
              className={`${bebas} px-4 py-2 text-[13px] tracking-[2px] bg-white/[0.04] border border-white/[0.08] rounded hover:bg-white/[0.07] hover:border-white/15 transition-all cursor-pointer`}
            >
              INIT DB
            </button>
          </div>
        </div>
      </header>

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
          <span className="text-muted text-xs ml-auto">
            {questions.length} question{questions.length !== 1 ? 's' : ''}
          </span>
        </div>

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
                            onChange={(e) =>
                              setEditFields({ ...editFields, type: e.target.value })
                            }
                            className="bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-sm text-white outline-none"
                          >
                            <option value="quiz">Quiz</option>
                            <option value="power">Power</option>
                          </select>
                          <select
                            value={editFields.difficulty || 'medium'}
                            onChange={(e) =>
                              setEditFields({
                                ...editFields,
                                difficulty: e.target.value,
                              })
                            }
                            className="bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-sm text-white outline-none"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>
                        <textarea
                          value={editFields.question || ''}
                          onChange={(e) =>
                            setEditFields({
                              ...editFields,
                              question: e.target.value,
                            })
                          }
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2 text-sm text-white outline-none focus:border-accent2/60 resize-none"
                          rows={2}
                        />
                        <input
                          value={editFields.answer || ''}
                          onChange={(e) =>
                            setEditFields({
                              ...editFields,
                              answer: e.target.value,
                            })
                          }
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2 text-sm text-white outline-none focus:border-accent2/60"
                          placeholder="Answer"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdate(q.id)}
                            className={`${bebas} px-4 py-2 text-[13px] tracking-[2px] bg-accent2 text-white rounded hover:bg-[#cc0000] transition-all cursor-pointer`}
                          >
                            SAVE
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditFields({});
                            }}
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
    </div>
  );
}
