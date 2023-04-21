import React, { useEffect } from 'react';
import { useParams } from 'react-router';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

import styles from './styles.scss';

import { fetchOutlineClientList, fetchOutlineServer, useAppDispatch, useAppSelector } from 'App/redux';
import Checker from 'App/components/Checker';
import Link from 'App/components/Link';
import { formatBytes } from 'App/utils';
import Empty from 'App/components/Empty';

const cx = require('classnames/bind').bind(styles);

const OutlineInfo: React.FC = () => {
  const dispatch = useAppDispatch();
  const { id: serverId } = useParams();

  const outlineState = useAppSelector((state) => state.outlineServer);
  const outline = useAppSelector((state) => state.outlineServer.value);
  const clientListState = useAppSelector((state) => state.outlineClientList);
  const clientList = useAppSelector((state) => state.outlineClientList.value);

  useEffect(() => {
    if (serverId && !outlineState.error) {
      dispatch(fetchOutlineServer(serverId));
      dispatch(fetchOutlineClientList(serverId));
    }
  }, [dispatch, outlineState.error, serverId]);

  return (
    <div className={cx('outline-info')}>
      <Checker check={outlineState}>
        {outline ? (
          <div>
            <h1>{outline.name}</h1>
            <Checker isList check={clientListState}>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell align="left">Name</TableCell>
                      <TableCell align="left">Port</TableCell>
                      <TableCell align="left" width={150}>
                        Data limit
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {clientList?.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <Link className={cx('outline-info__name')} to={`/outline/${outline.id}/${client.id}`}>
                            {client.name}
                          </Link>
                        </TableCell>
                        <TableCell>{client.port}</TableCell>
                        <TableCell>
                          {formatBytes(client.dataLimit?.bytes || outline.accessKeyDataLimit?.bytes)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Checker>
          </div>
        ) : (
          <Empty isError />
        )}
      </Checker>
    </div>
  );
};

export default OutlineInfo;
