import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { createApiAction, createApiListAction, createApiSlice } from 'App/redux/genApiReducer';
import { IServer } from 'App/types';
import discordUserReducer from './discordUser';

export const fetchServerList = createApiListAction('serverList', 'server');
export const fetchServer = createApiAction('server', 'server');

const store = configureStore({
  reducer: {
    discordUser: discordUserReducer,
    serverList: createApiSlice<IServer[]>('serverList', fetchServerList),
    server: createApiSlice<IServer>('server', fetchServer),
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
