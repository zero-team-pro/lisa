import React from 'react';

import styles from './styles.module.scss';

import cn from 'classnames/bind';

const cx = cn.bind(styles);

interface IProps {
  title: string;
  children: React.ReactNode;
}

const LegalPage: React.FC<IProps> = ({ title, children }) => (
  <article className={cx('legal-page')}>
    <h1>{title}</h1>
    <p className={cx('legal-page__date')}>Effective date: July 13, 2026</p>
    {children}
  </article>
);

export { LegalPage };
