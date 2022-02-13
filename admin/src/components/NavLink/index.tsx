import React from 'react';
import { NavLink as RouterNavLink } from 'react-router-dom';

import styles from './styles.scss';
import { ViewProps } from 'App/types';

const cx = require('classnames/bind').bind(styles);

function NavLink(props: ViewProps<typeof RouterNavLink>) {
  const { to, ...rest } = props;
  return (
    <RouterNavLink className={cx('nav-link')} to={to} {...rest}>
      {props.children}
    </RouterNavLink>
  );
}

export default NavLink;
