import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom';

import { LANGUAGES, useI18n, useT } from '../../i18n/index.js';
import { useCities, useConfig, useCountries, useMe } from '../../hooks/useMarketData.js';
import { useAuth } from '../../store/auth.js';
import { usePreferences, type ThemeChoice } from '../../store/preferences.js';
import { Logo } from '../brand/Logo.js';
import { Button } from '../ui/index.js';
import { Icon, type IconName } from '../ui/Icon.js';

/* -------------------------------------------------------------------------- */
/* Popover — a small dropdown that closes on outside click and Escape          */
/* -------------------------------------------------------------------------- */

function Popover({
  label,
  icon,
  value,
  children,
  align = 'end',
}: {
  label: string;
  icon?: IconName;
  value: string;
  children: (close: () => void) => ReactNode;
  align?: 'start' | 'end';
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={label}
        className="inline-flex h-9 items-center gap-1.5 rounded-[--radius-field] px-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-primary"
      >
        {icon ? <Icon name={icon} size={16} /> : null}
        <span className="max-w-[7.5rem] truncate">{value}</span>
        <Icon name="chevron-down" size={14} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {open ? (
        <div
          role="menu"
          className={`absolute top-full z-50 mt-2 max-h-[22rem] w-60 overflow-y-auto rounded-[--radius-card] border border-border-subtle bg-surface-raised p-1.5 shadow-[--shadow-raised] ${
            align === 'end' ? 'right-0' : 'left-0'
          }`}
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  selected = false,
}: {
  children: ReactNode;
  onClick: () => void;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded-[--radius-field] px-3 py-2 text-left text-sm transition-colors hover:bg-surface-sunken ${
        selected ? 'font-semibold text-brand' : 'text-text-secondary'
      }`}
    >
      <span className="truncate">{children}</span>
      {selected ? <Icon name="check" size={15} /> : null}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Search                                                                     */
/* -------------------------------------------------------------------------- */

function SearchBar({ className = '' }: { className?: string }) {
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [value, setValue] = useState(params.get('q') ?? '');

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const query = value.trim();
        navigate(query ? `/browse?q=${encodeURIComponent(query)}` : '/browse');
      }}
      className={`relative ${className}`}
    >
      <Icon
        name="search"
        size={17}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={t('common.searchPlaceholder')}
        aria-label={t('common.search')}
        // enterKeyHint turns the phone keyboard's return key into "Search",
        // which is a small thing that makes mobile search feel native.
        enterKeyHint="search"
        className="h-11 w-full rounded-[--radius-pill] border border-border-subtle bg-surface-raised pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
      />
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Header                                                                     */
/* -------------------------------------------------------------------------- */

export function Header() {
  const t = useT();
  const navigate = useNavigate();
  const { language, setLanguage } = useI18n();
  const session = useAuth((state) => state.session);
  const signOut = useAuth((state) => state.signOut);
  const { data: me } = useMe();
  const { data: config } = useConfig();
  const { data: countries } = useCountries();

  const preferences = usePreferences();
  const { data: cities } = useCities(preferences.countryId);
  const [menuOpen, setMenuOpen] = useState(false);

  const locationLabel =
    preferences.cityName ?? preferences.countryName ?? t('common.allLocations');

  const currencies = config?.currencies ?? [{ code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 }];

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface-raised/95 backdrop-blur supports-[backdrop-filter]:bg-surface-raised/80">
      {/* Row 1: brand, search, account */}
      <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-3 px-4 sm:gap-4 lg:px-6">
        <Link to="/" className="shrink-0" aria-label="East-Market">
          <Logo />
        </Link>

        <SearchBar className="hidden min-w-0 flex-1 md:block" />

        <div className="ml-auto flex items-center gap-1 md:gap-2">
          {/* Selectors collapse into the mobile sheet below the lg breakpoint. */}
          <div className="hidden items-center gap-1 lg:flex">
            <Popover label={t('common.location')} icon="map-pin" value={locationLabel}>
              {(close) => (
                <>
                  <MenuItem
                    selected={preferences.countryId === null}
                    onClick={() => {
                      preferences.clearLocation();
                      close();
                    }}
                  >
                    {t('common.allLocations')}
                  </MenuItem>
                  <div className="my-1 h-px bg-border-subtle" />
                  {(countries ?? []).map((country) => (
                    <MenuItem
                      key={country.id}
                      selected={preferences.countryId === country.id && !preferences.cityId}
                      onClick={() => {
                        preferences.setCountry({
                          id: country.id,
                          code: country.code,
                          name: country.name,
                        });
                      }}
                    >
                      {country.flag ? `${country.flag} ` : ''}
                      {country.name}
                    </MenuItem>
                  ))}
                  {preferences.countryId && cities?.length ? (
                    <>
                      <div className="my-1 h-px bg-border-subtle" />
                      <p className="px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">
                        {t('filters.city')}
                      </p>
                      {cities.map((city) => (
                        <MenuItem
                          key={city.id}
                          selected={preferences.cityId === city.id}
                          onClick={() => {
                            preferences.setCity({ id: city.id, name: city.name });
                            close();
                          }}
                        >
                          {city.name}
                        </MenuItem>
                      ))}
                    </>
                  ) : null}
                </>
              )}
            </Popover>

            <Popover
              label={t('common.language')}
              icon="globe"
              value={LANGUAGES.find((item) => item.code === language)?.nativeName ?? 'English'}
            >
              {(close) =>
                LANGUAGES.map((item) => (
                  <MenuItem
                    key={item.code}
                    selected={item.code === language}
                    onClick={() => {
                      setLanguage(item.code);
                      close();
                    }}
                  >
                    {item.nativeName}
                  </MenuItem>
                ))
              }
            </Popover>

            <Popover label={t('common.currency')} icon="coins" value={preferences.currency}>
              {(close) =>
                currencies.map((currency) => (
                  <MenuItem
                    key={currency.code}
                    selected={currency.code === preferences.currency}
                    onClick={() => {
                      preferences.setCurrency(currency.code);
                      close();
                    }}
                  >
                    {currency.code} · {currency.name}
                  </MenuItem>
                ))
              }
            </Popover>

            <ThemeToggle />
          </div>

          {session ? (
            <Popover
              label={t('nav.account')}
              icon="user"
              value={me?.fullName?.split(' ')[0] ?? t('nav.account')}
            >
              {(close) => (
                <>
                  <MenuItem onClick={() => { navigate('/saved'); close(); }}>{t('nav.saved')}</MenuItem>
                  <MenuItem onClick={() => { navigate('/my-listings'); close(); }}>
                    {t('nav.myListings')}
                  </MenuItem>
                  <div className="my-1 h-px bg-border-subtle" />
                  <MenuItem
                    onClick={() => {
                      void signOut();
                      close();
                      navigate('/');
                    }}
                  >
                    {t('nav.signOut')}
                  </MenuItem>
                </>
              )}
            </Popover>
          ) : (
            <Link
              to="/signin"
              className="hidden h-9 items-center rounded-[--radius-field] px-3 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-primary sm:inline-flex"
            >
              {t('nav.signIn')}
            </Link>
          )}

          <Button
            variant="accent"
            size="sm"
            icon="plus"
            className="hidden sm:inline-flex"
            onClick={() => navigate(session ? '/sell' : '/signin?next=/sell')}
          >
            {t('nav.sell')}
          </Button>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={t('nav.settings')}
            className="inline-flex size-9 items-center justify-center rounded-[--radius-field] text-text-secondary hover:bg-surface-sunken lg:hidden"
          >
            <Icon name="menu" size={20} />
          </button>
        </div>
      </div>

      {/* Row 2: search on mobile, where it does not fit beside the brand */}
      <div className="border-t border-border-subtle px-4 py-2.5 md:hidden">
        <SearchBar />
      </div>

      {menuOpen ? <MobileMenu onClose={() => setMenuOpen(false)} /> : null}
    </header>
  );
}

function ThemeToggle() {
  const t = useT();
  const theme = usePreferences((state) => state.theme);
  const setTheme = usePreferences((state) => state.setTheme);

  const options: Array<{ value: ThemeChoice; icon: IconName; labelKey: 'common.themeLight' | 'common.themeDark' | 'common.themeSystem' }> = [
    { value: 'light', icon: 'sun', labelKey: 'common.themeLight' },
    { value: 'dark', icon: 'moon', labelKey: 'common.themeDark' },
    { value: 'system', icon: 'monitor', labelKey: 'common.themeSystem' },
  ];
  const current = options.find((option) => option.value === theme) ?? options[2]!;

  return (
    <Popover label={t('common.theme')} icon={current.icon} value={t(current.labelKey)}>
      {(close) =>
        options.map((option) => (
          <MenuItem
            key={option.value}
            selected={option.value === theme}
            onClick={() => {
              setTheme(option.value);
              close();
            }}
          >
            {t(option.labelKey)}
          </MenuItem>
        ))
      }
    </Popover>
  );
}

/* -------------------------------------------------------------------------- */
/* Mobile menu                                                                */
/* -------------------------------------------------------------------------- */

function MobileMenu({ onClose }: { onClose: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const { language, setLanguage } = useI18n();
  const session = useAuth((state) => state.session);
  const signOut = useAuth((state) => state.signOut);
  const { data: countries } = useCountries();
  const { data: config } = useConfig();
  const preferences = usePreferences();

  useEffect(() => {
    // Stop the page behind the sheet from scrolling with it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute inset-y-0 right-0 flex w-[min(21rem,88vw)] flex-col bg-surface-raised shadow-[--shadow-raised]">
        <div className="flex h-16 items-center justify-between border-b border-border-subtle px-4">
          <span className="font-display font-bold text-text-primary">{t('nav.settings')}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="inline-flex size-9 items-center justify-center rounded-[--radius-field] text-text-secondary hover:bg-surface-sunken"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          <section>
            <h3 className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">
              {t('common.location')}
            </h3>
            <div className="space-y-0.5">
              <MenuItem
                selected={preferences.countryId === null}
                onClick={() => preferences.clearLocation()}
              >
                {t('common.allLocations')}
              </MenuItem>
              {(countries ?? []).map((country) => (
                <MenuItem
                  key={country.id}
                  selected={preferences.countryId === country.id}
                  onClick={() =>
                    preferences.setCountry({ id: country.id, code: country.code, name: country.name })
                  }
                >
                  {country.flag ? `${country.flag} ` : ''}
                  {country.name}
                </MenuItem>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">
              {t('common.language')}
            </h3>
            <div className="space-y-0.5">
              {LANGUAGES.map((item) => (
                <MenuItem
                  key={item.code}
                  selected={item.code === language}
                  onClick={() => setLanguage(item.code)}
                >
                  {item.nativeName}
                </MenuItem>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">
              {t('common.currency')}
            </h3>
            <div className="space-y-0.5">
              {(config?.currencies ?? []).map((currency) => (
                <MenuItem
                  key={currency.code}
                  selected={currency.code === preferences.currency}
                  onClick={() => preferences.setCurrency(currency.code)}
                >
                  {currency.code} · {currency.name}
                </MenuItem>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">
              {t('common.theme')}
            </h3>
            <div className="space-y-0.5">
              {(['light', 'dark', 'system'] as const).map((value) => (
                <MenuItem
                  key={value}
                  selected={preferences.theme === value}
                  onClick={() => preferences.setTheme(value)}
                >
                  {t(`common.theme${value[0]!.toUpperCase()}${value.slice(1)}` as 'common.themeLight')}
                </MenuItem>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-2 border-t border-border-subtle p-4">
          {session ? (
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                void signOut();
                onClose();
                navigate('/');
              }}
            >
              {t('nav.signOut')}
            </Button>
          ) : (
            <>
              <Button fullWidth onClick={() => { onClose(); navigate('/signin'); }}>
                {t('nav.signIn')}
              </Button>
              <Button variant="secondary" fullWidth onClick={() => { onClose(); navigate('/register'); }}>
                {t('nav.register')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Mobile bottom navigation                                                   */
/* -------------------------------------------------------------------------- */

export function BottomNav() {
  const t = useT();
  const session = useAuth((state) => state.session);

  const items: Array<{ to: string; icon: IconName; labelKey: 'nav.home' | 'nav.browse' | 'nav.sell' | 'nav.saved' | 'nav.account' }> = [
    { to: '/', icon: 'grid', labelKey: 'nav.home' },
    { to: '/browse', icon: 'search', labelKey: 'nav.browse' },
    { to: session ? '/sell' : '/signin?next=/sell', icon: 'plus', labelKey: 'nav.sell' },
    { to: session ? '/saved' : '/signin?next=/saved', icon: 'heart', labelKey: 'nav.saved' },
    { to: session ? '/my-listings' : '/signin', icon: 'user', labelKey: 'nav.account' },
  ];

  return (
    <nav
      aria-label={t('nav.home')}
      // pb-[env(safe-area-inset-bottom)] keeps the bar clear of the iOS home
      // indicator instead of sitting under it.
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-surface-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="flex">
        {items.map((item) => (
          <li key={item.labelKey} className="flex-1">
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex h-14 flex-col items-center justify-center gap-0.5 text-[0.625rem] font-medium transition-colors ${
                  isActive ? 'text-brand' : 'text-text-muted'
                }`
              }
            >
              <Icon name={item.icon} size={20} />
              {t(item.labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
