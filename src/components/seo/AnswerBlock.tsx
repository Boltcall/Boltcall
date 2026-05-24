import React from 'react';

/**
 * AnswerBlock — the AIO-chunkable direct-answer pattern.
 *
 * Drop this as the FIRST content block on any high-priority page. Google AI
 * Overview, ChatGPT, Perplexity, and Gemini physically slice page content into
 * chunks and quote one. This component is structured so the entire block is
 * exactly one chunk: a self-contained 60–120 word answer to the page's primary
 * query, in the format AI engines extract.
 *
 * Format (the format AI engines cite verbatim):
 *   1. Definition sentence  — what is it
 *   2. Stat / mechanism sentence — specific number or how it works
 *   3. Outcome sentence — what changes if you use it
 *
 * Why this pattern wins under the May 2026 Google Core Update:
 *   - AIO appears on 48% of queries and prefers complete-sentence answers
 *     with a stat in the first 150 words.
 *   - Cited sites get 35% MORE clicks than the standard #1 organic result.
 *   - ChatGPT/Claude only cite pages with dateModified within 80/62 days,
 *     so this MUST live on pages where dateModified is also kept fresh
 *     (see `src/lib/seoConstants.ts`).
 */

export interface AnswerBlockProps {
  /** The primary query this page answers. Used for the visible "Q:" line + aria-label. */
  query: string;
  /** Sentence 1: definition. What is the thing? */
  definition: string;
  /** Sentence 2: specific stat or mechanism. Numbers + named features. */
  stat: string;
  /** Sentence 3: outcome. What changes for the reader. */
  outcome: string;
  /** Optional 4th: CTA sentence. Keep <15 words. */
  cta?: string;
  /** Tailwind className override on the outer <section>. */
  className?: string;
}

const AnswerBlock: React.FC<AnswerBlockProps> = ({
  query,
  definition,
  stat,
  outcome,
  cta,
  className,
}) => {
  return (
    <section
      aria-label={`Direct answer: ${query}`}
      className={
        className ??
        'bg-blue-50 border border-blue-100 rounded-xl px-5 py-5 sm:px-6 sm:py-6 my-6 sm:my-8 max-w-3xl mx-auto'
      }
    >
      <p className="text-[10px] font-bold tracking-widest uppercase text-blue-700 mb-2">
        Quick Answer
      </p>
      <p className="text-sm sm:text-base text-gray-900 leading-relaxed">
        <span className="font-semibold">{query}: </span>
        {definition} {stat} {outcome}
        {cta ? ` ${cta}` : ''}
      </p>
    </section>
  );
};

export default AnswerBlock;
