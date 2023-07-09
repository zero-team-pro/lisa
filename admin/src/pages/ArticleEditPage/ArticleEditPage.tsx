import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useParams } from 'react-router';

import styles from './styles.scss';

import { fetchArticle, fetchTelegramChatList, useAppDispatch, useAppSelector } from 'App/redux';
import { Checker } from 'App/components/Checker';
import { TelegramPostForm } from 'App/features/TelegramPostForm';
import { Loader } from 'App/components/Loader';

const cx = require('classnames/bind').bind(styles);

const ArticleEditPage: React.FC = () => {
  const dispatch = useAppDispatch();

  const [searchParams] = useSearchParams();
  const chatParamId = searchParams.get('chatId') || '';
  const { id: articleId } = useParams();

  const articleState = useAppSelector((state) => state.article);
  const chatListState = useAppSelector((state) => state.telegramChatList);
  const chatList = useAppSelector((state) => state.telegramChatList.value);

  useEffect(() => {
    if (articleId) {
      dispatch(fetchArticle(articleId));
    }
  }, [articleId, dispatch]);

  useEffect(() => {
    if (!chatList && !chatListState.isLoaded && !chatListState.error) {
      dispatch(fetchTelegramChatList());
    }
  }, [dispatch, chatList, chatListState.isLoaded, chatListState.error]);

  return (
    <div className={cx('article-edit-page')}>
      <div>
        <h1>Edit Article</h1>
        <Checker isList check={chatListState}>
          {articleState.value && chatList ? (
            <TelegramPostForm chatList={chatList} chatParamId={chatParamId} article={articleState.value} />
          ) : (
            <Loader />
          )}
        </Checker>
      </div>
    </div>
  );
};

export { ArticleEditPage };
