import React from 'react';
import { SvgIcon, Tooltip } from '@mui/material';

import styles from './styles.scss';
import { LanguageType } from 'App/types';

import { ReactComponent as English } from './img/english.svg';
import { ReactComponent as Russian } from './img/russian.svg';

const cx = require('classnames/bind').bind(styles);

interface IProps {
  language: LanguageType;
}

function Language(props: IProps) {
  const getText = (language: LanguageType) => {
    switch (language) {
      case 'en':
        return 'English';
      case 'ru':
        return 'Russian';
    }
  };

  const getIcon = (language: LanguageType) => {
    switch (language) {
      case 'en':
        return <English />;
      case 'ru':
        return <Russian />;
    }
  };

  return (
    <div className={cx('language')}>
      <Tooltip title={getText(props.language)}>
        <SvgIcon>{getIcon(props.language)}</SvgIcon>
      </Tooltip>
    </div>
  );
}

export default Language;
