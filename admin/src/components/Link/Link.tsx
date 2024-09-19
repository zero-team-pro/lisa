import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

import styles from './styles.scss';

import { ViewProps } from 'App/types';

const cx = require('classnames/bind').bind(styles);

interface IProps extends ViewProps<typeof RouterLink> {
  size?: 'default' | 'xl';
  isGlobal?: boolean;
  className?: string;
}

const LinkText = (props: Pick<IProps, 'children' | 'size'>) => {
  return <div className={cx('link', `link_size-${props.size}`)}>{props.children}</div>;
};

const Link: React.FC<IProps> = (props: IProps) => {
  const { size = 'default', isGlobal = false, className, to, children } = props;

  return isGlobal ? (
    <a href={to.toString()} className={className} target="_blank" rel="noreferrer">
      <LinkText size={size}>{children}</LinkText>
    </a>
  ) : (
    <RouterLink to={to} className={className}>
      <LinkText size={size}>{children}</LinkText>
    </RouterLink>
  );
};

export { Link };
