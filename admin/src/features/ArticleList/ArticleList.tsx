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
import { DriveFileRenameOutlineOutlined, SendOutlined } from '@mui/icons-material';

import styles from './styles.module.scss';

import { fetchArticleList, postArticle, useAppDispatch, useAppSelector } from 'App/redux';
import { Checker } from 'App/components/Checker';
import { IArticle } from 'App/types';
import { Link } from 'App/components/Link';
import { TransportIcon } from 'App/components/TransportIcon';
import { TextEditor } from 'App/components/TextEditor';

import cn from 'classnames/bind';

const cx = cn.bind(styles);

const ArticleList: React.FC = () => {
  const dispatch = useAppDispatch();

  const articleListState = useAppSelector((state) => state.articleList);
  const articleList = useAppSelector((state) => state.articleList.value);

  useEffect(() => {
    if (!articleListState.error) {
      dispatch(fetchArticleList());
    }
  }, [dispatch, articleListState.error]);

  const makePost = (articleId: number) => {
    dispatch(postArticle({ value: { id: articleId } }));
  };

  const renderActions = (article: IArticle) => {
    return (
      <div>
        <Link to={`/article/${article.id}`}>
          <IconButton>
            <Tooltip title="Edit article">
              <DriveFileRenameOutlineOutlined />
            </Tooltip>
          </IconButton>
        </Link>
        <IconButton onClick={() => makePost(article.id)}>
          <Tooltip title="Post">
            <SendOutlined />
          </Tooltip>
        </IconButton>
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
                    <TextEditor readonlyValue={article.text} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Checker>
    </div>
  );
};

export { ArticleList };
