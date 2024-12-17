import { SvgIcon, Tooltip } from '@mui/material';
import React from 'react';

import styles from './styles.module.scss';

import { LanguageType } from 'App/types';

import English from './img/english.svg?react';
import Russian from './img/russian.svg?react';
import Unknown from './img/unknown.svg?react';

import cn from 'classnames/bind';

const cx = cn.bind(styles);

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
