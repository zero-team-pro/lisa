import React, { useEffect } from 'react';

import { useAppDispatch, useAppSelector } from 'App/redux';
import { fetchServerList } from 'App/redux/serverList';

import styles from './styles.scss';
const cx = require('classnames/bind').bind(styles);

function ServerList() {
  const dispatch = useAppDispatch();

  const serverList = useAppSelector((state) => state.serverList.value);
  const isLoading = useAppSelector((state) => state.serverList.isLoading);
  const error = useAppSelector((state) => state.serverList.error);

  useEffect(() => {
    if (!serverList && !isLoading && !error) {
      dispatch(fetchServerList());
    }
  });

  return (
    <div className={cx('server-list')}>
      <div>
        <h2>Server List</h2>
        <div>
          {serverList && (
            <div>
              {serverList.map((server) => (
                <div key={server.id}>{server.id}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ServerList;
