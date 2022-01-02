import React from 'react';

const cx = require('classnames/bind').bind(require('./styles.scss'));

function Navigation() {
  return (
    <div className={cx('navigation')}>
      <div className={cx('navigation-list')}>
        <div>Some Link</div>
        <div>Some Link</div>
      </div>
    </div>
  );
}

export default Navigation;
