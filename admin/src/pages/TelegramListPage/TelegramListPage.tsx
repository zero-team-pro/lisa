import React from 'react';

import styles from './styles.module.scss';

import { TelegramAdd } from 'App/features/TelegramAdd';
import { TelegramUserList } from 'App/features/TelegramUserList';
import { TelegramChatList } from 'App/features/TelegramChatList';

import cn from 'classnames/bind';

const cx = cn.bind(styles);

const TelegramListPage: React.FC = () => {
  return (
    <div className={cx('telegram-list-page')}>
      <div className={cx('telegram-list-page__list')}>
        <h1>Your Telegram Channels</h1>
        <TelegramAdd className={cx('telegram-list-page__list__add')} />
        <TelegramChatList />
      </div>
      <div className={cx('telegram-list-page__list')}>
        <h1>Your Telegram Users</h1>
        <TelegramAdd className={cx('telegram-list-page__list__add')} />
        <TelegramUserList />
      </div>
    </div>
  );
};

export { TelegramListPage };
