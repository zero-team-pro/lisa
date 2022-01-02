import React from 'react';
import { Button } from '@mui/material';

import { useAppSelector } from 'App/redux';
import Config from 'App/constants/config';

const cx = require('classnames/bind').bind(require('./styles.scss'));

function Header() {
  const user = useAppSelector((state) => state.discordUser.value);

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
        <Button className={cx('logout')} variant="contained">
          Logout
        </Button>
      </div>
    </div>
  );
}

export default Header;
