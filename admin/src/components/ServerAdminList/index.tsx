import React from 'react';
import { Avatar } from '@mui/material';

import styles from './styles.scss';
import { AdminUser } from 'App/types';
import Empty from 'App/components/Empty';

const cx = require('classnames/bind').bind(styles);

interface IProps {
  guildId: string;
  adminUserList: AdminUser[];
  className?: string;
  isAdmin?: boolean;
}

function ServerAdminList(props: IProps) {
  const { adminUserList, className } = props;

  return (
    <div className={cx('server-admin-list', className)}>
      <h3 className={cx('server-admin-list__title')}>Admin list</h3>
      {adminUserList && adminUserList.length > 0 ? (
        adminUserList.map((admin) => {
          return (
            <div className={cx('server-admin-list__admin')} key={admin.id}>
              <Avatar className={cx('server-admin-list__admin__icon')} src={admin.iconUrl || ''} alt="?" />
              <div className={cx('server-admin-list__admin__name')}>{admin.name || admin.discordId}</div>
            </div>
          );
        })
      ) : (
        <Empty />
      )}
    </div>
  );
}

export default ServerAdminList;
