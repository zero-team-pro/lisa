import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Avatar, Button, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import { Outlet, Link as RouterLink } from 'react-router-dom';
import { useLocation, useNavigate } from 'react-router';
import Cookies from 'universal-cookie';

import styles from './styles.module.scss';

import { Link } from 'App/components/Link';
import Config from 'App/constants/config';
import { logout, useAppDispatch, useAppSelector } from 'App/redux';

import cn from 'classnames/bind';

const cx = cn.bind(styles);
type Section = 'dashboard' | 'modules' | 'telegram' | 'article' | 'outline';

const PublicLayout: React.FC = () => {
  const adminMe = useAppSelector((state) => state.adminMe.value);
  const isAuth = !!new Cookies().get('discordToken') && !!adminMe;
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [visibleQuickLinkCount, setVisibleQuickLinkCount] = useState(5);
  const quickNavigationRef = useRef<HTMLElement>(null);
  const quickNavigationMeasureRef = useRef<HTMLDivElement>(null);

  const isCurrentSection = (section: Section) => {
    const { pathname } = location;

    if (section === 'dashboard') return pathname === '/' || pathname.startsWith('/server/');
    return pathname === `/${section}` || pathname.startsWith(`/${section}/`);
  };

  const quickLinks: { section: Section; title: string; to: string }[] = [
    ...(isAuth ? [{ section: 'dashboard' as const, title: 'Dashboard', to: '/' }] : []),
    { section: 'modules', title: 'Modules', to: '/modules' },
    ...(isAuth
      ? [
          { section: 'telegram' as const, title: 'Telegram', to: '/telegram' },
          { section: 'article' as const, title: 'Articles', to: '/article' },
          { section: 'outline' as const, title: 'Outline', to: '/outline' },
        ]
      : []),
  ];

  useLayoutEffect(() => {
    const navigation = quickNavigationRef.current;
    const measureRow = quickNavigationMeasureRef.current;
    if (!navigation || !measureRow) return;

    let animationFrame: number | undefined;
    let isDisposed = false;

    const measure = () => {
      const items = Array.from(measureRow.children) as HTMLElement[];
      const gap = Number.parseFloat(window.getComputedStyle(measureRow).columnGap) || 0;
      const availableWidth = navigation.clientWidth;
      let usedWidth = 0;
      let nextVisibleCount = 0;

      for (const item of items) {
        const nextWidth = usedWidth + (nextVisibleCount > 0 ? gap : 0) + item.getBoundingClientRect().width;
        if (nextWidth > availableWidth) break;
        usedWidth = nextWidth;
        nextVisibleCount += 1;
      }

      setVisibleQuickLinkCount((current) => (current === nextVisibleCount ? current : nextVisibleCount));
    };

    const scheduleMeasure = () => {
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(measure);
    };

    measure();
    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(navigation);
    document.fonts?.ready.then(() => {
      if (!isDisposed) scheduleMeasure();
    });

    return () => {
      isDisposed = true;
      resizeObserver.disconnect();
      if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
    };
  }, [isAuth]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMenuOpen]);

  const onLogout = () => {
    dispatch(logout());
    setIsMenuOpen(false);
    navigate('/modules', { replace: true });
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div className={cx('public-layout')}>
      <header className={cx('public-layout__header')}>
        <div className={cx('public-layout__header-inner')}>
          <IconButton
            className={cx('public-layout__menu-button')}
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open navigation"
            aria-expanded={isMenuOpen}
          >
            <MenuIcon />
          </IconButton>
          <RouterLink className={cx('public-layout__brand')} to={isAuth ? '/' : '/login'} aria-label="Lisa home">
            <img src="/logo192.png" alt="" />
            <span>Lisa</span>
          </RouterLink>
          <nav ref={quickNavigationRef} className={cx('public-layout__quick-navigation')} aria-label="Quick navigation">
            {quickLinks.map((link, index) => (
              <Link
                className={cx('public-layout__quick-link', {
                  'public-layout__quick-link_active': isCurrentSection(link.section),
                  'public-layout__quick-link_hidden': index >= visibleQuickLinkCount,
                })}
                to={link.to}
                key={link.section}
              >
                {link.title}
              </Link>
            ))}
            <div ref={quickNavigationMeasureRef} className={cx('public-layout__quick-navigation-measure')} aria-hidden>
              {quickLinks.map((link) => (
                <span
                  className={cx('public-layout__quick-link', 'public-layout__quick-link_measure')}
                  key={link.section}
                >
                  {link.title}
                </span>
              ))}
            </div>
          </nav>
          {isMenuOpen && (
            <button className={cx('public-layout__backdrop')} onClick={closeMenu} aria-label="Dismiss navigation" />
          )}
          <nav
            className={cx('public-layout__navigation', { 'public-layout__navigation_open': isMenuOpen })}
            aria-label="Main navigation"
          >
            <div className={cx('public-layout__mobile-menu-header')}>
              <span>Navigation</span>
              <IconButton onClick={closeMenu} aria-label="Close navigation">
                <CloseIcon />
              </IconButton>
            </div>
            {isAuth && (
              <Link
                className={cx('public-layout__navigation-link', {
                  'public-layout__navigation-link_active': isCurrentSection('dashboard'),
                })}
                to="/"
                onClick={closeMenu}
              >
                Dashboard
              </Link>
            )}
            <Link
              className={cx('public-layout__navigation-link', {
                'public-layout__navigation-link_active': isCurrentSection('modules'),
              })}
              to="/modules"
              onClick={closeMenu}
            >
              Modules
            </Link>
            {isAuth && (
              <Link
                className={cx('public-layout__navigation-link', {
                  'public-layout__navigation-link_active': isCurrentSection('telegram'),
                })}
                to="/telegram"
                onClick={closeMenu}
              >
                Telegram
              </Link>
            )}
            {isAuth && (
              <Link
                className={cx('public-layout__navigation-link', {
                  'public-layout__navigation-link_active': isCurrentSection('article'),
                })}
                to="/article"
                onClick={closeMenu}
              >
                Articles
              </Link>
            )}
            {isAuth && (
              <Link
                className={cx('public-layout__navigation-link', {
                  'public-layout__navigation-link_active': isCurrentSection('outline'),
                })}
                to="/outline"
                onClick={closeMenu}
              >
                Outline
              </Link>
            )}
            {isAuth ? (
              <div className={cx('public-layout__account')}>
                <Avatar
                  className={cx('public-layout__avatar')}
                  src={`${Config.AVATAR_CDN}/${adminMe.discordUser?.id}/${adminMe.discordUser?.avatar}.png`}
                  alt={adminMe.discordUser?.username?.charAt(0)?.toUpperCase() || '?'}
                />
                <span>{adminMe.discordUser?.username}</span>
                <Button onClick={onLogout} variant="outlined">
                  Logout
                </Button>
              </div>
            ) : (
              <Button component={RouterLink} to="/login" variant="contained" onClick={closeMenu}>
                Admin login
              </Button>
            )}
          </nav>
        </div>
      </header>
      <main className={cx('public-layout__content')}>
        <Outlet />
      </main>
      <footer className={cx('public-layout__footer')}>
        <div className={cx('public-layout__footer-inner')}>
          <span>© 2026 Lisa messenger bot</span>
          <div className={cx('public-layout__footer-links')}>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/privacy">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export { PublicLayout };
