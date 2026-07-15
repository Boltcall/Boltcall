export type SeoAutopilotOverride = {
  intro?: string;
  answer_title?: string;
  answer_paragraphs?: string[];
  links?: Array<{ label: string; href: string }>;
  updated_at?: string;
};

export function applySeoAutopilotOverride<T extends { path: string; intro: string; sections: Array<{ title: string; paragraphs?: string[]; links?: Array<{ label: string; href: string }> }> }>(article: T, override?: SeoAutopilotOverride): T {
  if (!override) return article;
  const answerSection = override.answer_title && override.answer_paragraphs?.length
    ? [{ title: override.answer_title, paragraphs: override.answer_paragraphs, links: override.links }]
    : [];
  return { ...article, intro: override.intro || article.intro, sections: [...answerSection, ...article.sections] };
}
