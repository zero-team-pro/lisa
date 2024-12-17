import React from 'react';
import { Tooltip } from '@mui/material';

import styles from './styles.module.scss';

import { Transport } from 'App/types';
import DiscordSvg from './img/discord.svg?react';
import TelegramSvg from './img/telegram.svg?react';

import cn from 'classnames/bind';

const cx = cn.bind(styles);

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
