import React from 'react';
import { NavLink as RouterNavLink } from 'react-router-dom';

import styles from './styles.module.scss';

import { ViewProps } from 'App/types';

import cn from 'classnames/bind';

const cx = cn.bind(styles);

type IProps = ViewProps<typeof RouterNavLink>;

const NavLink: React.FC<IProps> = (props: IProps) => {
  const { to, ...rest } = props;
  return (
    <RouterNavLink className={cx('nav-link')} to={to} {...rest}>
      {props.children}
    </RouterNavLink>
  );
};

export { NavLink };
