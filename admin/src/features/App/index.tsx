import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Cookies from 'universal-cookie';
import { ToastContainer, Zoom } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';

import styles from './styles.scss';

import { fetchUser, useAppDispatch, useAppSelector } from 'App/redux';
import LoginPage from 'App/pages/LoginPage';
import DiscordCallbackPage from 'App/pages/DiscordCallbackPage';
import Header from 'App/features/Header';
import Navigation from 'App/components/Navigation';
import HomePage from 'App/pages/HomePage';
import RequireAuth from 'App/features/RequireAuth';
import ServerPage from 'App/pages/ServerPage';
import ModuleListPage from 'App/pages/ModuleListPage';
import TelegramListPage from 'App/pages/TelegramListPage';

const cx = require('classnames/bind').bind(styles);

function App() {
  const adminMe = useAppSelector((state) => state.adminMe);

  const cookies = new Cookies();
  const dispatch = useAppDispatch();

  const discordToken = cookies.get('discordToken');
  const isAuth = !!discordToken && !!adminMe.value;

  useEffect(() => {
    if (discordToken && !adminMe.value && !adminMe.isLoading && !adminMe.error) {
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
            <Route
              path="/"
              element={
                <RequireAuth>
                  <HomePage />
                </RequireAuth>
              }
            />
            <Route
              path="/server/:id"
              element={
                <RequireAuth>
                  <ServerPage />
                </RequireAuth>
              }
            />
            <Route
              path="/modules"
              element={
                <RequireAuth>
                  <ModuleListPage />
                </RequireAuth>
              }
            />
            <Route
              path="/telegram"
              element={
                <RequireAuth>
                  <TelegramListPage />
                </RequireAuth>
              }
            />
            {!isAuth && (
              <>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/discord-callback" element={<DiscordCallbackPage />} />
              </>
            )}
          </Routes>
        </div>
      </BrowserRouter>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={true}
        newestOnTop={true}
        closeOnClick={true}
        rtl={false}
        pauseOnFocusLoss={false}
        pauseOnHover={false}
        draggable={true}
        transition={Zoom}
        theme="colored"
      />
    </div>
  );
}

export default App;
