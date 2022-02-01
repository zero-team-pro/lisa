import React from 'react';

import Login from 'App/components/Login';

import styles from './styles.scss';
const cx = require('classnames/bind').bind(styles);

function LoginPage() {
  return (
    <div className={cx('login-page')}>
      <Login />
    </div>
  );
}

export default LoginPage;
