import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

import styles from './styles.scss';
import { ViewProps } from 'App/types';

const cx = require('classnames/bind').bind(styles);

interface IProps extends ViewProps<typeof RouterLink> {
  size?: 'default' | 'xl';
}

const defaultProps: Partial<IProps> = {
  size: 'default',
};

function Link(props: IProps) {
  return (
    <RouterLink to={props.to}>
      <div className={cx('link', `link_size-${props.size}`)}>{props.children}</div>
    </RouterLink>
  );
}

Link.defaultProps = defaultProps;

export default Link;
