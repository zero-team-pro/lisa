import React, { useEffect } from 'react';
import {
  Checkbox,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import {
  ArrowDropDown,
  AttachFileOutlined,
  Check,
  EmojiEmotionsOutlined,
  HistoryOutlined,
  ModeEditOutlined,
  RecordVoiceOverOutlined,
  VisibilityOutlined,
} from '@mui/icons-material';

import styles from './styles.scss';
import { fetchChannelList, patchChannel, useAppDispatch, useAppSelector } from 'App/redux';
import { IChannel } from 'App/types';
import Loader from 'App/components/Loader';
import Empty from 'App/components/Empty';

const cx = require('classnames/bind').bind(styles);

interface IProps {
  serverId: string;
  mainChannelId?: string;
  isAdmin?: boolean;
}

const defaultProps: Partial<IProps> = {
  isAdmin: false,
};

function ChannelList(props: IProps) {
  const dispatch = useAppDispatch();
  const { serverId, mainChannelId, isAdmin } = props;

  const channelListState = useAppSelector((state) => state.channelList);
  const channelList = channelListState.value;

  useEffect(() => {
    if (serverId) {
      dispatch(fetchChannelList(serverId));
    }
  }, [dispatch, serverId]);

  const updateChannelEnable = (channelId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const value: Partial<IChannel> = { isEnabled: event.target.checked };
    dispatch(patchChannel({ id: channelId, value }));
  };

  return (
    <div className={cx('channel-list')}>
      <div className={cx('channel-list__content')}>
        <Loader isLoading={channelListState.isLoading}>
          {channelList ? (
            channelList.length > 0 ? (
              <TableContainer className={cx('channel-list__table')} component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      {isAdmin && (
                        <TableCell align="center" width={34}>
                          <Check />
                        </TableCell>
                      )}
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
                        {isAdmin && (
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
                        )}
                        <TableCell>
                          <div className={cx('channel-list__table__name')}>
                            <span className={cx('channel-list__table__name__text')}>{channel.name}</span>
                            {channel.id === mainChannelId && (
                              <Chip className={cx('channel-list__table__name__chip')} label="Main" size="small" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell align="right">{channel.id}</TableCell>
                        <TableCell align="right">
                          {channel.permissionList?.includes('ADD_REACTIONS') && (
                            <Tooltip title="ADD_REACTIONS">
                              <EmojiEmotionsOutlined />
                            </Tooltip>
                          )}
                          {channel.permissionList?.includes('ATTACH_FILES') && (
                            <Tooltip title="ATTACH_FILES">
                              <AttachFileOutlined />
                            </Tooltip>
                          )}
                          {channel.permissionList?.includes('STREAM') && channel.permissionList?.includes('SPEAK') && (
                            <Tooltip title="STREAM & SPEAK">
                              <RecordVoiceOverOutlined />
                            </Tooltip>
                          )}
                          {channel.permissionList?.includes('SEND_MESSAGES') && (
                            <Tooltip title="SEND_MESSAGES">
                              <ModeEditOutlined />
                            </Tooltip>
                          )}
                          {channel.permissionList?.includes('READ_MESSAGE_HISTORY') && (
                            <Tooltip title="READ_MESSAGE_HISTORY">
                              <HistoryOutlined />
                            </Tooltip>
                          )}
                          {channel.permissionList?.includes('VIEW_CHANNEL') && (
                            <Tooltip title="VIEW_CHANNEL">
                              <VisibilityOutlined />
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell align="right">{channel.type}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Empty />
            )
          ) : (
            <Empty isError />
          )}
        </Loader>
      </div>
    </div>
  );
}

ChannelList.defaultProps = defaultProps;

export default ChannelList;
