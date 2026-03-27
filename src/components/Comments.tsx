import { useEffect, useState, useCallback } from 'react';
import type { User } from 'firebase/auth';

interface Comment {
  id: string;
  postSlug: string;
  author: string;
  authorUid: string;
  authorPhoto: string;
  content: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
  updatedAt: { seconds: number; nanoseconds: number } | null;
  isGuest?: boolean;
  guestName?: string;
  guestPasswordHash?: string;
}

function formatRelativeTime(seconds: number): string {
  const now = Date.now() / 1000;
  const diff = now - seconds;

  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 172800) return '어제';
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;

  const date = new Date(seconds * 1000);
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function Comments({ postSlug }: { postSlug: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPassword, setGuestPassword] = useState('');

  // Load Firebase modules dynamically
  const getFirebaseModules = useCallback(async () => {
    const { db, auth, isConfigured } = await import('../lib/firebase');
    return { db, auth, isConfigured };
  }, []);

  // Load comments
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    (async () => {
      const { db, isConfigured } = await getFirebaseModules();
      setConfigured(isConfigured);

      if (!db || !isConfigured) {
        setLoading(false);
        return;
      }

      const { collection, query, where, orderBy, onSnapshot } = await import('firebase/firestore');
      const q = query(
        collection(db, 'comments'),
        where('postSlug', '==', postSlug),
        orderBy('createdAt', 'asc'),
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Comment));
          setComments(docs);
          setLoading(false);
        },
        () => {
          setLoading(false);
        },
      );
    })();

    return () => unsubscribe?.();
  }, [postSlug, getFirebaseModules]);

  // Auth state
  useEffect(() => {
    (async () => {
      const { auth, isConfigured } = await getFirebaseModules();
      if (!auth || !isConfigured) return;

      const { onAuthStateChanged } = await import('firebase/auth');
      const unsub = onAuthStateChanged(auth, setUser);
      return () => unsub();
    })();
  }, [getFirebaseModules]);

  const handleLogin = async () => {
    const { auth } = await getFirebaseModules();
    if (!auth) return;
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  const handleLogout = async () => {
    const { auth } = await getFirebaseModules();
    if (!auth) return;
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!content.trim()) return;

    const { db } = await getFirebaseModules();
    if (!db) return;

    if (!user && !guestMode) return;

    if (guestMode) {
      if (!guestName.trim() || !guestPassword || guestPassword.length < 4) return;
    }

    setSubmitting(true);
    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');

      if (guestMode) {
        const passwordHash = await hashPassword(guestPassword);
        await addDoc(collection(db, 'comments'), {
          postSlug,
          author: guestName.trim(),
          authorUid: '',
          authorPhoto: '',
          content: content.trim(),
          createdAt: serverTimestamp(),
          updatedAt: null,
          isGuest: true,
          guestName: guestName.trim(),
          guestPasswordHash: passwordHash,
        });
      } else if (user) {
        await addDoc(collection(db, 'comments'), {
          postSlug,
          author: user.displayName || '익명',
          authorUid: user.uid,
          authorPhoto: user.photoURL || '',
          content: content.trim(),
          createdAt: serverTimestamp(),
          updatedAt: null,
        });
      }

      setContent('');
      if (guestMode) {
        setGuestPassword('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (comment: Comment) => {
    if (comment.isGuest) {
      const password = prompt('댓글 삭제를 위해 비밀번호를 입력하세요:');
      if (!password) return;
      const inputHash = await hashPassword(password);
      if (inputHash !== comment.guestPasswordHash) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
      }
    } else {
      if (!confirm('댓글을 삭제하시겠습니까?')) return;
    }

    const { db } = await getFirebaseModules();
    if (!db) return;

    const { doc, deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'comments', comment.id));
  };

  const canDelete = (comment: Comment): boolean => {
    if (comment.isGuest) return true;
    return user?.uid === comment.authorUid;
  };

  return (
    <section style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #e5e5e3' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: '#1a1a1a' }}>
        댓글
      </h2>

      {loading ? (
        <p style={{ color: '#888', fontSize: '0.875rem' }}>댓글을 불러오는 중...</p>
      ) : !configured ? (
        <p style={{ color: '#888', fontSize: '0.875rem' }}>
          댓글 기능이 아직 설정되지 않았습니다.
        </p>
      ) : (
        <>
          {/* Comment list */}
          {comments.length === 0 ? (
            <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!
            </p>
          ) : (
            <div style={{ marginBottom: '1.5rem' }}>
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    padding: '1rem 0',
                    borderBottom: '1px solid #e5e5e3',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                    {comment.authorPhoto ? (
                      <img
                        src={comment.authorPhoto}
                        alt={comment.author}
                        style={{ width: 32, height: 32, borderRadius: '50%' }}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: '#e5e5e3',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          color: '#888',
                        }}
                      >
                        {comment.author[0]}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1a1a1a' }}>
                        {comment.author}
                      </span>
                      {comment.isGuest && (
                        <span style={{ fontSize: '0.75rem', color: '#888' }}>(게스트)</span>
                      )}
                      {comment.createdAt && (
                        <span style={{ fontSize: '0.75rem', color: '#888' }}>
                          {formatRelativeTime(comment.createdAt.seconds)}
                        </span>
                      )}
                    </div>
                    {canDelete(comment) && (
                      <button
                        onClick={() => handleDelete(comment)}
                        style={{
                          marginLeft: 'auto',
                          background: 'none',
                          border: 'none',
                          color: '#888',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          padding: '0.25rem 0.5rem',
                        }}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.9375rem',
                      lineHeight: 1.7,
                      color: '#1a1a1a',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Auth + Form */}
          {user ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {user.photoURL && (
                    <img
                      src={user.photoURL}
                      alt=""
                      style={{ width: 24, height: 24, borderRadius: '50%' }}
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <span style={{ fontSize: '0.875rem', color: '#1a1a1a' }}>{user.displayName}</span>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#888',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                  }}
                >
                  로그아웃
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="댓글을 남겨보세요..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e5e3',
                    borderRadius: '0.5rem',
                    fontSize: '0.9375rem',
                    lineHeight: 1.6,
                    resize: 'vertical',
                    background: '#fff',
                    color: '#1a1a1a',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#888')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e5e3')}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    disabled={!content.trim() || submitting}
                    style={{
                      padding: '0.5rem 1.25rem',
                      background: content.trim() && !submitting ? '#1a1a1a' : '#e5e5e3',
                      color: content.trim() && !submitting ? '#fff' : '#888',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: content.trim() && !submitting ? 'pointer' : 'default',
                    }}
                  >
                    {submitting ? '작성 중...' : '댓글 작성'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div>
              <button
                onClick={handleLogin}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  background: '#fff',
                  border: '1px solid #e5e5e3',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  color: '#1a1a1a',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Google로 로그인하여 댓글을 남기세요
              </button>

              {/* Guest comment divider and toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: '#e5e5e3' }} />
                <span style={{ fontSize: '0.8125rem', color: '#888', whiteSpace: 'nowrap' }}>또는</span>
                <div style={{ flex: 1, height: '1px', background: '#e5e5e3' }} />
              </div>

              {!guestMode ? (
                <button
                  onClick={() => setGuestMode(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#888',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  로그인 없이 댓글 남기기
                </button>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="이름 (필수)"
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #e5e5e3',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        background: '#fff',
                        color: '#1a1a1a',
                        outline: 'none',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#888')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e5e3')}
                    />
                    <input
                      type="password"
                      value={guestPassword}
                      onChange={(e) => setGuestPassword(e.target.value)}
                      placeholder="비밀번호 (4자 이상)"
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #e5e5e3',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        background: '#fff',
                        color: '#1a1a1a',
                        outline: 'none',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#888')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e5e3')}
                    />
                  </div>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="댓글을 남겨보세요..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e5e5e3',
                      borderRadius: '0.5rem',
                      fontSize: '0.9375rem',
                      lineHeight: 1.6,
                      resize: 'vertical',
                      background: '#fff',
                      color: '#1a1a1a',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#888')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e5e3')}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button
                      type="submit"
                      disabled={!content.trim() || !guestName.trim() || guestPassword.length < 4 || submitting}
                      style={{
                        padding: '0.5rem 1.25rem',
                        background: content.trim() && guestName.trim() && guestPassword.length >= 4 && !submitting ? '#1a1a1a' : '#e5e5e3',
                        color: content.trim() && guestName.trim() && guestPassword.length >= 4 && !submitting ? '#fff' : '#888',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: content.trim() && guestName.trim() && guestPassword.length >= 4 && !submitting ? 'pointer' : 'default',
                      }}
                    >
                      {submitting ? '작성 중...' : '댓글 작성'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
