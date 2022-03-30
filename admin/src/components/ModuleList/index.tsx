import React, { useEffect } from 'react';

import styles from './styles.scss';

import { fetchModuleList, useAppDispatch, useAppSelector } from 'App/redux';
import Loader from 'App/components/Loader';
import Empty from 'App/components/Empty';
import ModuleTable from 'App/components/ModuleTable';
import { Avatar } from '@mui/material';

const cx = require('classnames/bind').bind(styles);

function ModuleList() {
  const dispatch = useAppDispatch();

  const moduleListState = useAppSelector((state) => state.moduleList);
  const moduleList = moduleListState.value;
  const isLoading = moduleListState.isLoading;

  useEffect(() => {
    if (!moduleListState.value && !moduleListState.isLoading && !moduleListState.error) {
      dispatch(fetchModuleList());
    }
  }, [dispatch, moduleListState]);

  return (
    <div className={cx('module-list')}>
      <Loader isLoading={isLoading}>
        {moduleList ? (
          moduleList.length > 0 ? (
            moduleList?.map((module) => (
              <div key={module.id}>
                <div className={cx('module-list__title')}>
                  <Avatar className={cx('module-list__title__icon')} src={module?.iconUrl} alt="?" />
                  <h2>{module.title}</h2>
                </div>
                <ModuleTable module={module} />
              </div>
            ))
          ) : (
            <Empty />
          )
        ) : (
          <Empty isError />
        )}
      </Loader>
    </div>
  );
}

export default ModuleList;
