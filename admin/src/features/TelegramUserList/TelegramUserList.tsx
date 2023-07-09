import React, { useEffect } from 'react';
import { Avatar, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

import styles from './styles.scss';

import { fetchTelegramUserList, useAppDispatch, useAppSelector } from 'App/redux';
import { Checker } from 'App/components/Checker';
import { Language } from 'App/components/Language';

const cx = require('classnames/bind').bind(styles);

const TelegramUserList: React.FC = () => {
  const dispatch = useAppDispatch();

  const userListState = useAppSelector((state) => state.telegramUserList);
  const userList = useAppSelector((state) => state.telegramUserList.value);

  useEffect(() => {
    if (!userListState.error) {
      dispatch(fetchTelegramUserList());
    }
  }, [dispatch, userListState.error]);

  return (
    <div className={cx('telegram-user-list')}>
      <Checker isList check={userListState}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="left" width={48}>
                  Photo
                </TableCell>
                <TableCell align="left">Username</TableCell>
                <TableCell align="left">Language</TableCell>
                <TableCell align="right" width={150}>
                  ID
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {userList?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Avatar className={cx('telegram-user-list__photo')} src={user.avatarUrlSmall || ''} alt="?" />
                  </TableCell>
                  <TableCell>@{user.username}</TableCell>
                  <TableCell>
                    <Language language={user.lang} />
                  </TableCell>
                  <TableCell align="right">{user.id}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Checker>
    </div>
  );
};

export { TelegramUserList };
