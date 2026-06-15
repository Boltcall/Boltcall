import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { createPersonSchema, injectSchemas } from '../lib/schema';

/**
 * Layout wrapper for all blog/article routes.
 * Injects Person schema (author signal) on every blog page without
 * modifying individual page components.
 */
export default function BlogSchemaWrapper() {
  const location = useLocation();
  const isBlogArticle = location.pathname.startsWith('/blog/');

  useEffect(() => {
    return injectSchemas([createPersonSchema('Boltcall Team')]);
  }, []);

  return (
    <div className={isBlogArticle ? 'canonical-blog-article' : undefined}>
      <Outlet />
    </div>
  );
}
