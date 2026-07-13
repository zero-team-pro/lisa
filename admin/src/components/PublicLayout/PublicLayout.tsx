import React from 'react';
import { Button } from '@mui/material';
import { Outlet, Link as RouterLink } from 'react-router-dom';
import Cookies from 'universal-cookie';

import styles from './styles.module.scss';

import { Link } from 'App/components/Link';
import { Navigation } from 'App/components/Navigation';
import { Header } from 'App/features/Header';
import { useAppSelector } from 'App/redux';

import cn from 'classnames/bind';

const cx = cn.bind(styles);

const PublicLayout: React.FC = () => {
  const adminMe = useAppSelector((state) => state.adminMe.value);
  const isAuth = !!new Cookies().get('discordToken') && !!adminMe;

  if (isAuth) {
    return (
      <>
        <Header />
        <div className="protected-layout__content">
          <Navigation />
          <Outlet />
        </div>
      </>
    );
  }

  return (
    <div className={cx('public-layout')}>
      <header className={cx('public-layout__header')}>
        <div className={cx('public-layout__header-inner')}>
          <RouterLink className={cx('public-layout__brand')} to="/modules" aria-label="Lisa home">
            <img src="/logo192.png" alt="" />
            <span>Lisa</span>
          </RouterLink>
          <nav className={cx('public-layout__navigation')} aria-label="Public navigation">
            <Link to="/modules">Modules</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Button component={RouterLink} to="/login" variant="contained">
              Admin login
            </Button>
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
