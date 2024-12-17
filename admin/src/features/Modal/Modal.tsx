import React, { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

import styles from './styles.module.scss';

import cn from 'classnames/bind';

const cx = cn.bind(styles);

interface IProps {
  children: React.ReactElement;
  title?: string;
  buttonTitle?: React.ReactElement | string;
  className?: string;
  onOpen?: () => void;
  onClose?: () => void;
}

const Modal: React.FC<IProps> = ({ children, title, buttonTitle = 'Open', className, onOpen, onClose }: IProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
    onOpen?.();
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  return (
    <div className={cx('modal', className)}>
      <Button variant="contained" onClick={handleOpen}>
        {buttonTitle}
      </Button>

      <Dialog open={isOpen} onClose={handleClose} fullWidth maxWidth="sm">
        {title && <DialogTitle>{title}</DialogTitle>}
        <DialogContent>{children}</DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export { Modal };
