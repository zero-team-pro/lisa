import React from 'react';

import styles from './styles.scss';

import TelegramAdd from 'App/features/TelegramAdd';

const cx = require('classnames/bind').bind(styles);

function TelegramListPage() {
  return (
    <div className={cx('telegram-list-page')}>
      <div>
        <h1>Your Telegram Channels</h1>
        <TelegramAdd />
      </div>
    </div>
  );
}

export default TelegramListPage;
