import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Chrome, Loader2 } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';

type Mode = 'login' | 'cadastro' | 'recuperar';

export default function Login() {
  const [mode, setMode] = useState<Mode>('login');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { user, loginWithEmail, loginWithGoogle, register, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/painel';

  // Só redireciona quando o contexto realmente confirmar que o usuário está
  // logado — evita o caso de navegar pro /painel um instante antes dessa
  // confirmação chegar, o que fazia a página protegida devolver a pessoa
  // pro /login mesmo o login tendo funcionado.
  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, from, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setMensagem(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(email, senha);
      } else if (mode === 'cadastro') {
        await register(nome, email, senha);
      } else {
        await resetPassword(email);
        setMensagem('Se o e-mail existir em nossa base, enviaremos um link de redefinição.');
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Algo deu errado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Seo title={mode === 'login' ? 'Entrar' : mode === 'cadastro' ? 'Criar conta' : 'Recuperar senha'} />

      <section className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-14 sm:px-6">
        <div className="mb-8 text-center">
          <Link to="/"><Logo className="text-2xl" /></Link>
        </div>

        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8"
        >
          <h1 className="font-display text-xl font-bold text-white">
            {mode === 'login' ? 'Entrar na sua conta' : mode === 'cadastro' ? 'Criar conta' : 'Recuperar senha'}
          </h1>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'cadastro' && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-white/60">Nome completo</span>
                <input required value={nome} onChange={(e) => setNome(e.target.value)} className="input" />
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/60">E-mail</span>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="voce@email.com" />
            </label>

            {mode !== 'recuperar' && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-white/60">Senha</span>
                <input required type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="input" minLength={6} />
              </label>
            )}

            {erro && <p className="text-sm text-red-400">{erro}</p>}
            {mensagem && <p className="text-sm text-emerald-400">{mensagem}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-cta-gradient px-6 py-3 text-sm font-semibold text-white shadow-neon disabled:opacity-70"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {mode === 'login' ? 'Entrar' : mode === 'cadastro' ? 'Criar conta' : 'Enviar link'}
            </button>
          </form>

          {mode !== 'recuperar' && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-white/30">
                <div className="h-px flex-1 bg-white/10" /> ou <div className="h-px flex-1 bg-white/10" />
              </div>
              <button
                onClick={() => loginWithGoogle()}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-white hover:border-white/30"
              >
                <Chrome size={16} /> Continuar com Google
              </button>
            </>
          )}

          <div className="mt-6 flex flex-col items-center gap-2 text-xs text-white/50">
            {mode === 'login' && (
              <>
                <button onClick={() => setMode('recuperar')} className="hover:text-white">Esqueci minha senha</button>
                <span>
                  Não tem conta?{' '}
                  <button onClick={() => setMode('cadastro')} className="font-medium text-violet-400 hover:text-violet-300">Cadastre-se</button>
                </span>
              </>
            )}
            {mode !== 'login' && (
              <button onClick={() => setMode('login')} className="hover:text-white">Voltar para o login</button>
            )}
          </div>
        </motion.div>
      </section>
    </>
  );
}
