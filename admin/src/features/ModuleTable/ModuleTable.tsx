import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import styles from './styles.scss';

import { CommandTypeIcon } from 'App/components/CommandTypeIcon';
import { TransportIcon } from 'App/components/TransportIcon';
import { IModule, Transport } from 'App/types';

const cx = require('classnames/bind').bind(styles);

interface IProps {
  module: IModule;
}

const ModuleTable: React.FC<IProps> = (props: IProps) => {
  const { module } = props;

  return (
    <TableContainer className={cx('module-table')} component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell align="left" />
            <TableCell align="left" />
            <TableCell align="left">Name</TableCell>
            <TableCell align="left">Usage</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {/* TODO: Component for empty */}
          {module?.commandList?.map((command) => {
            const helpBlock = command.help.trim().replace(/[ ]*\n[ ]*/gi, '  \n');
            const usageBlock = command.description ? `${command.description}  \n${helpBlock}` : helpBlock;

            return (
              <TableRow className={cx('module-table__raw')} key={command.title}>
                <TableCell className={cx('module-table__type')} align="left">
                  <div className={cx('module-table__type__content')}>
                    <CommandTypeIcon type={command.type} />
                  </div>
                </TableCell>
                <TableCell className={cx('module-table__transport')} align="left">
                  <div className={cx('module-table__transport__content')}>
                    {command.transports.includes(Transport.Discord) && <TransportIcon transport={Transport.Discord} />}
                    {command.transports.includes(Transport.Telegram) && (
                      <TransportIcon transport={Transport.Telegram} />
                    )}
                  </div>
                </TableCell>
                <TableCell className={cx('module-table__name')} align="left">
                  <h3>{command.title}</h3>
                </TableCell>
                <TableCell className={cx('module-table__usage')} align="left">
                  <ReactMarkdown children={usageBlock} remarkPlugins={[remarkGfm]} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export { ModuleTable };
