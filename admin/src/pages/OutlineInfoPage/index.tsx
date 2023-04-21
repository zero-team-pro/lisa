import React from 'react';

import styles from './styles.scss';

import OutlineInfo from 'App/features/OutlineInfo';

const cx = require('classnames/bind').bind(styles);

const OutlineInfoPage: React.FC = () => {
  return (
    <div className={cx('outline-info-page')}>
      <OutlineInfo />
    </div>
  );
};

export default OutlineInfoPage;
