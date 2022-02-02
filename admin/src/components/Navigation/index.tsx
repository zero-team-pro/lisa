import React from 'react';

import styles from './styles.scss';
import Link from 'App/components/Link';

const cx = require('classnames/bind').bind(styles);

function Navigation() {
  return (
    <div className={cx('navigation')}>
      <div className={cx('navigation-list')}>
        <Link size="xl" to="/">
          Some Link
        </Link>
        <Link size="xl" to="/">
          Some Link
        </Link>
        <Link size="xl" to="/">
          Some Link
        </Link>
      </div>
    </div>
  );
}

export default Navigation;
