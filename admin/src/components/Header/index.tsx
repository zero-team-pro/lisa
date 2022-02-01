import React from 'react';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router';

import { useAppDispatch, useAppSelector } from 'App/redux';
import Config from 'App/constants/config';
import { logout } from 'App/redux/discordUser';

import styles from './styles.scss';
const cx = require('classnames/bind').bind(styles);

function Header() {
  const user = useAppSelector((state) => state.discordUser.value);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const onLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  return (
    <div className={cx('header')}>
      <div className={cx('header-content')}>
        <h2 className={cx('title')}>LISA Admin panel</h2>
        <div className={cx('user')}>
          <img
            className={cx('user__avatar')}
            src={`${Config.AVATAR_CDN}/${user?.id}/${user?.avatar}.png`}
            alt="Avatar"
          />
          <div className={cx('user__name')}>{user?.username}</div>
        </div>
        <Button className={cx('logout')} onClick={onLogout} variant="contained">
          Logout
        </Button>
      </div>
    </div>
  );
}

export default Header;
