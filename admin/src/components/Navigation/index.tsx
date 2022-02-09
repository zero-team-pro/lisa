import React from 'react';
import { List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { HomeOutlined } from '@mui/icons-material';

import styles from './styles.scss';
import NavLink from 'App/components/NavLink';

const cx = require('classnames/bind').bind(styles);

function Navigation() {
  return (
    <div className={cx('navigation')}>
      <List>
        <NavLink to="/">
          <ListItem button>
            <ListItemIcon>
              <HomeOutlined />
            </ListItemIcon>
            <ListItemText primary="Home" />
          </ListItem>
        </NavLink>
      </List>
    </div>
  );
}

export default Navigation;
