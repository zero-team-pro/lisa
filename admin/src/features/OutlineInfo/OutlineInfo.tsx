import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import {
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import {
  CancelOutlined,
  DeleteOutlineOutlined,
  DriveFileRenameOutlineOutlined,
  SaveOutlined,
} from '@mui/icons-material';

import styles from './styles.module.scss';

import { fetchOutlineClientList, fetchOutlineServer, useAppDispatch, useAppSelector } from 'App/redux';
import { Checker } from 'App/components/Checker';
import { Link } from 'App/components/Link';
import { formatBytes } from 'App/utils';
import { Empty } from 'App/components/Empty';
import { IOutlineClient } from 'App/types';

import cn from 'classnames/bind';

const cx = cn.bind(styles);

interface IRenderActionsProps {
  client: IOutlineClient;
  isEdit?: boolean;
  editList: Record<string, IOutlineClient>;
  setEditList: (state: Record<string, IOutlineClient>) => void;
}

const Actions: React.FC<IRenderActionsProps> = ({ client, isEdit, editList, setEditList }) => {
  const setModeEdit = useCallback(
    () => setEditList({ ...editList, [client.id]: client }),
    [client, editList, setEditList],
  );

  const setModeView = useCallback(() => {
    const newEditList = { ...editList };
    delete newEditList[client.id];
    setEditList(newEditList);
  }, [client.id, editList, setEditList]);

  return (
    <div>
      {isEdit ? (
        <>
          <IconButton onClick={setModeView}>
            <Tooltip title="Cancel">
              <CancelOutlined />
            </Tooltip>
          </IconButton>
          <IconButton>
            <Tooltip title="Save">
              <SaveOutlined />
            </Tooltip>
          </IconButton>
        </>
      ) : (
        <>
          <IconButton onClick={setModeEdit}>
            <Tooltip title="Edit">
              <DriveFileRenameOutlineOutlined />
            </Tooltip>
          </IconButton>
          <IconButton>
            <Tooltip title="Delete">
              <DeleteOutlineOutlined />
            </Tooltip>
          </IconButton>
        </>
      )}
    </div>
  );
};

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

  const [editList, setEditList] = useState<Record<string, IOutlineClient>>({});

  const setClientName = useCallback(
    (id: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!editList[id]) {
        return;
      }
      return setEditList({ ...editList, [id]: { ...editList[id], name: event.target.value } });
    },
    [editList],
  );

  const setClientLimit = useCallback(
    (id: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const bytes = Number.parseInt(event.target.value, 10);
      if (!editList[id] || typeof bytes !== 'number' || isNaN(bytes)) {
        return;
      }
      return setEditList({ ...editList, [id]: { ...editList[id], dataLimit: { bytes } } });
    },
    [editList],
  );

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
                      <TableCell align="left" width={100}>
                        Port
                      </TableCell>
                      <TableCell align="left" width={150}>
                        Data limit
                      </TableCell>
                      <TableCell align="left" width={100}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {clientList?.map((client) =>
                      typeof editList[client.id] === 'undefined' ? (
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
                          <TableCell>
                            <Actions client={client} editList={editList} setEditList={setEditList} />
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow key={client.id}>
                          <TableCell>
                            <TextField
                              value={editList[client.id]?.name}
                              onChange={setClientName(client.id)}
                              variant="standard"
                            />
                          </TableCell>
                          <TableCell>{client.port}</TableCell>
                          <TableCell>
                            <TextField
                              value={editList[client.id]?.dataLimit?.bytes || ''}
                              onChange={setClientLimit(client.id)}
                              variant="standard"
                            />
                          </TableCell>
                          <TableCell>
                            <Actions isEdit client={client} editList={editList} setEditList={setEditList} />
                          </TableCell>
                        </TableRow>
                      ),
                    )}
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

export { OutlineInfo };
