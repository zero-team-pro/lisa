import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Avatar, Button, Drawer, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

import styles from './styles.scss';

import { logout, useAppDispatch, useAppSelector } from 'App/redux';
import Config from 'App/constants/config';
import { Navigation } from 'App/components/Navigation';

const cx = require('classnames/bind').bind(styles);

const Header: React.FC = () => {
  const adminMe = useAppSelector((state) => state.adminMe.value);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [isNavigationOpen, toggleNavigation] = useState(false);

  const onLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  return (
    <div className={cx('header-container')}>
      <div className={cx('header')}>
        <div className={cx('header__navigation')}>
          <IconButton onClick={() => toggleNavigation(true)} aria-label="Nav" edge="start">
            <MenuIcon />
          </IconButton>
          <Drawer anchor="left" open={isNavigationOpen} onClose={() => toggleNavigation(false)}>
            <Navigation isForce={true} callback={() => toggleNavigation(false)} />
          </Drawer>
        </div>
        <h2 className={cx('header__title')}>LISA Admin panel</h2>
        <div className={cx('header__user')}>
          <Avatar
            className={cx('header__user__avatar')}
            src={`${Config.AVATAR_CDN}/${adminMe?.discordUser?.id}/${adminMe?.discordUser?.avatar}.png`}
            alt={adminMe?.discordUser?.username?.charAt(0)?.toUpperCase() || '?'}
          />
          <div className={cx('header__user__name')}>{adminMe?.discordUser?.username}</div>
        </div>
        <Button className={cx('header__logout')} onClick={onLogout} variant="contained">
          Logout
        </Button>
      </div>
    </div>
  );
};

export { Header };
