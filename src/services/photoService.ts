import { EventPhoto } from '@/types';
import { auth, db, USE_MOCK } from '@/lib/firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

export const photoService = {
  /** Lista as fotos do evento, mais recentes primeiro. */
  async listar(eventoId: string): Promise<EventPhoto[]> {
    if (USE_MOCK) return [];
    try {
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const q = query(collection(db!, 'photos'), where('eventoId', '==', eventoId));
      const snap = await getDocs(q);
      const fotos = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as EventPhoto);
      return fotos.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
    } catch (err) {
      console.error('Não foi possível carregar as fotos:', err);
      return [];
    }
  },

  /**
   * Sobe uma foto direto do navegador pro Vercel Blob (o backend só gera um
   * token de permissão — o arquivo em si nunca passa pela nossa função,
   * evitando limite de tamanho). Depois registra os metadados no Firestore.
   * Só funciona logado como admin (o backend reconfere isso de novo).
   */
  async upload(file: File, eventoId: string, onProgress?: (percent: number) => void): Promise<void> {
    if (!API_BASE_URL) throw new Error('Upload de fotos não disponível no modo demonstração.');

    const token = await auth?.currentUser?.getIdToken();
    if (!token) throw new Error('Sessão expirada — faça login de novo.');

    const { upload } = await import('@vercel/blob/client');
    const blob = await upload(`photos/${eventoId}/${Date.now()}-${file.name}`, file, {
      access: 'public',
      handleUploadUrl: `${API_BASE_URL}/photos-upload`,
      clientPayload: token, // vai pro onBeforeGenerateToken do backend, que confere se é admin
      onUploadProgress: (evento) => onProgress?.(Math.round(evento.percentage)),
    });

    const { collection, addDoc } = await import('firebase/firestore');
    await addDoc(collection(db!, 'photos'), {
      url: blob.url,
      path: blob.url, // no Vercel Blob, a própria URL é usada pra apagar depois
      eventoId,
      criadoEm: new Date().toISOString(),
      criadoPor: auth!.currentUser!.uid,
    });
  },

  /** Apaga uma foto (Vercel Blob + Firestore). Só admin — o backend reconfere isso de novo. */
  async apagar(foto: EventPhoto): Promise<void> {
    if (!API_BASE_URL) throw new Error('Não disponível no modo demonstração.');

    const token = await auth?.currentUser?.getIdToken();
    if (!token) throw new Error('Sessão expirada — faça login de novo.');

    const res = await fetch(`${API_BASE_URL}/photos-upload`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ url: foto.path }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? 'Não foi possível apagar a foto.');
    }

    const { doc, deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db!, 'photos', foto.id));
  },

  /** Baixa a foto de verdade (força o download, não só abre numa aba nova). */
  async baixar(foto: EventPhoto): Promise<void> {
    const res = await fetch(foto.url);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = foto.url.split('/').pop() ?? 'foto.jpg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
