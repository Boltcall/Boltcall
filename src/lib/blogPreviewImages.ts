const BLOG_PREVIEW_BASE = '/images/blog/previews';
const BLOG_BODY_BASE = '/images/blog/body';
export const BLOG_BODY_IMAGE_LABELS = ['Key stat', 'How it works', 'Boltcall in action'] as const;

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

// slot is 1, 2, or 3 — matches the 3 images generate-blog-body-images.mjs
// writes per post (see BLOG_BODY_IMAGE_LABELS for what each slot depicts).
export function getBlogBodyImage(pathname: string, slot: 1 | 2 | 3) {
  return `${BLOG_BODY_BASE}/${blogPreviewKey(pathname)}-${slot}.svg`;
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
