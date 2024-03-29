import React from 'react';

import styles from './styles.scss';

import { ArticleList } from 'App/features/ArticleList';

const cx = require('classnames/bind').bind(styles);

const ArticleListPage: React.FC = () => {
  return (
    <div className={cx('article-list-page')}>
      <div className={cx('article-list-page__list')}>
        <h1>Your Articles</h1>
        <ArticleList />
      </div>
    </div>
  );
};

export { ArticleListPage };
