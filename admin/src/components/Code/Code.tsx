import React, { useState } from 'react';
import { Fab, Paper, Tooltip } from '@mui/material';
import { ContentPasteTwoTone } from '@mui/icons-material';
import copy from 'copy-to-clipboard';

import styles from './styles.scss';

const cx = require('classnames/bind').bind(styles);

interface IProps {
  children: React.ReactNode;
}

const Code: React.FC<IProps> = (props) => {
  const [isCopyOpen, setIsCopyOpen] = useState(false);

  const handleTooltipOpen = () => {
    setIsCopyOpen(true);
  };

  const handleTooltipClose = () => {
    setIsCopyOpen(false);
  };

  const copyToClipboard = async () => {
    if (props.children) {
      const text = Object.values(props.children).join('');
      const isCopied = copy(text);

      if (isCopied) {
        handleTooltipOpen();
        setTimeout(handleTooltipClose, 2000);
      }
    }
  };

  return (
    <Paper className={cx('code')}>
      <div>
        <pre>
          <code>{props.children}</code>
        </pre>
      </div>
      <Tooltip
        title="Copied!"
        placement="left"
        disableFocusListener
        disableHoverListener
        disableTouchListener
        PopperProps={{
          disablePortal: true,
        }}
        open={isCopyOpen}
        onClose={handleTooltipClose}
      >
        <Fab className={cx('code__copy')} onClick={copyToClipboard}>
          <ContentPasteTwoTone className={cx('code__copy__icon')} />
        </Fab>
      </Tooltip>
    </Paper>
  );
};

export { Code };
