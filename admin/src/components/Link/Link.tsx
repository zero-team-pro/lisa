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

const defaultProps: Partial<IProps> = {
  size: 'default',
  isGlobal: false,
};

const LinkText = (props: Pick<IProps, 'children' | 'size'>) => {
  return <div className={cx('link', `link_size-${props.size}`)}>{props.children}</div>;
};

const Link: React.FC<IProps> = (props: IProps) => {
  return props.isGlobal ? (
    <a href={props.to.toString()} className={props.className} target="_blank" rel="noreferrer">
      <LinkText size={props.size}>{props.children}</LinkText>
    </a>
  ) : (
    <RouterLink to={props.to} className={props.className}>
      <LinkText size={props.size}>{props.children}</LinkText>
    </RouterLink>
  );
};

Link.defaultProps = defaultProps;

export { Link };
