import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ToastContainer, Zoom } from 'react-toastify';
import Cookies from 'universal-cookie';

import 'react-toastify/dist/ReactToastify.css';

import styles from './styles.module.scss';

import { ProtectedLayout } from 'App/components/ProtectedLayout';
import { PublicLayout } from 'App/components/PublicLayout';
import { ArticleEditPage } from 'App/pages/ArticleEditPage';
import { ArticleListPage } from 'App/pages/ArticleListPage';
import { DiscordCallbackPage } from 'App/pages/DiscordCallbackPage';
import { HomePage } from 'App/pages/HomePage';
import { LoginPage } from 'App/pages/LoginPage';
import { ModuleListPage } from 'App/pages/ModuleListPage';
import { OutlineInfoPage } from 'App/pages/OutlineInfoPage';
import { OutlineListPage } from 'App/pages/OutlineListPage';
import { PrivacyPage } from 'App/pages/PrivacyPage';
import { ServerPage } from 'App/pages/ServerPage';
import { TelegramListPage } from 'App/pages/TelegramListPage';
import { TelegramNewPostPage } from 'App/pages/TelegramNewPostPage';
import { TermsPage } from 'App/pages/TermsPage';
import { fetchUser, useAppDispatch, useAppSelector } from 'App/redux';

import cn from 'classnames/bind';

const cx = cn.bind(styles);

const App: React.FC = () => {
  const adminMe = useAppSelector((state) => state.adminMe);

  const cookies = new Cookies();
  const dispatch = useAppDispatch();

  const discordToken = cookies.get('discordToken');
  useEffect(() => {
    if (discordToken && !adminMe.value && !adminMe.isLoading && !adminMe.error) {
      dispatch(fetchUser());
    }
  });

  return (
    <div className={cx('app')}>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/modules" element={<ModuleListPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/discord-callback" element={<DiscordCallbackPage />} />
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/server/:id" element={<ServerPage />} />
              <Route path="/telegram" element={<TelegramListPage />} />
              <Route path="/telegram/post" element={<TelegramNewPostPage />} />
              <Route path="/article" element={<ArticleListPage />} />
              <Route path="/article/:id" element={<ArticleEditPage />} />
              <Route path="/outline" element={<OutlineListPage />} />
              <Route path="/outline/:id" element={<OutlineInfoPage />} />
            </Route>
          </Route>
        </Routes>
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
