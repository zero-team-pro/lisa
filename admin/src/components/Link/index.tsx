import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { ViewProps } from 'App/types';

import styles from './styles.scss';
const cx = require('classnames/bind').bind(styles);

interface IProps extends ViewProps<typeof RouterLink> {}

function Link(props: IProps) {
  return (
    <RouterLink to={props.to}>
      <div className={cx('link')}>{props.children}</div>
    </RouterLink>
  );
}

export default Link;
