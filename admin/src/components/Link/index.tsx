import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { ViewProps } from 'App/types';

const cx = require('classnames/bind').bind(require('./styles.scss'));

interface IProps extends ViewProps<typeof RouterLink> {}

function Link(props: IProps) {
  return (
    <RouterLink to={props.to}>
      <div className={cx('link')}>{props.children}</div>
    </RouterLink>
  );
}

export default Link;
