import React from 'react';

import styles from './styles.scss';

import Login from 'App/features/Login';

const cx = require('classnames/bind').bind(styles);

const LoginPage: React.FC = () => {
  return (
    <div className={cx('login-page')}>
      <Login />
    </div>
  );
};

export { LoginPage };
