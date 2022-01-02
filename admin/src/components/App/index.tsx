import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Cookies from 'universal-cookie';

import { useAppDispatch, useAppSelector } from 'App/redux';
import { login } from 'App/redux/discordUser';
import LoginPage from 'App/components/LoginPage';
import DiscordCallbackPage from 'App/components/DiscordCallbackPage';
import Header from 'App/components/Header';
import Navigation from 'App/components/Navigation';
import HomePage from 'App/components/HomePage';

const cx = require('classnames/bind').bind(require('./styles.scss'));

function App() {
  const user = useAppSelector((state) => state.discordUser.value);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (user) {
      return;
    }
    const cookies = new Cookies();

    fetch('https://discord.com/api/v8/oauth2/@me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cookies.get('token')}`,
      },
    }).then((payload) => {
      payload.json().then((data) => {
        if (!data || typeof data.message !== 'undefined' || typeof data.code !== 'undefined' || !data.user) {
          return;
        }
        dispatch(login(data.user));
      });
    });
  });

  return (
    <div className={cx('app')}>
      <BrowserRouter>
        {user && <Header />}
        <div className={cx('app-content')}>
          {user && <Navigation />}
          <Routes>
            {!user && (
              <>
                <Route path="/" element={<LoginPage />} />
                <Route path="/discord-callback" element={<DiscordCallbackPage />} />
              </>
            )}
            {user && (
              <>
                <Route path="/" element={<HomePage />} />
              </>
            )}
          </Routes>
        </div>
      </BrowserRouter>
    </div>
  );
}

export default App;
