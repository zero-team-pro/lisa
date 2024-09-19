import React from 'react';
import { Tooltip } from '@mui/material';

import styles from './styles.scss';

import { Transport } from 'App/types';
import { ReactComponent as DiscordSvg } from './img/discord.svg';
import { ReactComponent as TelegramSvg } from './img/telegram.svg';

const cx = require('classnames/bind').bind(styles);

interface IProps {
  transport: Transport;
  size?: 'default';
}

const TransportIcon: React.FC<IProps> = (props: IProps) => {
  const { transport, size = 'default' } = props;

  return (
    <div className={cx('icon', `icon_size-${size}`)}>
      {transport === Transport.Discord && (
        <Tooltip title="Discord">
          <DiscordSvg fill="white" className={cx('icon__svg')} />
        </Tooltip>
      )}
      {transport === Transport.Telegram && (
        <Tooltip title="Telegram">
          <TelegramSvg className={cx('icon__svg')} />
        </Tooltip>
      )}
    </div>
  );
};

export { TransportIcon };
