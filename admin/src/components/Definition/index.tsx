import React from 'react';

import styles from './styles.scss';

const cx = require('classnames/bind').bind(styles);

interface IProps {
  children: React.ReactElement | string | number | undefined | null;
  title: string;
}

function Definition(props: IProps) {
  const { title, children } = props;

  return (
    <div className={cx('definition')}>
      <div className={cx('definition__title')}>{title}</div>
      <div className={cx('definition__title')}>{children || 'None'}</div>
    </div>
  );
}

export default Definition;
