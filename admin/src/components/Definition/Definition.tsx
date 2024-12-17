import cn from 'classnames/bind';
import React from 'react';

import styles from './styles.module.scss';

const cx = cn.bind(styles);

interface IProps {
  children: React.ReactElement | string | number | undefined | null;
  title: string;
}

const Definition: React.FC<IProps> = (props: IProps) => {
  const { title, children } = props;

  return (
    <div className={cx('definition')}>
      <div className={cx('definition__title')}>{title}</div>
      <div className={cx('definition__title')}>{children || 'None'}</div>
    </div>
  );
};

export { Definition };
