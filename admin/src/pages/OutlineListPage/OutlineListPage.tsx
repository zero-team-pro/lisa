import React from 'react';

import styles from './styles.module.scss';

import { OutlineList } from 'App/features/OutlineList';

import cn from 'classnames/bind';

const cx = cn.bind(styles);

const OutlineListPage: React.FC = () => {
  return (
    <div className={cx('outline-list-page')}>
      <div className={cx('outline-list-page__list')}>
        <h1>Outline VPN List</h1>
        <OutlineList />
      </div>
    </div>
  );
};

export { OutlineListPage };
