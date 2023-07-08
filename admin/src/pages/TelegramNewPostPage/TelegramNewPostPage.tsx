import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import styles from './styles.scss';

import { fetchTelegramChatList, useAppDispatch, useAppSelector } from 'App/redux';
import Checker from 'App/components/Checker';
import TelegramPostForm from 'App/features/TelegramPostForm';

const cx = require('classnames/bind').bind(styles);

const TelegramNewPostPage: React.FC = () => {
  const dispatch = useAppDispatch();

  const [searchParams] = useSearchParams();
  const chatParamId = searchParams.get('chatId') || '';

  const chatListState = useAppSelector((state) => state.telegramChatList);
  const chatList = useAppSelector((state) => state.telegramChatList.value);

  useEffect(() => {
    if (!chatList && !chatListState.isLoaded && !chatListState.error) {
      dispatch(fetchTelegramChatList());
    }
  }, [dispatch, chatList, chatListState.isLoaded, chatListState.error]);

  return (
    <div className={cx('telegram-new-post-page')}>
      <div className={cx('new-post')}>
        <h1>Create Article</h1>
        <Checker isList check={chatListState}>
          {chatList && <TelegramPostForm chatList={chatList} chatParamId={chatParamId} />}
        </Checker>
      </div>
    </div>
  );
};

export { TelegramNewPostPage };
