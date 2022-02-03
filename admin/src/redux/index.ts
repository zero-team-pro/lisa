import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { IChannel, IServer } from 'App/types';
import discordUserReducer from './discordUser';
import {
  createApiAction,
  createApiListAction,
  createApiPatchAction,
  createApiPostAction,
  createApiSlice,
} from 'App/redux/genApiReducer';

export const fetchServerList = createApiListAction('serverList', 'server');
const serverListSlice = createApiSlice<IServer[]>('serverList', fetchServerList);
export const clearServerList = serverListSlice.actions.clear;

export const fetchServer = createApiAction('server', 'server');
const serverSlice = createApiSlice<IServer>('server', fetchServer);
export const clearServer = serverSlice.actions.clear;

export const fetchChannelList = createApiListAction<string>('channelList', 'channel');
export const syncServerChannels = createApiPostAction('channelList', 'server', 'scan');
export const patchChannel = createApiPatchAction<Partial<IChannel>>('channelList', 'channel');
const channelListSlice = createApiSlice<IChannel[]>('channelList', fetchChannelList, patchChannel, syncServerChannels);
export const clearChannelList = channelListSlice.actions.clear;

const store = configureStore({
  reducer: {
    discordUser: discordUserReducer,
    serverList: serverListSlice.reducer,
    server: serverSlice.reducer,
    channelList: channelListSlice.reducer,
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
