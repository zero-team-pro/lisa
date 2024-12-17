import React from 'react';
import { List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { ExtensionOutlined, HomeOutlined, NewspaperOutlined, VpnLockOutlined } from '@mui/icons-material';

import styles from './styles.module.scss';

import { NavLink } from 'App/components/NavLink';
import { TransportIcon } from 'App/components/TransportIcon';
import { Transport } from 'App/types';

import cn from 'classnames/bind';

const cx = cn.bind(styles);

interface IProps {
  isForce?: boolean;
  callback?: () => void;
}

const Navigation: React.FC<IProps> = (props: IProps) => {
  const { isForce = false, callback } = props;

  return (
    <div className={cx('navigation', { navigation_force: isForce })}>
      <div className={cx('navigation__content')}>
        <List>
          <NavLink onClick={callback} to="/">
            <ListItemButton>
              <ListItemIcon>
                <HomeOutlined />
              </ListItemIcon>
              <ListItemText className={cx('navigation__text')} primary="Home" />
            </ListItemButton>
          </NavLink>
          <NavLink onClick={callback} to="/telegram">
            <ListItemButton>
              <ListItemIcon>
                <TransportIcon transport={Transport.Telegram} />
              </ListItemIcon>
              <ListItemText className={cx('navigation__text')} primary="Telegram" />
            </ListItemButton>
          </NavLink>
          <NavLink onClick={callback} to="/article">
            <ListItemButton>
              <ListItemIcon>
                <NewspaperOutlined />
              </ListItemIcon>
              <ListItemText className={cx('navigation__text')} primary="Articles" />
            </ListItemButton>
          </NavLink>
          <NavLink onClick={callback} to="/outline">
            <ListItemButton>
              <ListItemIcon>
                <VpnLockOutlined />
              </ListItemIcon>
              <ListItemText className={cx('navigation__text')} primary="Outline" />
            </ListItemButton>
          </NavLink>
          <NavLink onClick={callback} to="/modules">
            <ListItemButton>
              <ListItemIcon>
                <ExtensionOutlined />
              </ListItemIcon>
              <ListItemText className={cx('navigation__text')} primary="Modules" />
            </ListItemButton>
          </NavLink>
        </List>
      </div>
    </div>
  );
};

export { Navigation };
