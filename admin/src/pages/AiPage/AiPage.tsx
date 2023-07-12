import React from 'react';

import styles from './styles.scss';

import { AiBalance } from 'App/features/AiBalance';

const cx = require('classnames/bind').bind(styles);

const AiPage: React.FC = () => {
  return (
    <div className={cx('ai-page')}>
      <div>
        <h1>Artificial intelligence</h1>
        <AiBalance />
      </div>
    </div>
  );
};

export { AiPage };
