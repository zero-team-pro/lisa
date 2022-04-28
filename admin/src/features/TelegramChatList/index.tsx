import React, { useEffect } from 'react';
import {
  Avatar,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import { DriveFileRenameOutlineOutlined } from '@mui/icons-material';

import styles from './styles.scss';

import { fetchTelegramChatList, useAppDispatch, useAppSelector } from 'App/redux';
import Checker from 'App/components/Checker';
import Language from 'App/components/Language';
import { ITelegramChat } from 'App/types';
import Link from 'App/components/Link';

const cx = require('classnames/bind').bind(styles);

function TelegramChatList() {
  const dispatch = useAppDispatch();

  const chatListState = useAppSelector((state) => state.telegramChatList);
  const chatList = useAppSelector((state) => state.telegramChatList.value);

  useEffect(() => {
    if (!chatList && !chatListState.isLoaded && !chatListState.error) {
      dispatch(fetchTelegramChatList());
    }
  }, [dispatch, chatList, chatListState.isLoaded, chatListState.error]);

  const renderActions = (chat: ITelegramChat) => {
    return (
      <div>
        <Link to={`/telegram/post?chatId=${chat.id}`}>
          <IconButton>
            <Tooltip title="Create post">
              <DriveFileRenameOutlineOutlined />
            </Tooltip>
          </IconButton>
        </Link>
      </div>
    );
  };

  return (
    <div className={cx('telegram-chat-list')}>
      <Checker isList check={chatListState}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="left" width={48}>
                  Photo
                </TableCell>
                <TableCell align="left">Title</TableCell>
                <TableCell align="left" width={100}>
                  Actions
                </TableCell>
                <TableCell align="left">Name</TableCell>
                <TableCell align="left">Language</TableCell>
                <TableCell align="right" width={150}>
                  ID
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {chatList?.map((chat) => (
                <TableRow key={chat.id}>
                  <TableCell>
                    <Avatar className={cx('telegram-chat-list__photo')} src={chat.photoUrl || ''} alt="?" />
                  </TableCell>
                  <TableCell>{chat.title}</TableCell>
                  <TableCell>{renderActions(chat)}</TableCell>
                  <TableCell>@{chat.username}</TableCell>
                  <TableCell>
                    <Language language={chat.lang} />
                  </TableCell>
                  <TableCell align="right">{chat.id}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Checker>
    </div>
  );
}

export default TelegramChatList;
