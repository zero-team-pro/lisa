import React from 'react';

import LoginPage from '../LoginPage';

const cx = require('classnames/bind').bind(require('./styles.scss'));

function App() {
  return (
    <div className={cx('app')}>
      <LoginPage />
    </div>
  );
}

export default App;
