import React, { useEffect } from 'react';

import styles from './styles.scss';
import { fetchServerList, useAppDispatch, useAppSelector } from 'App/redux';
import Link from 'App/components/Link';

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
      <h2>Server List</h2>
      <div>
        {serverList &&
          serverList.map((server) => (
            <div key={server.id}>
              <div>
                <Link to={`/server/${server.id}`}>{server.name}</Link>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default ServerList;
