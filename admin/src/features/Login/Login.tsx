import React from 'react';
import { Button, TextField } from '@mui/material';

import styles from './styles.scss';

import { ReactComponent as DiscordSVG } from './img/Discord-Logo-White.svg';
import Config from 'App/constants/config';

const cx = require('classnames/bind').bind(styles);

const Login: React.FC = () => {
  const authWithDiscord = () => {
    window.location.href = `${Config.API_URL}/auth/login`;
  };

  return (
    <div className={cx('login')}>
      <h2>Login</h2>
      <TextField className={cx('login-field')} id="username" type="text" label="Username" variant="outlined" />
      <TextField className={cx('login-field')} id="password" type="password" label="Password" variant="outlined" />
      <Button className={cx('login-submit')} variant="contained">
        Login
      </Button>
      <Button
        className={cx('login-discord')}
        onClick={authWithDiscord}
        variant="contained"
        startIcon={<DiscordSVG width="32px" height="32px" />}
      >
        with Discord
      </Button>
    </div>
  );
};

export { Login };
