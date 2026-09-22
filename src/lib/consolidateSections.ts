import type { Section } from '@/types/checklist';

const stripLeadingNumbering = (title: string) =>
 title.replace(/^\s*\d+(?:\.\d+)*\.\s*/, '').trim();

/**
 * Consolidates many sections into 3 broad categories while preserving question order.
 * Intended for the prototype's seeded checklists.
 */
export function consolidateSectionsToThree(sections: Section[]): Section[] {
 if (sections.length <= 3) return sections;

 const buckets: Array<{ title: string; sections: Section[] }> = [
 { title: 'Quality Management & Risk Assessment', sections: [] },
 { title: 'Financial Information & Basis of Accounting', sections: [] },
 { title: 'Third-Party Use & Quality Review', sections: [] },
 ];

 const pickBucket = (title: string) => {
 const t = stripLeadingNumbering(title).toLowerCase();
 if (t.includes('quality') || t.includes('risk') || t.includes('engagement')) return 0;
 if (t.includes('financial') || t.includes('basis') || t.includes('intended use')) return 1;
 if (t.includes('third') || t.includes('review')) return 2;
 return 2;
 };

 for (const s of sections) {
 buckets[pickBucket(s.title)].sections.push(s);
 }

 const consolidated: Section[] = buckets
.filter((b) => b.sections.length > 0)
.map((b, i) => {
 const questions = b.sections.flatMap((s) => s.questions);
 const isExpanded = b.sections.some((s) => s.isExpanded !== false);
 return {
 id: b.sections[0].id ?? `section-${i + 1}`,
 title: b.title,
 questions,
 isExpanded,
 };
 });

 return consolidated.length ? consolidated : sections;
}
