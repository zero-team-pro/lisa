import React, { useEffect } from 'react';
import { Avatar, IconButton } from '@mui/material';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';

import styles from './styles.scss';

import { fetchModuleList, patchServerModule, useAppDispatch, useAppSelector } from 'App/redux';
import { IModule } from 'App/types';
import Empty from 'App/components/Empty';
import Loader from 'App/components/Loader';

const cx = require('classnames/bind').bind(styles);

interface IProps {
  guildId: string;
  moduleIdList: string[];
  className?: string;
  isAdmin?: boolean;
}

function ServerModuleList(props: IProps) {
  const dispatch = useAppDispatch();
  const { guildId, moduleIdList, className, isAdmin } = props;

  const moduleListState = useAppSelector((state) => state.moduleList);
  const moduleList = moduleListState.value;

  useEffect(() => {
    if (!moduleListState.value && !moduleListState.isLoading && !moduleListState.error) {
      dispatch(fetchModuleList());
    }
  }, [dispatch, moduleListState]);

  const changeModule = (moduleId: string, isEnabled: boolean) => {
    dispatch(patchServerModule({ id: guildId, value: { id: moduleId, isEnabled } }));
  };

  function renderActions(module: IModule | undefined, isEnabled: boolean) {
    if (!module || !isAdmin || module.id === 'core') {
      return null;
    }

    return (
      <IconButton onClick={() => changeModule(module.id, !isEnabled)}>
        {isEnabled ? <DeleteOutlineOutlinedIcon /> : <AddCircleOutlineOutlinedIcon />}
      </IconButton>
    );
  }

  return (
    <div className={cx('server-module-list', className)}>
      <h3 className={cx('server-module-list__title')}>Module List</h3>
      <Loader isLoading={!moduleListState.isLoaded} isSmall>
        {moduleList ? (
          moduleList.map((module) => {
            const isEnabled = !!moduleIdList.find((moduleId) => moduleId === module.id);

            return (
              <div className={cx('server-module-list__module')} key={module.id}>
                <Avatar className={cx('server-module-list__module__icon')} src={module?.iconUrl} alt="?" />
                <div
                  className={cx('server-module-list__module__title', {
                    'server-module-list__module__title_disabled': !isEnabled,
                  })}
                >
                  {module ? module.title : 'Unknown'}
                </div>
                <div className={cx('server-module-list__module__actions')}>{renderActions(module, isEnabled)}</div>
              </div>
            );
          })
        ) : (
          <Empty />
        )}
      </Loader>
    </div>
  );
}

export default ServerModuleList;
