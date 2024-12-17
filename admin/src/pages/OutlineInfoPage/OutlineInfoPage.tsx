import React from 'react';

import styles from './styles.module.scss';

import { OutlineInfo } from 'App/features/OutlineInfo';

import cn from 'classnames/bind';

const cx = cn.bind(styles);

const OutlineInfoPage: React.FC = () => {
  return (
    <div className={cx('outline-info-page')}>
      <OutlineInfo />
    </div>
  );
};

export { OutlineInfoPage };
