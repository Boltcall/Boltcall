import { getBlogBodyImage, BLOG_BODY_IMAGE_LABELS } from '../../lib/blogPreviewImages';

interface BlogInlineImageProps {
  pathname: string;
  slot: 1 | 2 | 3;
}

// One of the 2-3 on-brand break images generate-blog-body-images.mjs writes
// per post — keeps long articles visually broken up without hand-sourced
// photography. See BLOG_BODY_IMAGE_LABELS for what each slot depicts.
export default function BlogInlineImage({ pathname, slot }: BlogInlineImageProps) {
  return (
    <img
      src={getBlogBodyImage(pathname, slot)}
      alt={BLOG_BODY_IMAGE_LABELS[slot - 1]}
      loading="lazy"
      className="my-10 w-full rounded-xl border border-gray-200"
      width={1200}
      height={500}
    />
  );
}
