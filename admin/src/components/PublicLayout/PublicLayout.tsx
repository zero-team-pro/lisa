import React from 'react';
import { Avatar, Button } from '@mui/material';
import { Outlet, Link as RouterLink } from 'react-router-dom';
import { useNavigate } from 'react-router';
import Cookies from 'universal-cookie';

import styles from './styles.module.scss';

import { Link } from 'App/components/Link';
import Config from 'App/constants/config';
import { logout, useAppDispatch, useAppSelector } from 'App/redux';

import cn from 'classnames/bind';

const cx = cn.bind(styles);

const PublicLayout: React.FC = () => {
  const adminMe = useAppSelector((state) => state.adminMe.value);
  const isAuth = !!new Cookies().get('discordToken') && !!adminMe;
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const onLogout = () => {
    dispatch(logout());
    navigate('/modules', { replace: true });
  };

  return (
    <div className={cx('public-layout')}>
      <header className={cx('public-layout__header')}>
        <div className={cx('public-layout__header-inner')}>
          <RouterLink className={cx('public-layout__brand')} to={isAuth ? '/' : '/login'} aria-label="Lisa home">
            <img src="/logo192.png" alt="" />
            <span>Lisa</span>
          </RouterLink>
          <nav className={cx('public-layout__navigation')} aria-label="Public navigation">
            {isAuth && <Link to="/">Dashboard</Link>}
            <Link to="/modules">Modules</Link>
            {isAuth && <Link to="/telegram">Telegram</Link>}
            {isAuth && <Link to="/article">Articles</Link>}
            {isAuth && <Link to="/outline">Outline</Link>}
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
              <Button component={RouterLink} to="/login" variant="contained">
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
