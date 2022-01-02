import React from 'react';

import Link from 'App/components/Link';

const cx = require('classnames/bind').bind(require('./styles.scss'));

function Navigation() {
  return (
    <div className={cx('navigation')}>
      <div className={cx('navigation-list')}>
        <Link to="/">Some Link</Link>
        <Link to="/">Some Link</Link>
        <Link to="/">Some Link</Link>
      </div>
    </div>
  );
}

export default Navigation;
