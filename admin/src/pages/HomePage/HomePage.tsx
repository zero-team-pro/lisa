import React from 'react';

import styles from './styles.module.scss';

import { ServerList } from 'App/features/ServerList';

import cn from 'classnames/bind';

const cx = cn.bind(styles);

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
