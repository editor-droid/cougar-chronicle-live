export const SECTION_POSTS_PER_PAGE = 18;

export type SectionSort = 'asc' | 'desc';

export function parseSectionQuery(input: {
  page?: string | null;
  sort?: string | null;
}): { page: number; sort: SectionSort } {
  const parsed = parseInt(input.page || '1', 10);
  const page = Math.max(1, Number.isFinite(parsed) ? parsed : 1);
  const sort: SectionSort = input.sort === 'oldest' ? 'asc' : 'desc';
  return { page, sort };
}
