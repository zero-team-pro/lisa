import React from 'react';
import { Button } from '@mui/material';

import { useAppSelector } from '../../redux';

const cx = require('classnames/bind').bind(require('./styles.scss'));

function Header() {
  const user = useAppSelector((state) => state.discordUser.value);

  return (
    <div className={cx('header')}>
      <div className={cx('header-content')}>
        <h2>Header</h2>
        <div>{user?.username}</div>
        <Button>Logout</Button>
      </div>
    </div>
  );
}

export default Header;
