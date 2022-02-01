import React from 'react';

import Link from 'App/components/Link';

import styles from './styles.scss';
const cx = require('classnames/bind').bind(styles);

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
