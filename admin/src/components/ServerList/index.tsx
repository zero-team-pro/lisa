import React, { useEffect } from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

import styles from './styles.scss';
import { fetchServerList, useAppDispatch, useAppSelector } from 'App/redux';
import Link from 'App/components/Link';
import Loader from 'App/components/Loader';
import Empty from 'App/components/Empty';

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
      <h2>Your server List</h2>
      <div>
        <Loader isLoading={!isLoaded}>
          {serverList ? (
            serverList.length > 0 ? (
              <TableContainer className={cx('server-list__table')} component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell align="center" width={50} />
                      <TableCell align="left">Title</TableCell>
                      <TableCell align="left">Language</TableCell>
                      <TableCell align="left">Rater language</TableCell>
                      <TableCell align="left">Rater Engine</TableCell>
                      <TableCell align="right">ID</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* TODO: Component for empty */}
                    {serverList?.map((server) => (
                      <TableRow className={cx('server-list__table__raw')} key={server.id}>
                        <TableCell align="center">
                          <Link to={`/server/${server.id}`}>
                            <img className={cx('server-list__logo')} src={server.iconUrl} alt={server.name} />
                          </Link>
                        </TableCell>
                        <TableCell align="left">
                          <div className={cx('server-list__table__name')}>
                            <Link to={`/server/${server.id}`}>
                              <h3>{server.name}</h3>
                            </Link>
                            {/*TODO: Favorite*/}
                            {/*<Chip className={cx('server-list__table__name__chip')} label="Main" size="small" />*/}
                          </div>
                        </TableCell>
                        <TableCell align="left">{server.lang}</TableCell>
                        <TableCell align="left">{server.raterLang}</TableCell>
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
