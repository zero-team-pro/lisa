import React from 'react';

import styles from './styles.module.scss';

import { ModuleList } from 'App/features/ModuleList';

import cn from 'classnames/bind';

const cx = cn.bind(styles);

const ModuleListPage: React.FC = () => {
  return (
    <div className={cx('module-list-page')}>
      <div>
        <h1>Module List</h1>
        <ModuleList />
      </div>
    </div>
  );
};

export { ModuleListPage };
