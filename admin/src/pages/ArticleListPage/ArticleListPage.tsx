import React from 'react';

import styles from './styles.module.scss';

import { ArticleList } from 'App/features/ArticleList';

import cn from 'classnames/bind';

const cx = cn.bind(styles);

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
