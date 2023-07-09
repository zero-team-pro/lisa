import React from 'react';

import styles from './styles.scss';

import { ServerList } from 'App/features/ServerList';

const cx = require('classnames/bind').bind(styles);

const HomePage: React.FC = () => {
  return (
    <div className={cx('home-page')}>
      <div>
        <h1>Home Page</h1>
        <ServerList />
      </div>
    </div>
  );
};

export { HomePage };
