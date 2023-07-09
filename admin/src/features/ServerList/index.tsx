import React, { useEffect } from 'react';
import {
  Avatar,
  Badge,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import PeopleIcon from '@mui/icons-material/People';

import styles from './styles.scss';

import { fetchServerList, useAppDispatch, useAppSelector } from 'App/redux';
import { Link } from 'App/components/Link';
import { Loader } from 'App/components/Loader';
import { Empty } from 'App/components/Empty';
import { numberAdjust } from 'App/utils';
import { Language } from 'App/components/Language';

const cx = require('classnames/bind').bind(styles);

function ServerList() {
  const dispatch = useAppDispatch();

  const serverList = useAppSelector((state) => state.serverList.value);
  const isLoaded = useAppSelector((state) => state.serverList.isLoaded);
  const error = useAppSelector((state) => state.serverList.error);

  // TODO: hook useInit
  useEffect(() => {
    if (!serverList && !isLoaded && !error) {
      dispatch(fetchServerList());
    }
  }, [dispatch, error, isLoaded, serverList]);

  return (
    <div className={cx('server-list')}>
      <h2>Your Discord Servers</h2>
      <div>
        <Loader isLoading={!isLoaded}>
          {serverList ? (
            serverList.length > 0 ? (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell align="center" width={50} />
                      <TableCell align="left">Title</TableCell>
                      <TableCell align="left">Information</TableCell>
                      <TableCell align="left">Language</TableCell>
                      <TableCell align="left">Rater language</TableCell>
                      <TableCell align="left">Rater Engine</TableCell>
                      <TableCell align="right">ID</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* TODO: Component for empty */}
                    {serverList?.map((server) => (
                      <TableRow key={server.id}>
                        <TableCell align="center">
                          <Link to={`/server/${server.id}`}>
                            <Avatar className={cx('server-list__logo')} src={server.iconUrl || ''} alt="?" />
                          </Link>
                        </TableCell>
                        <TableCell align="left">
                          <div>
                            <Link className={cx('server-list__name')} to={`/server/${server.id}`}>
                              <h3>{server.name || 'Not Found'}</h3>
                            </Link>
                            {/*TODO: Favorite*/}
                            {/*<Chip className={cx('server-list__table__name__chip')} label="Favorite" size="small" />*/}
                          </div>
                        </TableCell>
                        <TableCell align="left">
                          <div className={cx('server-list__information')}>
                            <div>
                              <Tooltip title="Member count">
                                <Badge
                                  badgeContent={numberAdjust(server.memberCount)}
                                  anchorOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                  }}
                                  color="primary"
                                >
                                  <PeopleIcon />
                                </Badge>
                              </Tooltip>
                            </div>
                            <div>
                              <Tooltip title="Shard ID">
                                <Badge
                                  badgeContent={server.shardId.toString()}
                                  anchorOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                  }}
                                  color="primary"
                                >
                                  <StorageOutlinedIcon />
                                </Badge>
                              </Tooltip>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell align="left">
                          <Language language={server.lang} />
                        </TableCell>
                        <TableCell align="left">
                          <Language language={server.raterLang} />
                        </TableCell>
                        <TableCell align="left">{server.raterEngine}</TableCell>
                        <TableCell align="right">{server.id}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Empty />
            )
          ) : (
            <Empty isError />
          )}
        </Loader>
      </div>
    </div>
  );
}

export default ServerList;
