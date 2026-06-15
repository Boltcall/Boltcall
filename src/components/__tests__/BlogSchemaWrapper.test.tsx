import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import BlogSchemaWrapper from '../BlogSchemaWrapper';

describe('BlogSchemaWrapper', () => {
  it('marks blog article routes with the canonical article surface', () => {
    render(
      <MemoryRouter initialEntries={['/blog/hvac-ai-lead-response']}>
        <Routes>
          <Route element={<BlogSchemaWrapper />}>
            <Route path="/blog/hvac-ai-lead-response" element={<main>Article</main>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Article').parentElement).toHaveClass('canonical-blog-article');
  });

  it('does not apply article UI overrides to the blog index', () => {
    render(
      <MemoryRouter initialEntries={['/blog']}>
        <Routes>
          <Route element={<BlogSchemaWrapper />}>
            <Route path="/blog" element={<main>Blog index</main>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Blog index').parentElement).not.toHaveClass('canonical-blog-article');
  });
});
