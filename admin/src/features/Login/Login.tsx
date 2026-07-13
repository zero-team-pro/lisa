import React from 'react';
import { Button } from '@mui/material';

import styles from './styles.module.scss';

import DiscordSVG from './img/Discord-Logo-White.svg?react';
import Config from 'App/constants/config';

import cn from 'classnames/bind';

const cx = cn.bind(styles);

const Login: React.FC = () => {
  const authWithDiscord = () => {
    window.location.href = `${Config.API_URL}/auth/v1/login`;
  };

  return (
    <div className={cx('login')}>
      <img className={cx('login-logo')} src="/logo192.png" alt="" />
      <p className={cx('login-eyebrow')}>Lisa administration</p>
      <h1>Welcome back</h1>
      <p className={cx('login-description')}>Sign in with Discord to manage servers, content, and integrations.</p>
      <Button
        className={cx('login-discord')}
        onClick={authWithDiscord}
        variant="contained"
        startIcon={<DiscordSVG width="32px" height="32px" />}
      >
        Continue with Discord
      </Button>
      <p className={cx('login-hint')}>Only authorized Lisa administrators can access the dashboard.</p>
    </div>
  );
};

export { Login };
