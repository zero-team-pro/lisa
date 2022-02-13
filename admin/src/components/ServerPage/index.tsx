import React, { useEffect } from 'react';
import { useParams } from 'react-router';
import { Badge, Button } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';

import styles from './styles.scss';
import { fetchServer, syncServerChannels, useAppDispatch, useAppSelector } from 'App/redux';
import Definition from 'App/components/Definition';
import ChannelList from 'App/components/ChannelList';
import Loader from 'App/components/Loader';

const cx = require('classnames/bind').bind(styles);

function ServerPage() {
  const dispatch = useAppDispatch();
  const { id: guildId } = useParams();

  const serverState = useAppSelector((state) => state.server);
  const server = serverState.value;

  useEffect(() => {
    if (guildId) {
      dispatch(fetchServer(guildId));
    }
  }, [dispatch, guildId]);

  const syncChannels = () => {
    if (guildId) {
      dispatch(syncServerChannels({ id: guildId }));
    }
  };

  return (
    <div className={cx('server-page')}>
      {/* TODO: Component for empty */}
      {guildId && (
        <>
          <Loader isLoading={serverState.isLoading}>
            {server && (
              <>
                <div className={cx('server-page__title')}>
                  {/* TODO: Component for empty */}
                  <img src={server.iconUrl} alt={server.name} />
                  <h2>{server.name}</h2>
                  <div>
                    <Badge
                      badgeContent={server.memberCount}
                      max={9999}
                      anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                      }}
                      color="primary"
                    >
                      <PeopleIcon />
                    </Badge>
                  </div>
                </div>
                <div className={cx('server-page__info')}>
                  <div>
                    <Definition title="Id">{server.id}</Definition>
                    <Definition title="Language">{server.lang}</Definition>
                    <Definition title="Prefix">{server.prefix}</Definition>
                  </div>
                  <div>
                    <Definition title="Rater Engine">{server.raterEngine}</Definition>
                    <Definition title="Rater Language">{server.raterLang}</Definition>
                  </div>
                </div>
                <div className={cx('server-page__controls')}>
                  <Button onClick={syncChannels} disabled={serverState.isSending} variant="contained">
                    Rescan
                  </Button>
                </div>
              </>
            )}
          </Loader>
          <ChannelList serverId={guildId} mainChannelId={server?.mainChannelId} />
        </>
      )}
    </div>
  );
}

export default ServerPage;
