import React from 'react';
import { Avatar, Button, IconButton } from '@mui/material';

import styles from './styles.scss';

import { checkServerAdmin, deleteServerAdmin, useAppDispatch } from 'App/redux';
import { AdminUser } from 'App/types';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';

const cx = require('classnames/bind').bind(styles);

interface IProps {
  guildId: string;
  adminUserList: AdminUser[];
  className?: string;
  isAdmin?: boolean;
}

function ServerAdminList(props: IProps) {
  const dispatch = useAppDispatch();
  const { guildId, adminUserList, className, isAdmin } = props;

  const deleteAdmin = (adminId: number) => {
    dispatch(deleteServerAdmin({ id: guildId, value: { id: adminId } }));
  };

  const checkAdmin = () => {
    dispatch(checkServerAdmin({ id: guildId }));
  };

  function renderActions(admin: AdminUser | undefined) {
    if (!admin || !isAdmin || admin.isGuildAdmin) {
      return null;
    }

    return (
      <IconButton onClick={() => deleteAdmin(admin.id)}>
        <DeleteOutlineOutlinedIcon />
      </IconButton>
    );
  }

  return (
    <div className={cx('server-admin-list', className)}>
      <h3 className={cx('server-admin-list__title')}>Admin list</h3>
      {adminUserList &&
        adminUserList.length > 0 &&
        adminUserList.map((admin) => {
          return (
            <div className={cx('server-admin-list__admin')} key={admin.id}>
              <Avatar className={cx('server-admin-list__admin__icon')} src={admin.iconUrl || ''} alt="?" />
              <div className={cx('server-admin-list__admin__name')}>{admin.name || admin.discordId}</div>
              <div className={cx('server-admin-list__admin__actions')}>{renderActions(admin)}</div>
            </div>
          );
        })}
      <div className={cx('server-admin-list__check')}>
        <Button onClick={checkAdmin} variant="contained">
          Check my privileges
        </Button>
      </div>
    </div>
  );
}

export default ServerAdminList;
