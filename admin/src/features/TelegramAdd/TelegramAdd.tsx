import React, { useCallback } from 'react';

import styles from './styles.scss';

import { Modal } from 'App/features/Modal';
import { Link } from 'App/components/Link';
import { Code } from 'App/components/Code';
import { fetchTelegramLinkUser, useAppDispatch, useAppSelector } from 'App/redux';
import { Loader } from 'App/components/Loader';

const cx = require('classnames/bind').bind(styles);

interface IProps {
  className?: string;
}

const TelegramAdd: React.FC<IProps> = (props) => {
  const dispatch = useAppDispatch();

  const botUsername = 'LisaWitchBot';

  const telegramLinkUserState = useAppSelector((state) => state.telegramLinkUser);
  const telegramLinkUser = useAppSelector((state) => state.telegramLinkUser.value);

  const isLoading = telegramLinkUserState.isSending;

  const handleOpen = useCallback(() => {
    if (!telegramLinkUser) {
      dispatch(fetchTelegramLinkUser({}));
    }
  }, [dispatch, telegramLinkUser]);

  return (
    <Modal buttonTitle="Add" className={cx(props.className)} onOpen={handleOpen}>
      <Loader isLoading={isLoading}>
        <div className={cx('telegram-add')}>
          <h2>Add Telegram user</h2>
          <div>
            Send this message to bot{' '}
            <Link isGlobal to={`https://t.me/${botUsername}`}>
              @{botUsername}
            </Link>
            . The token provided is valid for 1 hour.
            <Code>{telegramLinkUser ? `/linkMe ${telegramLinkUser}` : 'ERROR'}</Code>
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
      </Loader>
    </Modal>
  );
};

export { TelegramAdd };
