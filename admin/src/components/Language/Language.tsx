import React from 'react';
import { SvgIcon, Tooltip } from '@mui/material';

import styles from './styles.scss';

import { LanguageType } from 'App/types';

import { ReactComponent as Unknown } from './img/unknown.svg';
import { ReactComponent as English } from './img/english.svg';
import { ReactComponent as Russian } from './img/russian.svg';

const cx = require('classnames/bind').bind(styles);

interface IProps {
  language?: LanguageType;
}

const Language: React.FC<IProps> = (props: IProps) => {
  const getText = (language?: LanguageType) => {
    switch (language) {
      case 'en':
        return 'English';
      case 'ru':
        return 'Russian';
      default:
        return 'Unknown';
    }
  };

  const getIcon = (language?: LanguageType) => {
    switch (language) {
      case 'en':
        return <English />;
      case 'ru':
        return <Russian />;
      default:
        return <Unknown />;
    }
  };

  return (
    <div className={cx('language')}>
      <Tooltip title={getText(props.language)}>
        <SvgIcon>{getIcon(props.language)}</SvgIcon>
      </Tooltip>
    </div>
  );
};

export { Language };
