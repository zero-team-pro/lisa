import React, { useEffect, useState } from 'react';
import { Avatar, ToggleButton, ToggleButtonGroup } from '@mui/material';

import styles from './styles.scss';

import { fetchModuleList, useAppDispatch, useAppSelector } from 'App/redux';
import { Loader } from 'App/components/Loader';
import { Empty } from 'App/components/Empty';
import { ModuleTable } from 'App/features/ModuleTable';
import { IModule, Transport } from 'App/types';

const cx = require('classnames/bind').bind(styles);

const ModuleList: React.FC = () => {
  const dispatch = useAppDispatch();

  const moduleListState = useAppSelector((state) => state.moduleList);
  const moduleList = moduleListState.value;
  const isLoading = moduleListState.isLoading;

  const [transportFilters, setTransportFilters] = useState(() => [Transport.Discord, Transport.Telegram]);

  useEffect(() => {
    if (!moduleListState.value && !moduleListState.isLoading && !moduleListState.error) {
      dispatch(fetchModuleList());
    }
  }, [dispatch, moduleListState]);

  const handleFilters = (event: React.MouseEvent<HTMLElement, MouseEvent>, data: Transport[]) => {
    setTransportFilters(data);
  };

  const moduleDisplayList: IModule[] | undefined = moduleList?.map((module) => {
    const filteredCommandList = module?.commandList?.filter((command) =>
      command.transports.some((com) => transportFilters.includes(com)),
    );
    const filteredModule: IModule = {
      ...module,
      commandList: filteredCommandList || [],
    };
    return filteredModule;
  });

  return (
    <div className={cx('module-list')}>
      <Loader isLoading={isLoading}>
        {moduleDisplayList ? (
          moduleDisplayList.length > 0 ? (
            <div>
              <div>
                <ToggleButtonGroup color="primary" value={transportFilters} onChange={handleFilters}>
                  <ToggleButton value={Transport.Discord}>Discord</ToggleButton>
                  <ToggleButton value={Transport.Telegram}>Telegram</ToggleButton>
                </ToggleButtonGroup>
              </div>
              {moduleDisplayList?.map((module) => (
                <div key={module.id}>
                  <div className={cx('module-list__title')}>
                    <Avatar className={cx('module-list__title__icon')} src={module?.iconUrl} alt="?" />
                    <h2>{module.title}</h2>
                  </div>
                  <ModuleTable module={module} />
                </div>
              ))}
            </div>
          ) : (
            <Empty />
          )
        ) : (
          <Empty isError />
        )}
      </Loader>
    </div>
  );
};

export { ModuleList };
