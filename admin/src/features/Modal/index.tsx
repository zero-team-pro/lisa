import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

import styles from './styles.scss';

const cx = require('classnames/bind').bind(styles);

interface IProps {
  children: React.ReactElement;
  title?: string;
  buttonTitle?: React.ReactElement | string;
  className?: string;
}

const defaultProps: Partial<IProps> = {
  buttonTitle: 'Open',
};

function Modal(props: IProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className={cx('modal', props.className)}>
      <Button variant="contained" onClick={handleOpen}>
        {props.buttonTitle}
      </Button>

      <Dialog open={isOpen} onClose={handleClose}>
        {props.title && <DialogTitle>{props.title}</DialogTitle>}
        <DialogContent>{props.children}</DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

Modal.defaultProps = defaultProps;

export default Modal;
