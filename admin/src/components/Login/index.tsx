import React from 'react';
import { Button, TextField } from '@mui/material';

const cx = require('classnames/bind').bind(require('./styles.scss'));

function Login() {
  return (
    <div className={cx('login')}>
      <h2>Login</h2>
      <TextField className={cx('login-field')} id="username" type="text" label="Username" variant="outlined" />
      <TextField className={cx('login-field')} id="password" type="password" label="Password" variant="outlined" />
      <Button className={cx('login-submit')} variant="contained">Login</Button>
    </div>
  );
}

export default Login;
