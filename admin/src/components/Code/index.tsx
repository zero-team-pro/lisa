import React from 'react';
import { Fab, Paper } from '@mui/material';
import { ContentPasteTwoTone } from '@mui/icons-material';

import styles from './styles.scss';

const cx = require('classnames/bind').bind(styles);

interface IProps {
  children: React.ReactNode;
}

function Code(props: IProps) {
  return (
    <Paper className={cx('code')}>
      <div>
        <pre>
          <code>{props.children}</code>
        </pre>
      </div>
      <Fab className={cx('code__copy')}>
        <ContentPasteTwoTone className={cx('code__copy__icon')} />
      </Fab>
    </Paper>
  );
}

export default Code;
