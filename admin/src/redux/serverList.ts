import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import Cookies from 'universal-cookie';

import { ReduxStateWrapper } from 'App/redux/tpyes';
import Config from 'App/constants/config';

interface IServer {
  id: string;
  prefix: string;
  lang: string;
  raterLang: string;
  mainChannelId: string;
  raterEngine: string;
  createdAt: string;
  updatedAt: string;
}

const initialState = {
  value: null,
  isLoading: false,
  error: null,
} as ReduxStateWrapper<IServer[]>;

type IState = typeof initialState;

export const fetchServerList = createAsyncThunk('serverList/fetchUser', async (_, { rejectWithValue }) => {
  const cookies = new Cookies();
  const token = cookies.get('token');

  const payload = await fetch(`${Config.API_URL}/server/list`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).catch((e) => {
    console.log(e);
    return null;
  });
  if (!payload) {
    return rejectWithValue('fetch');
  }

  if (payload.status === 401) {
    // cookies.remove('token');
    return rejectWithValue(401);
  }

  const data = await payload.json();

  if (!data || typeof data.message !== 'undefined' || typeof data.code !== 'undefined') {
    return rejectWithValue(true);
  }

  return data;
});

export const serverListSlice = createSlice({
  name: 'serverList',
  initialState,
  reducers: {
    logout: (state) => {
      const cookies = new Cookies();
      cookies.remove('token');
      state.value = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchServerList.pending, (state: IState) => {
      state.isLoading = true;
    });
    builder.addCase(fetchServerList.fulfilled, (state: IState, action: any) => {
      state.value = action.payload;
      state.isLoading = false;
      state.error = null;
    });
    builder.addCase(fetchServerList.rejected, (state: IState, action: any) => {
      state.value = null;
      state.isLoading = false;
      state.error = action.payload || true;
    });
  },
});

export const { logout } = serverListSlice.actions;

export default serverListSlice.reducer;
