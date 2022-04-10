import React from 'react';

import { IReduxState } from 'App/types';
import Empty from 'App/components/Empty';
import Loader from 'App/components/Loader';

interface IProps {
  check: IReduxState;
  children: React.ReactNode;
  isList?: boolean;
}

const defaultProps: Partial<IProps> = {
  isList: false,
};

function renderValue(props: IProps) {
  const isEmptyList = !!props.isList && props.check.value === 0;

  return isEmptyList ? <Empty /> : props.children;
}

function Checker(props: IProps) {
  const { value, isLoading } = props.check;

  return <Loader isLoading={isLoading}>{value ? renderValue(props) : <Empty isError />}</Loader>;
}

Checker.defaultProps = defaultProps;

export default Checker;
