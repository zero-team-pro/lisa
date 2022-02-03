import React, { useEffect, useState } from 'react';
import { Checkbox, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Check, HistoryOutlined, ModeEditOutlined } from '@mui/icons-material';

import styles from './styles.scss';
import { fetchChannelList, patchChannel, useAppDispatch, useAppSelector } from 'App/redux';
import { IChannel } from 'App/types';

const cx = require('classnames/bind').bind(styles);

interface IProps {
  serverId: string;
}

function ChannelList(props: IProps) {
  const [isMounting, setIsMounting] = useState(true);

  const dispatch = useAppDispatch();
  const { serverId } = props;

  const channelListState = useAppSelector((state) => state.channelList);
  const channelList = channelListState.value;

  useEffect(() => {
    if (serverId) {
      dispatch(fetchChannelList(serverId));
    }
  }, [dispatch, serverId]);

  useEffect(() => {
    if (channelListState.isLoading) {
      setIsMounting(false);
    }
  }, [dispatch, channelListState.isLoading]);

  const updateChannelEnable = (channelId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const value: Partial<IChannel> = { isEnabled: event.target.checked };
    dispatch(patchChannel({ id: channelId, value }));
  };

  return (
    <div className={cx('channel-list')}>
      {Array.isArray(channelList) && !isMounting && (
        <div className={cx('channel-list__content')}>
          <TableContainer className={cx('channel-list__table')} component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width={34}>
                    <Check />
                  </TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell align="right">Permissions</TableCell>
                  <TableCell align="right">Type</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {channelList.map((channel) => (
                  <TableRow key={channel.id}>
                    <TableCell>
                      <Checkbox
                        checked={channel.isEnabled}
                        onChange={(event) => updateChannelEnable(channel.id, event)}
                      />
                    </TableCell>
                    <TableCell>{channel.name}</TableCell>
                    <TableCell align="right">
                      {channel.permissionList?.includes('READ_MESSAGE_HISTORY') && <HistoryOutlined />}
                      {channel.permissionList?.includes('SEND_MESSAGES') && <ModeEditOutlined />}
                    </TableCell>
                    <TableCell align="right">{channel.type}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {/*<img src={server.iconUrl} alt={server.name} />*/}
          {/*<h2>{server.name}</h2>*/}
        </div>
      )}
    </div>
  );
}

export default ChannelList;
