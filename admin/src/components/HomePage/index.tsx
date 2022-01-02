import React from 'react';

import { useAppSelector } from 'App/redux';

const cx = require('classnames/bind').bind(require('./styles.scss'));

function HomePage() {
  const user = useAppSelector((state) => state.discordUser.value);

  return (
    <div className={cx('home')}>
      <div>
        <h2>SomeInfo</h2>
        <div>{user?.discriminator}</div>
      </div>
    </div>
  );
}

export default HomePage;
