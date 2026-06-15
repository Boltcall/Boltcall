import { useEffect, useState } from 'react';

interface Heading {
  id: string;
  text: string;
  level: number;
}

/**
 * Hook to extract h2 headings from the page and generate IDs for them
 * Also ensures all h2 headings have IDs for navigation
 */
export const useTableOfContents = (): Heading[] => {
  const [headings, setHeadings] = useState<Heading[]>([]);

  useEffect(() => {
    // Function to generate a URL-friendly ID from text
    const generateId = (text: string): string => {
      return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    };

    // Wait for DOM to be ready
    const extractHeadings = () => {
      // Find all h2 headings in the article
      const article = document.querySelector('article');
      if (!article) return;

      const h2Elements = Array.from(article.querySelectorAll('h2'));
      const extractedHeadings: Heading[] = [];

      h2Elements.forEach((h2) => {
        // Clone the h2 element to extract text without modifying the original
        const clone = h2.cloneNode(true) as HTMLElement;
        // Remove decorative markers so the sidebar shows clean section titles.
        const decorativeDiv = clone.querySelector('.w-1');
        if (decorativeDiv) {
          decorativeDiv.remove();
        }
        clone.querySelectorAll('.toc-index').forEach((node) => node.remove());
        
        // Get the text content after removing the decorative div
        const headingText = clone.textContent?.trim() || '';

        if (!headingText) return;

        // Generate ID if it doesn't exist
        let id = h2.id || generateId(headingText);
        
        // Ensure ID is unique
        let uniqueId = id;
        let counter = 1;
        while (document.getElementById(uniqueId) && document.getElementById(uniqueId) !== h2) {
          uniqueId = `${id}-${counter}`;
          counter++;
        }
        
        h2.id = uniqueId;

        extractedHeadings.push({
          id: uniqueId,
          text: headingText,
          level: 2,
        });
      });

      if (extractedHeadings.length > 0) {
        setHeadings(extractedHeadings);
      }
    };

    // Run immediately and also after delays to ensure DOM is ready (especially for animated content)
    extractHeadings();
    const timeoutId1 = setTimeout(extractHeadings, 100);
    const timeoutId2 = setTimeout(extractHeadings, 500);
    const timeoutId3 = setTimeout(extractHeadings, 1000);
    const timeoutId4 = setTimeout(extractHeadings, 2000);

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      clearTimeout(timeoutId4);
    };
  }, []);

  return headings;
};
