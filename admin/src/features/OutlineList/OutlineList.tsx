import React, { useEffect } from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

import styles from './styles.scss';

import { fetchOutlineServerList, useAppDispatch, useAppSelector } from 'App/redux';
import { Checker } from 'App/components/Checker';
import { Link } from 'App/components/Link';
import { formatBytes } from 'App/utils';

const cx = require('classnames/bind').bind(styles);

const OutlineList: React.FC = () => {
  const dispatch = useAppDispatch();

  const outlineListState = useAppSelector((state) => state.outlineServerList);
  const outlineList = useAppSelector((state) => state.outlineServerList.value);

  useEffect(() => {
    if (!outlineListState.error) {
      dispatch(fetchOutlineServerList());
    }
  }, [dispatch, outlineListState.error]);

  return (
    <div className={cx('outline-list')}>
      <Checker isList check={outlineListState}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="left">Name</TableCell>
                <TableCell align="left">Hostname</TableCell>
                <TableCell align="left" width={150}>
                  Default data limit
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {outlineList?.map((server) => (
                <TableRow key={server.id}>
                  <TableCell>
                    <Link className={cx('outline-list__name')} to={`/outline/${server.id}`}>
                      {server.name}
                    </Link>
                  </TableCell>
                  <TableCell>{server.hostnameForAccessKeys}</TableCell>
                  <TableCell>{formatBytes(server.accessKeyDataLimit?.bytes)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Checker>
    </div>
  );
};

export { OutlineList };
