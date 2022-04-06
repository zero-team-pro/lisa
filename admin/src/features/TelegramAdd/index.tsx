import React from 'react';

import styles from './styles.scss';

import Modal from 'App/features/Modal';
import Link from 'App/components/Link';
import Code from 'App/components/Code';

const cx = require('classnames/bind').bind(styles);

function TelegramAdd() {
  const botUsername = 'LisaWitchBot';

  return (
    <Modal buttonTitle="Add">
      <div className={cx('telegram-add')}>
        <h2>Add Telegram user</h2>
        <div>
          Send this message to bot{' '}
          <Link isGlobal to={`https://t.me/${botUsername}`}>
            @{botUsername}
          </Link>
          <Code>/linkMe 1</Code>
        </div>
        <h2>Add Telegram channel or chat</h2>
        <div>
          <div>
            1. Add bot{' '}
            <Link isGlobal to={`https://t.me/${botUsername}`}>
              @{botUsername}
            </Link>{' '}
            to channel/chat administrators.
          </div>
          <div>
            2. Send this message to bot{' '}
            <Link isGlobal to={`https://t.me/${botUsername}`}>
              @{botUsername}
            </Link>
            <Code>/linkChannel [channel name or link]</Code>
            For example:
            <Code>
              /linkChannel @channel{'\n'}
              /linkChannel https://t.me/channel
            </Code>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default TelegramAdd;
