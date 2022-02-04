import React, { useEffect, useState } from 'react';
import { Checkbox, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { ArrowDropDown, Check, HistoryOutlined, ModeEditOutlined } from '@mui/icons-material';

import styles from './styles.scss';
import { fetchChannelList, patchChannel, useAppDispatch, useAppSelector } from 'App/redux';
import { IChannel } from 'App/types';

const cx = require('classnames/bind').bind(styles);

interface IProps {
  serverId: string;
  mainChannelId?: string;
}

function ChannelList(props: IProps) {
  const [isMounting, setIsMounting] = useState(true);

  const dispatch = useAppDispatch();
  const { serverId, mainChannelId } = props;

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
                  <TableCell align="center" width={34}>
                    <Check />
                  </TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell align="right">ID</TableCell>
                  <TableCell align="right">Permissions</TableCell>
                  <TableCell align="right">Type</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {channelList.map((channel) => (
                  <TableRow
                    className={cx('channel-list__table__raw', {
                      'channel-list__table__raw_category': channel.type === 'GUILD_CATEGORY',
                    })}
                    key={channel.id}
                  >
                    <TableCell align="center" className={cx('channel-list__table__id')}>
                      {channel.type === 'GUILD_CATEGORY' && <ArrowDropDown />}
                      {channel.type === 'GUILD_TEXT' && (
                        <Checkbox
                          checked={channel.isEnabled}
                          onChange={(event) => updateChannelEnable(channel.id, event)}
                          disabled={channelListState.isSending}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className={cx('channel-list__table__name')}>
                        {channel.name}
                        {channel.id === mainChannelId && (
                          <Chip className={cx('channel-list__table__name__chip')} label="Main" size="small" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell align="right">{channel.id}</TableCell>
                    <TableCell align="right">
                      {channel.permissionList?.includes('SEND_MESSAGES') && <ModeEditOutlined />}
                      {channel.permissionList?.includes('READ_MESSAGE_HISTORY') && <HistoryOutlined />}
                    </TableCell>
                    <TableCell align="right">{channel.type}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      )}
    </div>
  );
}

export default ChannelList;
