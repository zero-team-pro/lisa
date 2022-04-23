import React, { useEffect } from 'react';
import { Avatar, Button, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from '@mui/material';

import styles from './styles.scss';

import { fetchTelegramChatList, useAppDispatch, useAppSelector } from 'App/redux';
import Checker from 'App/components/Checker';
import TextEditor from 'App/components/TextEditor';

const cx = require('classnames/bind').bind(styles);

function TelegramNewPostPage() {
  const dispatch = useAppDispatch();

  const [channel, setChannel] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [text, setText] = React.useState('');

  const chatListState = useAppSelector((state) => state.telegramChatList);
  const chatList = useAppSelector((state) => state.telegramChatList.value);

  useEffect(() => {
    if (!chatList && !chatListState.isLoaded && !chatListState.error) {
      dispatch(fetchTelegramChatList());
    }
  }, [dispatch, chatList, chatListState.isLoaded, chatListState.error]);

  const setFormChannel = (event: SelectChangeEvent) => {
    setChannel(event?.target?.value);
  };

  const setFormTitle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event?.target?.value);
  };

  const renderMiniChannel = (name: string) => {
    return (
      <div className={cx('channel-mini')}>
        <Avatar src={''} alt="?" />
        <div>{name}</div>
      </div>
    );
  };

  return (
    <div className={cx('telegram-new-post-page')}>
      <div className={cx('new-post')}>
        <h1>Create Post</h1>
        <Checker isList check={chatListState}>
          <FormControl>
            <InputLabel id="post-channel-label">Channel</InputLabel>
            <Select
              value={channel}
              onChange={setFormChannel}
              id="post-channel"
              labelId="post-channel-label"
              label="Channel"
            >
              <MenuItem value={1}>{renderMiniChannel('Development')}</MenuItem>
              <MenuItem value={2}>{renderMiniChannel('Production')}</MenuItem>
            </Select>
            <TextField value={title} onChange={setFormTitle} label="Title" variant="outlined" />
            <TextEditor value={text} onChange={setText} />
            <Button variant="contained">Preview & Post</Button>
          </FormControl>
        </Checker>
      </div>
    </div>
  );
}

export default TelegramNewPostPage;
