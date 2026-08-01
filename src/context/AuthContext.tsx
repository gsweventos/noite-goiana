import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppUser, UserRole } from '@/types';
import { USE_MOCK, auth } from '@/lib/firebase';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  loginWithEmail: (email: string, senha: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (nome: string, email: string, senha: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Usuários fictícios do modo demonstração (sem Firebase configurado)
const MOCK_USERS: Record<string, AppUser & { senha: string }> = {
  'cliente@noitegoiana.com.br': {
    id: 'user-cliente',
    nome: 'Maria Silva',
    email: 'cliente@noitegoiana.com.br',
    role: 'cliente',
    senha: '123456',
    criadoEm: '2026-01-10T10:00:00-03:00',
  },
  'admin@noitegoiana.com.br': {
    id: 'user-admin',
    nome: 'Equipe Noite Goiana',
    email: 'admin@noitegoiana.com.br',
    role: 'admin',
    senha: '123456',
    criadoEm: '2026-01-01T10:00:00-03:00',
  },
};

const STORAGE_KEY = 'noitegoiana:mock-session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (USE_MOCK) {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
      setLoading(false);
      return;
    }

    let unsubscribe = () => {};
    // Proteção extra: em navegadores restritos (o "navegador interno" de
    // apps como Instagram, Facebook, TikTok costuma bloquear/limitar o
    // armazenamento que o Firebase usa pra confirmar sessão), o Firebase
    // pode nunca chamar de volta. Sem isso, a pessoa ficaria vendo a tela
    // de carregando pra sempre em qualquer página que exige login. Depois
    // de 8s sem resposta, assume "não logado" e libera a navegação — se a
    // sessão existir de verdade, o Firebase ainda pode confirmar depois e
    // atualizar normalmente.
    const timeoutId = setTimeout(() => setLoading(false), 8000);

    (async () => {
      const { onAuthStateChanged } = await import('firebase/auth');
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      unsubscribe = onAuthStateChanged(auth!, async (fbUser) => {
        clearTimeout(timeoutId);
        if (!fbUser) {
          setUser(null);
          setLoading(false);
          return;
        }
        let role: UserRole = 'cliente';
        try {
          const snap = await getDoc(doc(db!, 'users', fbUser.uid));
          role = snap.exists() ? (snap.data().role ?? 'cliente') : 'cliente';
        } catch (err) {
          // Se o Firestore falhar (regras ainda não publicadas, etc.), o login
          // continua funcionando como "cliente" em vez de travar carregando.
          console.error('Não foi possível carregar o perfil do usuário no Firestore:', err);
        }
        setUser({
          id: fbUser.uid,
          nome: fbUser.displayName ?? 'Usuário',
          email: fbUser.email ?? '',
          role,
          fotoUrl: fbUser.photoURL ?? undefined,
          criadoEm: fbUser.metadata.creationTime ?? new Date().toISOString(),
        });
        setLoading(false);
      });
    })();
    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  async function loginWithEmail(email: string, senha: string) {
    if (USE_MOCK) {
      const found = MOCK_USERS[email];
      if (!found || found.senha !== senha) throw new Error('E-mail ou senha inválidos.');
      const { senha: _s, ...rest } = found;
      setUser(rest);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
      return;
    }
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    await signInWithEmailAndPassword(auth!, email, senha);
  }

  async function loginWithGoogle() {
    if (USE_MOCK) {
      const rest = MOCK_USERS['cliente@noitegoiana.com.br'];
      const { senha: _s, ...user } = rest;
      setUser(user);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      return;
    }
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
    await signInWithPopup(auth!, new GoogleAuthProvider());
  }

  async function register(nome: string, email: string, senha: string) {
    if (USE_MOCK) {
      const newUser: AppUser = { id: `user-${Date.now()}`, nome, email, role: 'cliente', criadoEm: new Date().toISOString() };
      setUser(newUser);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      return;
    }
    const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
    const { doc, setDoc } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');
    const cred = await createUserWithEmailAndPassword(auth!, email, senha);
    await updateProfile(cred.user, { displayName: nome });
    await setDoc(doc(db!, 'users', cred.user.uid), { nome, email, role: 'cliente', criadoEm: new Date().toISOString() });

    // O Firebase NÃO dispara onAuthStateChanged de novo só porque o nome do
    // perfil mudou (updateProfile não conta como "mudança de sessão") — sem
    // isso aqui, o app ficaria mostrando "Usuário" até a pessoa sair e
    // entrar de novo, mesmo o nome já estando salvo certinho no perfil.
    setUser({
      id: cred.user.uid,
      nome,
      email,
      role: 'cliente',
      criadoEm: new Date().toISOString(),
    });
  }

  async function resetPassword(email: string) {
    if (USE_MOCK) return;
    const { sendPasswordResetEmail } = await import('firebase/auth');
    await sendPasswordResetEmail(auth!, email);
  }

  async function logout() {
    if (USE_MOCK) {
      setUser(null);
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    const { signOut } = await import('firebase/auth');
    await signOut(auth!);
  }

  const value: AuthContextValue = {
    user,
    loading,
    loginWithEmail,
    loginWithGoogle,
    register,
    resetPassword,
    logout,
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
