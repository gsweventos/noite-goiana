import { EventPhoto } from '@/types';
import { auth, db, storage, USE_MOCK } from '@/lib/firebase';

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

  /** Sobe uma foto pro Storage e registra ela no Firestore. Só funciona logado como admin (as regras conferem de novo). */
  async upload(file: File, eventoId: string, onProgress?: (percent: number) => void): Promise<void> {
    const uid = auth?.currentUser?.uid;
    if (!uid) throw new Error('Sessão expirada — faça login de novo.');

    const { ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
    const { collection, addDoc } = await import('firebase/firestore');

    const nomeArquivo = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const caminho = `photos/${eventoId}/${nomeArquivo}`;
    const storageRef = ref(storage!, caminho);

    await new Promise<void>((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file);
      task.on(
        'state_changed',
        (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        reject,
        () => resolve()
      );
    });

    const url = await getDownloadURL(storageRef);

    await addDoc(collection(db!, 'photos'), {
      url,
      path: caminho,
      eventoId,
      criadoEm: new Date().toISOString(),
      criadoPor: uid,
    });
  },

  /** Apaga uma foto (Storage + Firestore). Só admin — as regras conferem de novo. */
  async apagar(foto: EventPhoto): Promise<void> {
    const { ref, deleteObject } = await import('firebase/storage');
    const { doc, deleteDoc } = await import('firebase/firestore');
    try {
      await deleteObject(ref(storage!, foto.path));
    } catch {
      // Se o arquivo já não existir no Storage, tudo bem — ainda assim
      // removemos o registro do Firestore pra não sobrar foto "fantasma".
    }
    await deleteDoc(doc(db!, 'photos', foto.id));
  },

  /** Baixa a foto de verdade (força o download, não só abre numa aba nova). */
  async baixar(foto: EventPhoto): Promise<void> {
    const res = await fetch(foto.url);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = foto.path.split('/').pop() ?? 'foto.jpg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
