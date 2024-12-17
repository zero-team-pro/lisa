import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ToastContainer, Zoom } from 'react-toastify';
import Cookies from 'universal-cookie';

import 'react-toastify/dist/ReactToastify.css';

import styles from './styles.module.scss';

import { Navigation } from 'App/components/Navigation';
import { Header } from 'App/features/Header';
import { RequireAuth } from 'App/features/RequireAuth';
import { ArticleEditPage } from 'App/pages/ArticleEditPage';
import { ArticleListPage } from 'App/pages/ArticleListPage';
import { DiscordCallbackPage } from 'App/pages/DiscordCallbackPage';
import { HomePage } from 'App/pages/HomePage';
import { LoginPage } from 'App/pages/LoginPage';
import { ModuleListPage } from 'App/pages/ModuleListPage';
import { OutlineInfoPage } from 'App/pages/OutlineInfoPage';
import { OutlineListPage } from 'App/pages/OutlineListPage';
import { ServerPage } from 'App/pages/ServerPage';
import { TelegramListPage } from 'App/pages/TelegramListPage';
import { TelegramNewPostPage } from 'App/pages/TelegramNewPostPage';
import { fetchUser, useAppDispatch, useAppSelector } from 'App/redux';

import cn from 'classnames/bind';

const cx = cn.bind(styles);

const App: React.FC = () => {
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
            <Route
              path="/telegram/post"
              element={
                <RequireAuth>
                  <TelegramNewPostPage />
                </RequireAuth>
              }
            />
            <Route
              path="/article"
              element={
                <RequireAuth>
                  <ArticleListPage />
                </RequireAuth>
              }
            />
            <Route
              path="/article/:id"
              element={
                <RequireAuth>
                  <ArticleEditPage />
                </RequireAuth>
              }
            />
            <Route
              path="/outline"
              element={
                <RequireAuth>
                  <OutlineListPage />
                </RequireAuth>
              }
            />
            <Route
              path="/outline/:id"
              element={
                <RequireAuth>
                  <OutlineInfoPage />
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
};

export { App };
