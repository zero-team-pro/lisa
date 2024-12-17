import { Tooltip } from '@mui/material';
import cn from 'classnames/bind';
import React from 'react';

import { CommandType } from 'App/types';

import AbilitySvg from './img/ability.svg?react';
import CommandSvg from './img/command.svg?react';

import styles from './styles.module.scss';

const cx = cn.bind(styles);

interface IProps {
  type: CommandType;
  size?: 'default';
}

const CommandTypeIcon: React.FC<IProps> = (props: IProps) => {
  const { type, size = 'default' } = props;

  return (
    <div className={cx('icon', `icon_size-${size}`)}>
      {type === CommandType.Command && (
        <Tooltip title="Command">
          <CommandSvg className={cx('icon__svg')} />
        </Tooltip>
      )}
      {type === CommandType.Ability && (
        <Tooltip title="Ability">
          <AbilitySvg className={cx('icon__svg')} />
        </Tooltip>
      )}
    </div>
  );
};

export { CommandTypeIcon };
