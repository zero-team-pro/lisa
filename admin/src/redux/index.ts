import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import {
  IArticle,
  IChannel,
  IModule,
  IOutlineClient,
  IOutlineServer,
  IServer,
  ITelegramChat,
  ITelegramUser,
} from 'App/types';
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
export const fetchServerList = createApiListAction('serverList', 'server/v1');
const serverListSlice = createApiSlice<IServer[]>('serverList', fetchServerList);
export const clearServerList = serverListSlice.actions.clear;

export const fetchServer = createApiAction('server', 'server/v1');
export const patchServerModule = createApiPostAction('server', 'server/v1', 'module');
export const deleteServerAdmin = createApiPostAction('server', 'admin/v1', 'del-admin');
export const checkServerAdmin = createApiPostAction('server', 'admin/v1', 'check');
const serverSlice = createApiSlice<IServer>(
  'server',
  fetchServer,
  patchServerModule,
  deleteServerAdmin,
  checkServerAdmin,
);
export const clearServer = serverSlice.actions.clear;

export const fetchChannelList = createApiListAction<string>('channelList', 'channel/v1');
export const syncServerChannels = createApiPostAction('channelList', 'server/v1', 'scan');
export const patchChannel = createApiPatchAction<Partial<IChannel>>('channelList', 'channel/v1');
const channelListSlice = createApiSlice<IChannel[]>('channelList', fetchChannelList, patchChannel, syncServerChannels);
export const clearChannelList = channelListSlice.actions.clear;

/* Telegram */
export const fetchTelegramChatList = createApiListAction('telegramChatList', 'telegram/v1/chatList');
const telegramChatListSlice = createApiSlice<ITelegramChat[]>('telegramChatList', fetchTelegramChatList);

export const fetchTelegramUserList = createApiListAction('telegramUserList', 'telegram/v1/userList');
const telegramUserListSlice = createApiSlice<ITelegramUser[]>('telegramUserList', fetchTelegramUserList);

export const fetchTelegramLinkUser = createApiPostAction('telegramUtils', 'telegram/v1', 'link-user');
const telegramLinkUserSlice = createApiSlice<string>('telegramUtils', fetchTelegramLinkUser);

/* CMS */
export const fetchArticleList = createApiListAction('articleList', 'telegram/v1/article/list');
const articleListSlice = createApiSlice<IArticle[]>('articleList', fetchArticleList);

export const fetchArticle = createApiAction('article', 'telegram/v1/article');
export const createArticle = createApiPostAction('article', 'telegram/v1/article', 'create');
export const saveArticle = createApiPostAction('article', 'telegram/v1/article', 'save');
export const postArticle = createApiPostAction('article', 'telegram/v1/article', 'post');
const articleSlice = createApiSlice<IArticle>('article', fetchArticle, createArticle, saveArticle, postArticle);
export const clearArticle = articleSlice.actions.clear;

/* Outline */
export const fetchOutlineServerList = createApiListAction('outlineServerList', 'vpn/outline/v1/server');
const outlineServerListSlice = createApiSlice<IOutlineServer[]>('outlineServerList', fetchOutlineServerList);

export const fetchOutlineServer = createApiAction('outlineServer', 'vpn/outline/v1/server/info');
const outlineServerSlice = createApiSlice<IOutlineServer>('outlineServer', fetchOutlineServer);

export const fetchOutlineClientList = createApiAction('outlineClientList', 'vpn/outline/v1/server/client-list');
const outlineClientListSlice = createApiSlice<IOutlineClient[]>('outlineClientList', fetchOutlineClientList);

/* Modules */
export const fetchModuleList = createApiListAction('moduleList', 'module/v1');
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
    telegramLinkUser: telegramLinkUserSlice.reducer,
    articleList: articleListSlice.reducer,
    article: articleSlice.reducer,
    outlineServerList: outlineServerListSlice.reducer,
    outlineServer: outlineServerSlice.reducer,
    outlineClientList: outlineClientListSlice.reducer,
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
