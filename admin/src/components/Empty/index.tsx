import React from 'react';

import styles from './styles.scss';

const cx = require('classnames/bind').bind(styles);

interface IProps {
  isError?: boolean;
}

const defaultProps: Partial<IProps> = {
  isError: false,
};

function Empty(props: IProps) {
  const { isError } = props;
  return <div className={cx('empty')}>{isError ? <h2>Error occurred</h2> : <h2>Nothing found</h2>}</div>;
}

Empty.defaultProps = defaultProps;

export default Empty;
