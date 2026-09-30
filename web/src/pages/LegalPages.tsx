import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Skeleton } from '../components/ui/index.js';
import { useSeo } from '../hooks/useSeo.js';
import { useI18n, type LanguageCode } from '../i18n/index.js';
import { en } from './legal/en.js';
import type { Block, LegalContent, LegalDoc } from './legal/types.js';

const CONTACT_EMAIL = 'abadirhassan10@gmail.com';

/**
 * Translations are fetched only when chosen, like the UI dictionaries: most
 * visitors read one language, and each one is ~20 KB of legal text. English
 * is imported directly because it is the fallback and the authoritative text.
 */
const loaders: Record<Exclude<LanguageCode, 'en'>, () => Promise<LegalContent>> = {
  so: () => import('./legal/so.js').then((m) => m.so),
  am: () => import('./legal/am.js').then((m) => m.am),
  sw: () => import('./legal/sw.js').then((m) => m.sw),
};

function useLegalContent(): { content: LegalContent; loading: boolean } {
  const { language } = useI18n();
  const [loaded, setLoaded] = useState<{ language: LanguageCode; content: LegalContent } | null>(
    null,
  );

  useEffect(() => {
    if (language === 'en') return;
    let cancelled = false;
    loaders[language]()
      .then((content) => {
        if (!cancelled) setLoaded({ language, content });
      })
      // A failed chunk leaves the English text in place rather than a blank page.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [language]);

  if (language === 'en') return { content: en, loading: false };
  if (loaded?.language === language) return { content: loaded.content, loading: false };
  return { content: en, loading: true };
}

/** Renders **bold**, [label](/path) and {email} inside a translated string. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|\{email\})/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part === '{email}') {
          return (
            <a
              key={index}
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-brand hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          );
        }
        const bold = /^\*\*([^*]+)\*\*$/.exec(part);
        if (bold) {
          return (
            <strong key={index} className="text-text-primary">
              {bold[1]}
            </strong>
          );
        }
        const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
        if (link) {
          return (
            <Link key={index} to={link[2]!} className="font-medium text-brand hover:underline">
              {link[1]}
            </Link>
          );
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </>
  );
}

function BlockView({ block }: { block: Block }): ReactNode {
  if ('p' in block) {
    return (
      <p>
        <Rich text={block.p} />
      </p>
    );
  }
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {block.list.map((item, index) => (
        <li key={index}>
          <Rich text={item} />
        </li>
      ))}
    </ul>
  );
}

function LegalDocument({ pick, path }: { pick: (content: LegalContent) => LegalDoc; path: string }) {
  const { content, loading } = useLegalContent();
  const doc = pick(content);

  useSeo({ title: doc.title, description: doc.description, path });

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary">
        {doc.title}
      </h1>
      <p className="mt-2 text-sm text-text-muted">{content.updated}</p>

      {content.translationNotice ? (
        <p className="mt-4 rounded-(--radius-field) border border-border-subtle bg-surface-raised px-4 py-3 text-xs leading-relaxed text-text-secondary">
          {content.translationNotice}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-8 space-y-3" aria-busy="true">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm leading-relaxed text-text-secondary">
            <Rich text={doc.intro} />
          </p>

          {doc.sections.map((section) => (
            <section key={section.title} className="mt-8">
              <h2 className="font-display text-lg font-bold text-text-primary">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-text-secondary">
                {section.blocks.map((block, index) => (
                  <BlockView key={index} block={block} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      <p className="mt-10 text-sm">
        <Link to="/" className="font-medium text-brand hover:underline">
          {content.back}
        </Link>
      </p>
    </article>
  );
}

/**
 * The privacy policy. It describes what the code actually stores (see
 * supabase/migrations): when a feature starts collecting something new, the
 * text in ./legal/*.ts has to change with it, English first.
 */
export function PrivacyPage() {
  return <LegalDocument pick={(c) => c.privacy} path="/legal/privacy" />;
}

/**
 * The terms of service. They follow what the product does: listings can be
 * held for review, rejected, suspended or expire (product_status), and the
 * paid features are featured listings and subscriptions.
 */
export function TermsPage() {
  return <LegalDocument pick={(c) => c.terms} path="/legal/terms" />;
}

/**
 * Community guidelines: the terms in everyday language. The report reasons
 * mirror the report_reason enum (scam, fake_product, wrong_information,
 * offensive, illegal, duplicate, spam, other) -- keep the two in step.
 */
export function CommunityGuidelinesPage() {
  return <LegalDocument pick={(c) => c.guidelines} path="/legal/community-guidelines" />;
}
