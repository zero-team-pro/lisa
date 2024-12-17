import React from 'react';
import CircularProgress, { CircularProgressProps } from '@mui/material/CircularProgress';

import styles from './styles.module.scss';

import cn from 'classnames/bind';

const cx = cn.bind(styles);

interface IProps extends CircularProgressProps {
  children?: React.ReactNode;
  isLoading?: boolean;
  isSmall?: boolean;
}

const Loader: React.FC<IProps> = (props: IProps) => {
  const { children, isLoading = true, isSmall = false, ...rest } = props;

  if (!children || isLoading) {
    return isSmall ? (
      <CircularProgress className={cx('loader')} size={40} thickness={4} {...rest} />
    ) : (
      <div className={cx('loader-container')}>
        <CircularProgress className={cx('loader')} size={60} thickness={3} {...rest} />
      </div>
    );
  }

  return <>{children}</>;
};

export { Loader };
