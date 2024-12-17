import React from 'react';

import styles from './styles.module.scss';

import { Login } from 'App/features/Login';

import cn from 'classnames/bind';

const cx = cn.bind(styles);

const LoginPage: React.FC = () => {
  return (
    <div className={cx('login-page')}>
      <Login />
    </div>
  );
};

export { LoginPage };
