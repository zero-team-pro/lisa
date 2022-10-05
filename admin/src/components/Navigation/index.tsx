import React from 'react';
import { List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { ExtensionOutlined, HomeOutlined, NewspaperOutlined } from '@mui/icons-material';

import styles from './styles.scss';
import NavLink from 'App/components/NavLink';
import TransportIcon from 'App/components/TransportIcon';
import { Transport } from 'App/types';

const cx = require('classnames/bind').bind(styles);

interface IProps {
  isForce?: boolean;
  callback?: () => void;
}

const defaultProps: Partial<IProps> = {
  isForce: false,
};

function Navigation(props: IProps) {
  return (
    <div className={cx('navigation', { navigation_force: props.isForce })}>
      <div className={cx('navigation__content')}>
        <List>
          <NavLink onClick={props.callback} to="/">
            <ListItemButton>
              <ListItemIcon>
                <HomeOutlined />
              </ListItemIcon>
              <ListItemText className={cx('navigation__text')} primary="Home" />
            </ListItemButton>
          </NavLink>
          <NavLink onClick={props.callback} to="/telegram">
            <ListItemButton>
              <ListItemIcon>
                <TransportIcon transport={Transport.Telegram} />
              </ListItemIcon>
              <ListItemText className={cx('navigation__text')} primary="Telegram" />
            </ListItemButton>
          </NavLink>
          <NavLink onClick={props.callback} to="/article">
            <ListItemButton>
              <ListItemIcon>
                <NewspaperOutlined />
              </ListItemIcon>
              <ListItemText className={cx('navigation__text')} primary="Articles" />
            </ListItemButton>
          </NavLink>
          <NavLink onClick={props.callback} to="/modules">
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
}

Navigation.defaultProps = defaultProps;

export default Navigation;
