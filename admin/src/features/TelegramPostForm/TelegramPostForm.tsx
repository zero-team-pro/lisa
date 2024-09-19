import { Avatar, Button, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from '@mui/material';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';

import styles from './styles.scss';

import { TextEditor } from 'App/components/TextEditor';
import { clearArticle, createArticle, saveArticle, useAppDispatch, useAppSelector } from 'App/redux';
import { EditorTextType, IArticle, IEditorText, ITelegramChat } from 'App/types';

const cx = require('classnames/bind').bind(styles);

interface IProps {
  chatList: ITelegramChat[];
  chatParamId?: string;
  article?: IArticle;
}

const initialText: IEditorText[] = [{ type: EditorTextType.Paragraph, children: [{ text: '' }] }];

const TelegramPostForm: React.FC<IProps> = (props: IProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const article = useAppSelector((state) => state.article);

  const [chatId, setChatId] = React.useState(props.chatParamId || props.article?.chatId || '');
  const [title, setTitle] = React.useState(props.article?.title || '');
  const [text, setText] = React.useState(deserialize(props.article?.text) || initialText);

  useEffect(() => {
    if (article.isSent) {
      dispatch(clearArticle());
      navigate('/article');
    }
  }, [article, dispatch, navigate]);

  const setFormChannel = (event: SelectChangeEvent) => {
    setChatId(event?.target?.value);
  };

  const setFormTitle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event?.target?.value);
  };

  const savePost = () => {
    const data = { title, text: serialize(text), chatId };
    if (!props.article?.id) {
      dispatch(createArticle({ value: data }));
    } else {
      dispatch(saveArticle({ id: props.article.id, value: data }));
    }
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
      <Button disabled={article.isSending} onClick={savePost} variant="contained">
        {props.article?.id ? 'Save article' : 'Preview & Post'}
      </Button>
    </FormControl>
  );
};

const serialize = (text: IEditorText[]) => {
  return JSON.stringify(text);
};

const deserialize = (text?: string): IEditorText[] | null => {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export { TelegramPostForm };
