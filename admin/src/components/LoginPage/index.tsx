import React from 'react';

import Login from 'App/components/Login';

const cx = require('classnames/bind').bind(require('./styles.scss'));

function LoginPage() {
  return (
    <div className={cx('login-page')}>
      <Login />
    </div>
  );
}

export default LoginPage;
