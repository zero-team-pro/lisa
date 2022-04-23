import React from 'react';
import { TextareaAutosize } from '@mui/material';

import styles from './styles.scss';

const cx = require('classnames/bind').bind(styles);

interface IProps {
  value: string;
  onChange: (value: string) => void;
}

function TextEditor(props: IProps) {
  const onChange = (event: React.ChangeEvent<HTMLTextAreaElement> | undefined) => {
    const value = event?.target?.value;
    if (value) {
      props.onChange(value);
    }
  };

  return (
    <div className={cx('editor')}>
      <TextareaAutosize
        value={props.value}
        onChange={onChange}
        className={cx('editor__area')}
        placeholder="Start typing..."
      />
    </div>
  );
}

export default TextEditor;
