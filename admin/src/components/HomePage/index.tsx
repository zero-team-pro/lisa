import React from 'react';

import styles from './styles.scss';
import ServerList from 'App/components/ServerList';

const cx = require('classnames/bind').bind(styles);

function HomePage() {
  return (
    <div className={cx('home-page')}>
      <div>
        <h1>Home Page</h1>
        <ServerList />
      </div>
    </div>
  );
}

export default HomePage;
