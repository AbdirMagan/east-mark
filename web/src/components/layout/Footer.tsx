import { Link } from 'react-router-dom';

import { useT } from '../../i18n/index.js';
import { CulturalPattern } from '../brand/CulturalPattern.js';
import { Logo, Tagline } from '../brand/Logo.js';

export function Footer() {
  const t = useT();
  const year = new Date().getFullYear();

  const columns: Array<{ heading: string; links: Array<{ label: string; to: string }> }> = [
    {
      heading: t('footer.about'),
      links: [
        { label: t('footer.about'), to: '/about' },
        { label: t('nav.categories'), to: '/categories' },
        { label: t('nav.sell'), to: '/sell' },
      ],
    },
    {
      heading: t('footer.help'),
      links: [
        { label: t('footer.help'), to: '/help' },
        { label: t('footer.safety'), to: '/safety' },
      ],
    },
    {
      heading: t('footer.terms'),
      links: [
        { label: t('footer.terms'), to: '/legal/terms' },
        { label: t('footer.privacy'), to: '/legal/privacy' },
        { label: t('footer.guidelines'), to: '/legal/community-guidelines' },
      ],
    },
  ];

  return (
    <footer className="relative mt-16 overflow-hidden border-t border-border-subtle bg-surface-raised">
      <CulturalPattern variant="chevron" scale={40} />

      <div className="relative mx-auto max-w-[90rem] px-4 py-12 lg:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo responsive={false} />
            <Tagline className="mt-3 block" />
            <p className="mt-4 max-w-xs text-sm text-text-secondary">{t('footer.countries')}</p>
          </div>

          {columns.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h3 className="text-sm font-semibold text-text-primary">{column.heading}</h3>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-text-secondary transition-colors hover:text-brand"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border-subtle pt-6 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} East-Market. Developed by Eng-Magan {t('footer.rights')}</p>
          {/* No flag emoji here. Somaliland and Somalia share a dialling
              plan but not a flag, and the only emoji that exists is Somalia's
              — using it for both is wrong in a way that matters to the people
              this product is for. Windows also renders regional-indicator
              pairs as bare letters ("so"), so they look broken besides. */}
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Somaliland</span>
            <span>Somalia</span>
            <span>Ethiopia</span>
            <span>Kenya</span>
            <span>Djibouti</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
