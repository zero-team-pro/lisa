import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Cookies from 'universal-cookie';

import { useAppDispatch, useAppSelector } from 'App/redux';
import { fetchUser } from 'App/redux/discordUser';
import LoginPage from 'App/components/LoginPage';
import DiscordCallbackPage from 'App/components/DiscordCallbackPage';
import Header from 'App/components/Header';
import Navigation from 'App/components/Navigation';
import HomePage from 'App/components/HomePage';

const cx = require('classnames/bind').bind(require('./styles.scss'));

function App() {
  const user = useAppSelector((state) => state.discordUser.value);
  const cookies = new Cookies();
  const token = cookies.get('token');
  const isAuth = token && user;
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (token && !user) {
      dispatch(fetchUser());
    }
  });

  return (
    <div className={cx('app')}>
      <BrowserRouter>
        {isAuth && <Header />}
        <div className={cx('app-content')}>
          {isAuth && <Navigation />}
          <Routes>
            {isAuth && <Route path="/" element={<HomePage />} />}
            {!isAuth && (
              <>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/discord-callback" element={<DiscordCallbackPage />} />
              </>
            )}
          </Routes>
        </div>
      </BrowserRouter>
    </div>
  );
}

export default App;
