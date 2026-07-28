import { useEffect } from 'react';

interface SeoProps {
  title: string;
  description?: string;
  image?: string;
}

/**
 * Componente leve de SEO: atualiza title/description/OG dinamicamente por página,
 * sem depender de bibliotecas externas (evita custo extra de bundle).
 * O index.html já carrega as meta tags padrão para o primeiro paint / crawlers simples.
 */
export function Seo({ title, description, image }: SeoProps) {
  useEffect(() => {
    const fullTitle = `${title} | Noite Goiana`;
    document.title = fullTitle;

    const setMeta = (selector: string, content: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute('content', content);
    };

    if (description) {
      setMeta('meta[name="description"]', description);
      setMeta('meta[property="og:description"]', description);
      setMeta('meta[name="twitter:description"]', description);
    }
    setMeta('meta[property="og:title"]', fullTitle);
    setMeta('meta[name="twitter:title"]', fullTitle);
    if (image) {
      setMeta('meta[property="og:image"]', image);
      setMeta('meta[name="twitter:image"]', image);
    }
  }, [title, description, image]);

  return null;
}
