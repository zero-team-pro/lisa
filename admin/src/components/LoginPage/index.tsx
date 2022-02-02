import React from 'react';

import styles from './styles.scss';
import Login from 'App/components/Login';

const cx = require('classnames/bind').bind(styles);

function LoginPage() {
  return (
    <div className={cx('login-page')}>
      <Login />
    </div>
  );
}

export default LoginPage;
