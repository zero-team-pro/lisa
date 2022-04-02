import React from 'react';

import styles from './styles.scss';

const cx = require('classnames/bind').bind(styles);

function TelegramListPage() {
  return (
    <div className={cx('telegram-list-page')}>
      <div>
        <h1>Your Telegram Channels</h1>
      </div>
    </div>
  );
}

export default TelegramListPage;
