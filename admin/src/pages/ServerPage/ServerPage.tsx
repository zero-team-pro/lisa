import React, { useEffect } from 'react';
import { useParams } from 'react-router';
import { Avatar, Badge, Button, Tooltip } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';

import styles from './styles.scss';

import { fetchServer, syncServerChannels, useAppDispatch, useAppSelector } from 'App/redux';
import { Definition } from 'App/components/Definition';
import { ChannelList } from 'App/features/ChannelList';
import { Loader } from 'App/components/Loader';
import { Empty } from 'App/components/Empty';
import { numberAdjust } from 'App/utils';
import { Language } from 'App/components/Language';
import { ServerModuleList } from 'App/features/ServerModuleList';
import { ServerAdminList } from 'App/features/ServerAdminList';

const cx = require('classnames/bind').bind(styles);

const ServerPage: React.FC = () => {
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
      {guildId && (
        <>
          <Loader isLoading={serverState.isLoading}>
            {server ? (
              <>
                <div className={cx('server-page__title')}>
                  <Avatar className={cx('server-page__icon')} src={server.iconUrl} alt={server.name} />
                  <h2>{server.name || 'Not Found'}</h2>
                  <div>
                    <Tooltip title="Member count">
                      <Badge
                        badgeContent={numberAdjust(server.memberCount)}
                        anchorOrigin={{
                          vertical: 'top',
                          horizontal: 'right',
                        }}
                        color="primary"
                      >
                        <PeopleIcon />
                      </Badge>
                    </Tooltip>
                  </div>
                  <div>
                    <Tooltip title="Shard ID">
                      <Badge
                        badgeContent={server.shardId?.toString()}
                        anchorOrigin={{
                          vertical: 'top',
                          horizontal: 'right',
                        }}
                        color="primary"
                      >
                        <StorageOutlinedIcon />
                      </Badge>
                    </Tooltip>
                  </div>
                </div>
                <div className={cx('server-page__info')}>
                  <div>
                    <Definition title="Id">{server.id}</Definition>
                    <Definition title="Language">
                      <Language language={server.lang} />
                    </Definition>
                    <Definition title="Prefix">{server.prefix}</Definition>
                  </div>
                  <div>
                    <Definition title="Rater Engine">{server.raterEngine}</Definition>
                    <Definition title="Rater Language">
                      <Language language={server.raterLang} />
                    </Definition>
                  </div>
                  <div>
                    <Definition title="Members">{server.memberCount}</Definition>
                    <Definition title="Members in DB">{server.localUserCount}</Definition>
                  </div>
                </div>
                <div className={cx('server-page__additional')}>
                  <ServerModuleList
                    className={cx('server-page__modules')}
                    guildId={guildId}
                    moduleIdList={server.modules}
                    isAdmin={server?.isAdmin}
                  />
                  <ServerAdminList
                    className={cx('server-page__admins')}
                    guildId={guildId}
                    adminUserList={server.adminUserList}
                    isAdmin={server?.isAdmin}
                  />
                </div>
                {server.isAdmin && (
                  <div className={cx('server-page__controls')}>
                    <Button onClick={syncChannels} disabled={serverState.isSending} variant="contained">
                      Rescan
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Empty isError />
            )}
          </Loader>
          <ChannelList serverId={guildId} mainChannelId={server?.mainChannelId} isAdmin={server?.isAdmin} />
        </>
      )}
    </div>
  );
};

export { ServerPage };
