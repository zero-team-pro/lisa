import React, { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

import styles from './styles.scss';

const cx = require('classnames/bind').bind(styles);

interface IProps {
  children: React.ReactElement;
  title?: string;
  buttonTitle?: React.ReactElement | string;
  className?: string;
  onOpen?: () => void;
  onClose?: () => void;
}

const defaultProps: Partial<IProps> = {
  buttonTitle: 'Open',
};

const Modal: React.FC<IProps> = (props: IProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
    props.onOpen?.();
  };

  const handleClose = () => {
    setIsOpen(false);
    props.onClose?.();
  };

  return (
    <div className={cx('modal', props.className)}>
      <Button variant="contained" onClick={handleOpen}>
        {props.buttonTitle}
      </Button>

      <Dialog open={isOpen} onClose={handleClose} fullWidth maxWidth="sm">
        {props.title && <DialogTitle>{props.title}</DialogTitle>}
        <DialogContent>{props.children}</DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

Modal.defaultProps = defaultProps;

export { Modal };
