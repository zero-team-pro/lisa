import React from 'react';

import styles from './styles.module.scss';

import { ServerList } from 'App/features/ServerList';

import cn from 'classnames/bind';

const cx = cn.bind(styles);

const HomePage: React.FC = () => {
  return (
    <div className={cx('home-page')}>
      <div>
        <p className={cx('home-page__eyebrow')}>Administration</p>
        <h1>Dashboard</h1>
        <p className={cx('home-page__description')}>Manage the Discord servers connected to Lisa.</p>
        <ServerList />
      </div>
    </div>
  );
};

export { HomePage };
