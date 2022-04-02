import React from 'react';
import { List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { ExtensionOutlined, HomeOutlined } from '@mui/icons-material';

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
      <List>
        <NavLink onClick={props.callback} to="/">
          <ListItem button>
            <ListItemIcon>
              <HomeOutlined />
            </ListItemIcon>
            <ListItemText className={cx('navigation__text')} primary="Home" />
          </ListItem>
        </NavLink>
        <NavLink onClick={props.callback} to="/telegram">
          <ListItem button>
            <ListItemIcon>
              <TransportIcon transport={Transport.Telegram} />
            </ListItemIcon>
            <ListItemText className={cx('navigation__text')} primary="Telegram" />
          </ListItem>
        </NavLink>
        <NavLink onClick={props.callback} to="/modules">
          <ListItem button>
            <ListItemIcon>
              <ExtensionOutlined />
            </ListItemIcon>
            <ListItemText className={cx('navigation__text')} primary="Modules" />
          </ListItem>
        </NavLink>
      </List>
    </div>
  );
}

Navigation.defaultProps = defaultProps;

export default Navigation;
