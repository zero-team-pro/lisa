import { AsyncThunk, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import Cookies from 'universal-cookie';

import Config from 'App/constants/config';
import { ReduxStateWrapper } from 'App/types';

interface IState {
  value: any;
  isLoading: boolean;
  error: any;
}

export const createApiListAction = (name: string, url: string) =>
  createAsyncThunk(`${name}/fetch`, async (_, { rejectWithValue }) => {
    const cookies = new Cookies();
    const token = cookies.get('token');

    const payload = await fetch(`${Config.API_URL}/${url}`, {
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
      // TODO: Auth again
      return rejectWithValue(401);
    }

    const data = await payload.json();

    if (!data || typeof data.message !== 'undefined' || typeof data.code !== 'undefined') {
      return rejectWithValue(true);
    }

    return data;
  });

export const createApiAction = (name: string, url: string) =>
  createAsyncThunk<any, string | number>(`${name}/fetch`, async (id, { rejectWithValue }) => {
    const cookies = new Cookies();
    const token = cookies.get('token');

    const payload = await fetch(`${Config.API_URL}/${url}/${id}`, {
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
      // TODO: Auth again
      return rejectWithValue(401);
    }
    if (payload.status === 404) {
      return rejectWithValue(404);
    }

    const data = await payload.json();

    if (!data || typeof data.message !== 'undefined' || typeof data.code !== 'undefined') {
      return rejectWithValue(true);
    }

    return data;
  });

export const createApiSlice = <T>(name: string, fetchAction: AsyncThunk<any, any, any>) =>
  createSlice({
    name,
    initialState: {
      value: null,
      isLoading: false,
      error: null,
    } as ReduxStateWrapper<T>,
    reducers: {},
    extraReducers: (builder) => {
      builder.addCase(fetchAction.pending, (state: IState) => {
        state.isLoading = true;
      });
      builder.addCase(fetchAction.fulfilled, (state: IState, action: any) => {
        state.value = action.payload;
        state.isLoading = false;
        state.error = null;
      });
      builder.addCase(fetchAction.rejected, (state: IState, action: any) => {
        state.value = null;
        state.isLoading = false;
        state.error = action.payload || true;
      });
    },
  }).reducer;
