import React from 'react';
import CircularProgress, { CircularProgressProps } from '@mui/material/CircularProgress';

import styles from './styles.scss';

const cx = require('classnames/bind').bind(styles);

interface IProps extends CircularProgressProps {
  children?: React.ReactNode;
  isLoading?: boolean;
  isSmall?: boolean;
}

const defaultProps: Partial<IProps> = {
  isSmall: false,
  isLoading: true,
};

const Loader: React.FC<IProps> = (props: IProps) => {
  const { children, isLoading, isSmall, ...rest } = props;

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

Loader.defaultProps = defaultProps;

export { Loader };
