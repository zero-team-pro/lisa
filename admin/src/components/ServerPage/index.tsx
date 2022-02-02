import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';

import styles from './styles.scss';
import { fetchServer, useAppDispatch, useAppSelector } from 'App/redux';
import Definition from 'App/components/Definition';

const cx = require('classnames/bind').bind(styles);

function ServerPage() {
  const [isMounting, setIsMounting] = useState(true);

  const dispatch = useAppDispatch();
  const { id: serverId } = useParams();

  const serverState = useAppSelector((state) => state.server);
  const server = serverState.value;

  useEffect(() => {
    if (serverId) {
      dispatch(fetchServer(serverId));
    }
  }, [dispatch, serverId]);

  useEffect(() => {
    if (serverState.isLoading) {
      setIsMounting(false);
    }
  }, [dispatch, serverState.isLoading]);

  return (
    <div className={cx('server-page')}>
      {server && !isMounting && (
        <>
          <div className={cx('server-page__title')}>
            <img src={server.iconUrl} alt={server.name} />
            <h2>{server.name}</h2>
          </div>
          <div className={cx('server-page__info')}>
            <Definition title="Id">{server.id}</Definition>
            <Definition title="Prefix">{server.prefix}</Definition>
            <Definition title="Language">{server.lang}</Definition>
            <Definition title="Members">{server.memberCount}</Definition>
            <Definition title="Rater Engine">{server.raterEngine}</Definition>
            <Definition title="Rater Language">{server.raterLang}</Definition>
          </div>
        </>
      )}
    </div>
  );
}

export default ServerPage;
