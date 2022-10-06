import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
import { Node } from 'slate';
import { Avatar, Button, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField } from '@mui/material';

import styles from './styles.scss';

import TextEditor from 'App/components/TextEditor';
import { EditorTextType, IEditorText, ITelegramChat } from 'App/types';
import { createArticle, useAppSelector } from 'App/redux';

const cx = require('classnames/bind').bind(styles);

interface IProps {
  chatList: ITelegramChat[];
  chatParamId?: string;
}

const initialText: IEditorText[] = [{ type: EditorTextType.Paragraph, children: [{ text: '' }] }];

function TelegramPostForm(props: IProps) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const article = useAppSelector((state) => state.article);

  const [chatId, setChatId] = React.useState(props.chatParamId || '');
  const [title, setTitle] = React.useState('');
  const [text, setText] = React.useState(initialText);

  useEffect(() => {
    if (article.value) {
      navigate('/article');
    }
  }, [article, navigate]);

  const setFormChannel = (event: SelectChangeEvent) => {
    setChatId(event?.target?.value);
  };

  const setFormTitle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event?.target?.value);
  };

  const savePost = () => {
    const data = { title, text: serialize(text), chatId };
    dispatch(createArticle({ value: data }));
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
        Preview & Post
      </Button>
    </FormControl>
  );
}

/***
 * Telegram formatting options
 * https://core.telegram.org/bots/api#formatting-options
 ***/
const serialize = (content: any[]) => {
  return content
    .map((node) => {
      let text;

      if (node?.type === 'paragraph' && Array.isArray(node?.children)) {
        text = node.children
          .map((child: any) => {
            const escapeCharacterList = [
              '_',
              '*',
              '[',
              ']',
              '(',
              ')',
              '~',
              '`',
              '>',
              '#',
              '+',
              '-',
              '=',
              '|',
              '{',
              '}',
              '.',
              '!',
            ];

            let childText = escapeCharacterList.reduce((text, character) => {
              const regexp = new RegExp(`\\${character}`, 'g');
              return text.replace(regexp, `\\${character}`);
            }, child?.text);

            if (child.bold) {
              childText = `*${childText}*`;
            }
            if (child.italic) {
              childText = `_${childText}_`;
            }
            if (child.underline) {
              childText = `__${childText}__`;
            }
            if (child.code) {
              childText = `\`${childText}\``;
            }

            return childText;
          })
          .join('');
      } else {
        text = Node.string(node);
      }

      return text;
    })
    .filter((node) => node)
    .join(`\n`);
};

export default TelegramPostForm;
