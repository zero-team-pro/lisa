import React from 'react';
import { Tooltip } from '@mui/material';

import styles from './styles.scss';

import { CommandType } from 'App/types';
import { ReactComponent as AbilitySvg } from './img/ability.svg';
import { ReactComponent as CommandSvg } from './img/command.svg';

const cx = require('classnames/bind').bind(styles);

interface IProps {
  type: CommandType;
  size?: 'default';
}

const defaultProps: Partial<IProps> = {
  size: 'default',
};

const CommandTypeIcon: React.FC<IProps> = (props: IProps) => {
  const { type } = props;

  return (
    <div className={cx('icon', `icon_size-${props.size}`)}>
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

CommandTypeIcon.defaultProps = defaultProps;

export { CommandTypeIcon };
