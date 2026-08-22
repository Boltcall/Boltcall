export type SeoAutopilotOverride = {
  intro?: string;
  answer_title?: string;
  answer_paragraphs?: string[];
  links?: Array<{ label: string; href: string }>;
  updated_at?: string;
  // 2-3 custom-written H2 sections spliced in right after the (templated)
  // Key Takeaways section — real per-post substance beyond the generic
  // intent template, keeping articles unique instead of boilerplate.
  body_sections?: Array<{ title: string; paragraphs: string[] }>;
};

export type AnswerBox = {
  title: string;
  paragraphs: string[];
  links: Array<{ label: string; href: string }>;
};

type ArticleWithSections = {
  path: string;
  intro: string;
  sections: Array<{ title: string; paragraphs?: string[] }>;
};

// The answer block renders as a highlighted box at the very top of the
// article (Neil Patel style), not as a numbered section — see
// CanonicalBlogArticlePage. This also splices any custom body_sections in
// right after sections[0] (Key Takeaways, always first).
export function applySeoAutopilotOverride<T extends ArticleWithSections>(article: T, override?: SeoAutopilotOverride): T {
  if (!override) return article;
  const customSections = override.body_sections ?? [];
  const sections = customSections.length
    ? [...article.sections.slice(0, 1), ...customSections, ...article.sections.slice(1)]
    : article.sections;
  return { ...article, intro: override.intro || article.intro, sections };
}

export function answerBoxFromOverride(override?: SeoAutopilotOverride): AnswerBox | null {
  if (!override?.answer_title || !override.answer_paragraphs?.length) return null;
  return {
    title: override.answer_title,
    paragraphs: override.answer_paragraphs,
    links: override.links ?? [],
  };
}
