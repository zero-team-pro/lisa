import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Drawer, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

import styles from './styles.scss';
import { useAppDispatch, useAppSelector } from 'App/redux';
import Config from 'App/constants/config';
import { logout } from 'App/redux/discordUser';
import Navigation from 'App/components/Navigation';

const cx = require('classnames/bind').bind(styles);

function Header() {
  const user = useAppSelector((state) => state.discordUser.value);
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
          <img
            className={cx('header__user__avatar')}
            src={`${Config.AVATAR_CDN}/${user?.id}/${user?.avatar}.png`}
            alt="Avatar"
          />
          <div className={cx('header__user__name')}>{user?.username}</div>
        </div>
        <Button className={cx('header__logout')} onClick={onLogout} variant="contained">
          Logout
        </Button>
      </div>
    </div>
  );
}

export default Header;
