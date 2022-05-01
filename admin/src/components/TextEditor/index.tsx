import React, { useCallback, useMemo } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Code, FormatBold, FormatItalic, FormatUnderlined } from '@mui/icons-material';
import { BaseEditor, createEditor, Descendant, Editor } from 'slate';
import { Editable, ReactEditor, Slate, useSlate, withReact } from 'slate-react';
import { withHistory } from 'slate-history';
import isHotkey from 'is-hotkey';

import styles from './styles.scss';

import { IEditorText } from 'App/types';

const cx = require('classnames/bind').bind(styles);

interface IProps {
  value: IEditorText[];
  onChange: (value: IEditorText[]) => void;
}

const HOTKEYS: any = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
  'mod+[': 'code',
};

const initialValue: any[] = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
];

function TextEditor(props: IProps) {
  const renderElement = useCallback((props) => <Element {...props} />, []);
  const renderLeaf = useCallback((props) => <Leaf {...props} />, []);
  const editor = useMemo(() => withHistory(withReact(createEditor() as ReactEditor)), []);

  const onChange = (value: Descendant[]) => {
    const isAstChange = editor.operations.some((op) => 'set_selection' !== op.type);
    if (isAstChange) {
      props.onChange(value as IEditorText[]);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    for (const hotkey in HOTKEYS) {
      if (isHotkey(hotkey, event as any)) {
        event.preventDefault();
        const mark = HOTKEYS[hotkey];
        toggleMark(editor, mark);
      }
    }
  };

  return (
    <div className={cx('editor')}>
      <Slate editor={editor} value={initialValue} onChange={onChange}>
        <div className={cx('editor__toolbar')}>
          <MarkButton format="bold" title="Bold" icon={<FormatBold />} />
          <MarkButton format="italic" title="Italic" icon={<FormatItalic />} />
          <MarkButton format="underline" title="Underline" icon={<FormatUnderlined />} />
          <MarkButton format="code" title="Code" icon={<Code />} />
        </div>
        <Editable
          className={cx('editor__area')}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder="Start typing..."
          spellCheck
          onKeyDown={(event) => onKeyDown(event)}
        />
      </Slate>
    </div>
  );
}

const MarkButton = ({ format, title, icon }: any) => {
  const editor = useSlate();
  return (
    <IconButton
      className={cx('editor__button', { editor__button_disabled: !isMarkActive(editor, format) })}
      onClick={(event) => {
        event.preventDefault();
        toggleMark(editor, format);
      }}
    >
      <Tooltip placement="top" title={title}>
        {icon}
      </Tooltip>
    </IconButton>
  );
};

const toggleMark = (editor: BaseEditor, format: string) => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

const isMarkActive = (editor: BaseEditor, format: string) => {
  const marks = Editor.marks(editor);
  return marks ? (marks as any)[format] === true : false;
};

const Element = ({ attributes, children, element }: any) => {
  const style = { textAlign: element.align };

  switch (element.type) {
    default:
      return (
        <p style={style} {...attributes}>
          {children}
        </p>
      );
  }
};

const Leaf = ({ attributes, children, leaf }: any) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.code) {
    children = <code>{children}</code>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  return <span {...attributes}>{children}</span>;
};

export default TextEditor;
