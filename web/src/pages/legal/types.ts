/**
 * Legal page content, one module per language (en.ts, so.ts, am.ts, sw.ts).
 *
 * Text is plain strings with three light markers, so a translator edits words
 * and never JSX:
 *   **bold**              strong text
 *   [label](/path)        an in-app link
 *   {email}               the contact address, as a mailto link
 */
export type Block = { p: string } | { list: string[] };

export interface LegalSection {
  title: string;
  blocks: Block[];
}

export interface LegalDoc {
  title: string;
  /** For search engines and link previews. */
  description: string;
  intro: string;
  sections: LegalSection[];
}

export interface LegalContent {
  /** "Last updated 30 September 2026", already localised. */
  updated: string;
  /** Shown on translated pages only: which version prevails. */
  translationNotice?: string;
  back: string;
  privacy: LegalDoc;
  terms: LegalDoc;
  guidelines: LegalDoc;
}
