import React, { useEffect } from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

import styles from './styles.scss';

import { fetchTelegramUserList, useAppDispatch, useAppSelector } from 'App/redux';
import Checker from 'App/components/Checker';
import Language from 'App/components/Language';

const cx = require('classnames/bind').bind(styles);

function TelegramUserList() {
  const dispatch = useAppDispatch();

  const userListState = useAppSelector((state) => state.telegramUserList);
  const userList = useAppSelector((state) => state.telegramUserList.value);

  useEffect(() => {
    if (!userList && !userListState.isLoaded && !userListState.error) {
      dispatch(fetchTelegramUserList());
    }
  }, [dispatch, userList, userListState.isLoaded, userListState.error]);

  return (
    <div className={cx('telegram-user-list')}>
      <Checker isList check={userListState}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="left" width={150}>
                  ID
                </TableCell>
                <TableCell align="left">Username</TableCell>
                <TableCell align="left">Language</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {userList?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>@{user.username}</TableCell>
                  <TableCell>
                    <Language language={user.lang} />
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

export default TelegramUserList;
