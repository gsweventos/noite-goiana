import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Camera, Upload, Download, Trash2, Loader2, ImageOff } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { Spinner } from '@/components/Spinner';
import { useAuth } from '@/context/AuthContext';
import { photoService } from '@/services/photoService';
import { EVENT_ID } from '@/config/event';
import { EventPhoto } from '@/types';

export default function PhotoGallery() {
  const { isAdmin } = useAuth();
  const [fotos, setFotos] = useState<EventPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [baixando, setBaixando] = useState<string | null>(null);
  const [apagando, setApagando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function carregar() {
    setLoading(true);
    photoService.listar(EVENT_ID).then((data) => {
      setFotos(data);
      setLoading(false);
    });
  }

  useEffect(carregar, []);

  async function onFilesSelected(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setErro(null);
    setEnviando(true);
    try {
      for (const file of files) {
        setProgresso(0);
        await photoService.upload(file, EVENT_ID, setProgresso);
      }
      carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar as fotos.');
    } finally {
      setEnviando(false);
      setProgresso(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function baixar(foto: EventPhoto) {
    setBaixando(foto.id);
    try {
      await photoService.baixar(foto);
    } catch {
      alert('Não foi possível baixar essa foto agora.');
    } finally {
      setBaixando(null);
    }
  }

  async function apagar(foto: EventPhoto) {
    if (!confirm('Apagar essa foto? Não tem como desfazer.')) return;
    setApagando(foto.id);
    try {
      await photoService.apagar(foto);
      setFotos((prev) => prev.filter((f) => f.id !== foto.id));
    } catch {
      alert('Não foi possível apagar essa foto agora.');
    } finally {
      setApagando(null);
    }
  }

  return (
    <>
      <Seo title="Fotos da festa" />

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-600/15 p-2.5 text-violet-400">
              <Camera size={20} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white">Fotos da festa</h1>
              <p className="text-sm text-white/50">Baixa suas fotos favoritas em qualidade original.</p>
            </div>
          </div>

          {isAdmin && (
            <div>
              <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={onFilesSelected} />
              <button
                onClick={() => inputRef.current?.click()}
                disabled={enviando}
                className="flex items-center gap-2 rounded-full bg-cta-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-neon disabled:opacity-70"
              >
                {enviando ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {enviando ? `Enviando... ${progresso}%` : 'Adicionar fotos'}
              </button>
            </div>
          )}
        </div>

        {erro && <p className="mt-4 text-sm text-red-400">{erro}</p>}

        {loading && <Spinner fullScreen />}

        {!loading && fotos.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
            <ImageOff className="mx-auto text-white/30" size={32} />
            <p className="mt-3 font-medium text-white">Nenhuma foto ainda</p>
            <p className="mt-1 text-sm text-white/40">
              {isAdmin ? 'Clica em "Adicionar fotos" pra começar a subir.' : 'As fotos aparecem aqui assim que a organização postar.'}
            </p>
          </div>
        )}

        {!loading && fotos.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {fotos.map((foto) => (
              <div key={foto.id} className="group relative aspect-square overflow-hidden rounded-xl bg-white/5">
                <img src={foto.url} alt="Foto da festa" className="h-full w-full object-cover" loading="lazy" />
                <div className="absolute inset-0 flex items-end justify-end gap-1.5 bg-gradient-to-t from-black/70 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => baixar(foto)}
                    disabled={baixando === foto.id}
                    className="rounded-full bg-white/15 p-2 text-white backdrop-blur hover:bg-white/25 disabled:opacity-50"
                    aria-label="Baixar foto"
                  >
                    {baixando === foto.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => apagar(foto)}
                      disabled={apagando === foto.id}
                      className="rounded-full bg-red-500/25 p-2 text-white backdrop-blur hover:bg-red-500/40 disabled:opacity-50"
                      aria-label="Apagar foto"
                    >
                      {apagando === foto.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
