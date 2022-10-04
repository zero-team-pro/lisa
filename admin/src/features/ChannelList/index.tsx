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
import { ChannelType, ChannelTypeMap, IChannel } from 'App/types';
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

  const getChannelTypeName = (type: ChannelType | undefined) => {
    const typeString = type?.toString();
    if (!typeString) {
      return 'Unknown';
    }
    return ChannelTypeMap[typeString];
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
                          'channel-list__table__raw_category': channel.type === ChannelType.GuildCategory,
                        })}
                        key={channel.id}
                      >
                        {isAdmin && (
                          <TableCell align="center" className={cx('channel-list__table__id')}>
                            {channel.type === ChannelType.GuildCategory && <ArrowDropDown />}
                            {channel.type === ChannelType.GuildText && (
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
                          {channel.permissionList?.includes('AddReactions') && (
                            <Tooltip title="AddReactions">
                              <EmojiEmotionsOutlined />
                            </Tooltip>
                          )}
                          {channel.permissionList?.includes('AttachFiles') && (
                            <Tooltip title="AttachFiles">
                              <AttachFileOutlined />
                            </Tooltip>
                          )}
                          {channel.permissionList?.includes('Stream') && channel.permissionList?.includes('Speak') && (
                            <Tooltip title="Stream & Speak">
                              <RecordVoiceOverOutlined />
                            </Tooltip>
                          )}
                          {channel.permissionList?.includes('SendMessages') && (
                            <Tooltip title="SendMessages">
                              <ModeEditOutlined />
                            </Tooltip>
                          )}
                          {channel.permissionList?.includes('ReadMessageHistory') && (
                            <Tooltip title="ReadMessageHistory">
                              <HistoryOutlined />
                            </Tooltip>
                          )}
                          {channel.permissionList?.includes('ViewChannel') && (
                            <Tooltip title="ViewChannel">
                              <VisibilityOutlined />
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell align="right">{getChannelTypeName(channel.type)}</TableCell>
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
