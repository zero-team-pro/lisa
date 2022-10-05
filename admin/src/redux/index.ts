import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { IArticle, IChannel, IModule, IServer, ITelegramChat, ITelegramUser } from 'App/types';
import { adminMeSlice } from './adminMe';
import {
  createApiAction,
  createApiListAction,
  createApiPatchAction,
  createApiPostAction,
  createApiSlice,
} from 'App/redux/genApiReducer';

export { fetchUser } from './adminMe';
export const logout = adminMeSlice.actions.logout;

/* Discord */
export const fetchServerList = createApiListAction('serverList', 'server');
const serverListSlice = createApiSlice<IServer[]>('serverList', fetchServerList);
export const clearServerList = serverListSlice.actions.clear;

export const fetchServer = createApiAction('server', 'server');
export const patchServerModule = createApiPostAction('server', 'server', 'module');
export const deleteServerAdmin = createApiPostAction('server', 'admin', 'del-admin');
export const checkServerAdmin = createApiPostAction('server', 'admin', 'check');
const serverSlice = createApiSlice<IServer>(
  'server',
  fetchServer,
  patchServerModule,
  deleteServerAdmin,
  checkServerAdmin,
);
export const clearServer = serverSlice.actions.clear;

export const fetchChannelList = createApiListAction<string>('channelList', 'channel');
export const syncServerChannels = createApiPostAction('channelList', 'server', 'scan');
export const patchChannel = createApiPatchAction<Partial<IChannel>>('channelList', 'channel');
const channelListSlice = createApiSlice<IChannel[]>('channelList', fetchChannelList, patchChannel, syncServerChannels);
export const clearChannelList = channelListSlice.actions.clear;

/* Telegram */
export const fetchTelegramChatList = createApiListAction('telegramChatList', 'telegram/chatList');
const telegramChatListSlice = createApiSlice<ITelegramChat[]>('telegramChatList', fetchTelegramChatList);

export const fetchTelegramUserList = createApiListAction('telegramUserList', 'telegram/userList');
const telegramUserListSlice = createApiSlice<ITelegramUser[]>('telegramUserList', fetchTelegramUserList);

/* CMS */
export const fetchArticleList = createApiListAction('articleList', 'telegram/article/list');
const articleListSlice = createApiSlice<IArticle[]>('articleList', fetchArticleList);

export const createArticle = createApiPostAction('article', 'telegram/article', 'create');
const articleSlice = createApiSlice<IArticle>('article', createArticle);

export const fetchModuleList = createApiListAction('moduleList', 'module');
const moduleListSlice = createApiSlice<IModule[]>('moduleList', fetchModuleList);

const store = configureStore({
  reducer: {
    adminMe: adminMeSlice.reducer,
    serverList: serverListSlice.reducer,
    server: serverSlice.reducer,
    channelList: channelListSlice.reducer,
    moduleList: moduleListSlice.reducer,
    telegramChatList: telegramChatListSlice.reducer,
    telegramUserList: telegramUserListSlice.reducer,
    articleList: articleListSlice.reducer,
    article: articleSlice.reducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
