import React from 'react';

import styles from './styles.scss';

import { ModuleList } from 'App/features/ModuleList';

const cx = require('classnames/bind').bind(styles);

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
