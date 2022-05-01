import React from 'react';
import { Avatar, Button, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from '@mui/material';

import styles from './styles.scss';

import TextEditor from 'App/components/TextEditor';
import { EditorTextType, IEditorText, ITelegramChat } from 'App/types';

const cx = require('classnames/bind').bind(styles);

interface IProps {
  chatList: ITelegramChat[];
  chatParamId?: string;
}

const initialText: IEditorText[] = [{ type: EditorTextType.Paragraph, children: [{ text: '' }] }];

function TelegramPostForm(props: IProps) {
  const [chatId, setChatId] = React.useState(props.chatParamId || '');
  const [title, setTitle] = React.useState('');
  const [text, setText] = React.useState(initialText);

  const setFormChannel = (event: SelectChangeEvent) => {
    setChatId(event?.target?.value);
  };

  const setFormTitle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event?.target?.value);
  };

  const renderChannelItem = (chat: ITelegramChat) => {
    const chatName = chat.title || chat.id.toString();

    return (
      <MenuItem key={chat.id} value={chat.id}>
        <div className={cx('telegram-post__channel')}>
          <Avatar src={chat.photoUrl} alt="?" />
          <div>{chatName}</div>
        </div>
      </MenuItem>
    );
  };

  return (
    <FormControl className={cx('telegram-post')}>
      <InputLabel id="post-channel-label">Channel</InputLabel>
      <Select value={chatId} onChange={setFormChannel} id="post-channel" labelId="post-channel-label" label="Channel">
        {props.chatList?.map((chat) => renderChannelItem(chat))}
      </Select>
      <TextField value={title} onChange={setFormTitle} label="Title" variant="outlined" />
      <TextEditor value={text} onChange={setText} />
      <Button variant="contained">Preview & Post</Button>
    </FormControl>
  );
}

export default TelegramPostForm;
