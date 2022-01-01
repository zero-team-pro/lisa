import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import LoginPage from '../LoginPage';
import DiscordCallbackPage from '../DiscordCallbackPage';

const cx = require('classnames/bind').bind(require('./styles.scss'));

function App() {
  return (
    <div className={cx('app')}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/discord-callback" element={<DiscordCallbackPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
