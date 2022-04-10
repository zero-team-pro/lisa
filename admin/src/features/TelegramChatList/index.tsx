import React, { useEffect } from 'react';
import { Avatar, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

import styles from './styles.scss';

import { fetchTelegramChatList, useAppDispatch, useAppSelector } from 'App/redux';
import Checker from 'App/components/Checker';
import Language from 'App/components/Language';

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

  return (
    <div className={cx('telegram-chat-list')}>
      <Checker isList check={chatListState}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="left" width={150}>
                  ID
                </TableCell>
                <TableCell align="left" width={48}>
                  Photo
                </TableCell>
                <TableCell align="left">Title</TableCell>
                <TableCell align="left">Name</TableCell>
                <TableCell align="left">Language</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {chatList?.map((chat) => (
                <TableRow key={chat.id}>
                  <TableCell>{chat.id}</TableCell>
                  <TableCell>
                    <Avatar className={cx('telegram-chat-list__photo')} src={chat.photoUrl || ''} alt="?" />
                  </TableCell>
                  <TableCell>{chat.title}</TableCell>
                  <TableCell>@{chat.username}</TableCell>
                  <TableCell>
                    <Language language={chat.lang} />
                  </TableCell>
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
