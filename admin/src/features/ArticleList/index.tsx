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

import { fetchArticleList, useAppDispatch, useAppSelector } from 'App/redux';
import Checker from 'App/components/Checker';
import { IArticle } from 'App/types';
import Link from 'App/components/Link';
import TransportIcon from 'App/components/TransportIcon';
import remarkGfm from 'remark-gfm';
import ReactMarkdown from 'react-markdown';

const cx = require('classnames/bind').bind(styles);

function ArticleList() {
  const dispatch = useAppDispatch();

  const articleListState = useAppSelector((state) => state.articleList);
  const articleList = useAppSelector((state) => state.articleList.value);

  useEffect(() => {
    if (!articleList && !articleListState.isLoaded && !articleListState.error) {
      dispatch(fetchArticleList());
    }
  }, [dispatch, articleList, articleListState.isLoaded, articleListState.error]);

  const renderActions = (article: IArticle) => {
    return (
      <div>
        <Link to={`/telegram/post?articleId=${article.id}`}>
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
    <div className={cx('article-list')}>
      <Checker isList check={articleListState}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="center" width={32}>
                  Platform
                </TableCell>
                <TableCell align="left" width={48}>
                  Avatar
                </TableCell>
                <TableCell align="left" width={200}>
                  Channel
                </TableCell>
                <TableCell align="left">Title</TableCell>
                <TableCell align="left" width={100}>
                  Actions
                </TableCell>
                <TableCell align="left">Text preview</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {articleList?.map((article) => (
                <TableRow key={article.id}>
                  <TableCell align="center">
                    <TransportIcon transport={article.transport} />
                  </TableCell>
                  <TableCell>
                    <Avatar className={cx('article-list__photo')} src={article.chat?.photoUrl || ''} alt="?" />
                  </TableCell>
                  <TableCell>{article.chat?.title || article.chat?.id}</TableCell>
                  <TableCell>
                    <b>{article.title}</b>
                  </TableCell>
                  <TableCell>{renderActions(article)}</TableCell>
                  <TableCell>
                    <ReactMarkdown
                      children={article.text?.replace?.('\n', '⏎').substring(0, 100) || ''}
                      remarkPlugins={[remarkGfm]}
                    />
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

export default ArticleList;
