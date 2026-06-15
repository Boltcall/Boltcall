const BLOG_PREVIEW_BASE = '/images/blog/previews';

export function blogPreviewKey(pathname: string) {
  const clean = pathname
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/\/$/, '')
    .replace(/^\//, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return clean || 'blog';
}

export function getBlogPreviewImage(pathname: string) {
  return `${BLOG_PREVIEW_BASE}/${blogPreviewKey(pathname)}.svg`;
}

export function getAbsoluteBlogPreviewImage(pathname: string) {
  return `https://boltcall.org${getBlogPreviewImage(pathname)}`;
}

export function updateBlogPreviewMeta(pathname: string, title: string, description: string) {
  const values: Record<string, string> = {
    'og:title': title,
    'og:description': description,
    'og:image': getAbsoluteBlogPreviewImage(pathname),
    'og:image:width': '1200',
    'og:image:height': '675',
    'twitter:card': 'summary_large_image',
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': getAbsoluteBlogPreviewImage(pathname),
  };

  const touched: HTMLMetaElement[] = [];

  Object.entries(values).forEach(([name, content]) => {
    const attr = name.startsWith('og:') ? 'property' : 'name';
    let meta = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute(attr, name);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
    touched.push(meta);
  });

  return () => {
    touched.forEach((meta) => {
      meta.remove();
    });
  };
}
