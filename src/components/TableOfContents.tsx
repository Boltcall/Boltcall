import React, { useState, useEffect } from 'react';
import { Facebook, Linkedin } from 'lucide-react';

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  headings: Heading[];
  socialLinks?: Array<{
    label: 'Facebook' | 'X' | 'LinkedIn';
    href: string;
  }>;
  cta?: {
    title: string;
    body: string;
    href: string;
    label: string;
  };
}

const XLogo: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const socialIcon = (label: 'Facebook' | 'X' | 'LinkedIn') => {
  if (label === 'Facebook') return <Facebook className="w-3.5 h-3.5" strokeWidth={2.25} />;
  if (label === 'LinkedIn') return <Linkedin className="w-3.5 h-3.5" strokeWidth={2.25} />;
  return <XLogo />;
};

const TableOfContents: React.FC<TableOfContentsProps> = ({ headings, socialLinks = [], cta }) => {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (headings.length === 0) return;

    const observerOptions = {
      root: null,
      rootMargin: '-100px 0px -60% 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1],
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      // Find the entry with the highest intersection ratio that is currently visible
      const visibleEntries = entries.filter(entry => entry.isIntersecting);
      if (visibleEntries.length > 0) {
        // Sort by intersection ratio (highest first) and then by position (topmost first)
        visibleEntries.sort((a, b) => {
          if (Math.abs(b.intersectionRatio - a.intersectionRatio) > 0.1) {
            return b.intersectionRatio - a.intersectionRatio;
          }
          return a.boundingClientRect.top - b.boundingClientRect.top;
        });
        setActiveId(visibleEntries[0].target.id);
      }
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all heading elements
    const elements = headings
      .map(heading => document.getElementById(heading.id))
      .filter((el): el is HTMLElement => el !== null);

    elements.forEach((element) => {
      observer.observe(element);
    });

    // Set the first heading as active initially
    if (elements.length > 0) {
      setActiveId(headings[0].id);
    }

    return () => {
      observer.disconnect();
    };
  }, [headings]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -100; // Offset for sticky header
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveId(id);
    }
  };

  if (headings.length === 0) {
    return null;
  }

  return (
    <aside className="hidden lg:block w-64 flex-shrink-0">
      <div
        className="sticky"
        style={{
          position: 'sticky',
          top: '96px',
          maxHeight: 'calc(100vh - 112px)',
          overflowY: 'auto',
          zIndex: 10
        }}
      >
        <div className="border-l-2 border-gray-200 pl-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              On this page
            </h3>
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-1.5">
                {socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Boltcall on ${link.label}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-900"
                  >
                    {socialIcon(link.label)}
                  </a>
                ))}
              </div>
            )}
          </div>
          <nav className="space-y-2">
            {headings.map((heading) => (
              <a
                key={heading.id}
                href={`#${heading.id}`}
                onClick={(e) => handleClick(e, heading.id)}
                className={`block text-sm transition-colors duration-200 hover:text-blue-600 ${
                  activeId === heading.id
                    ? 'text-blue-600 font-semibold'
                    : 'text-gray-600'
                }`}
                style={{
                  paddingLeft: `${(heading.level - 2) * 12}px`,
                }}
              >
                {heading.text}
              </a>
            ))}
          </nav>
          {cta && (
            <div className="mt-6 border-t border-gray-200 pt-5">
              <p className="text-sm font-semibold text-gray-900">{cta.title}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">{cta.body}</p>
              <a
                href={cta.href}
                className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                {cta.label}
              </a>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default TableOfContents;
