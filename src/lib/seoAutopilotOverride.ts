export type SeoAutopilotOverride = {
  intro?: string;
  answer_title?: string;
  answer_paragraphs?: string[];
  links?: Array<{ label: string; href: string }>;
  updated_at?: string;
};

export type AnswerBox = {
  title: string;
  paragraphs: string[];
  links: Array<{ label: string; href: string }>;
};

// The answer block renders as a highlighted box at the very top of the
// article (Neil Patel style), not as a numbered section — see
// CanonicalBlogArticlePage. This helper only overrides the intro copy.
export function applySeoAutopilotOverride<T extends { path: string; intro: string }>(article: T, override?: SeoAutopilotOverride): T {
  if (!override) return article;
  return { ...article, intro: override.intro || article.intro };
}

export function answerBoxFromOverride(override?: SeoAutopilotOverride): AnswerBox | null {
  if (!override?.answer_title || !override.answer_paragraphs?.length) return null;
  return {
    title: override.answer_title,
    paragraphs: override.answer_paragraphs,
    links: override.links ?? [],
  };
}
