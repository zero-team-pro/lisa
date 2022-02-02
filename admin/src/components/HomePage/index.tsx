import React from 'react';

import styles from './styles.scss';
import { useAppSelector } from 'App/redux';
import ServerList from 'App/components/ServerList';

const cx = require('classnames/bind').bind(styles);

function HomePage() {
  const user = useAppSelector((state) => state.discordUser.value);

  return (
    <div className={cx('home')}>
      <div>
        <h2>SomeInfo</h2>
        <div>{user?.discriminator}</div>
        <ServerList />
      </div>
    </div>
  );
}

export default HomePage;
