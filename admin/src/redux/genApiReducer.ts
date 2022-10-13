import { AsyncThunk, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import Cookies from 'universal-cookie';
import { toast } from 'react-toastify';

import Config from 'App/constants/config';
import { IReduxState, PatchJson, PostJson, ReduxStateWrapper } from 'App/types';

export const createApiListAction = <T = void>(name: string, url: string) =>
  createAsyncThunk<any, T>(`${name}/fetch`, async (arg, { rejectWithValue }) => {
    const cookies = new Cookies();
    const discordToken = cookies.get('discordToken');

    const params = arg ? `/${arg}` : '';
    const payload = await fetch(`${Config.API_URL}/${url}${params}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${discordToken}`,
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

    if (!data || data.status === 'ERROR') {
      return rejectWithValue(data || true);
    }

    return data;
  });

export const createApiAction = <T = string | number>(name: string, url: string) =>
  createAsyncThunk<any, T>(`${name}/fetch`, async (id, { rejectWithValue }) => {
    const cookies = new Cookies();
    const discordToken = cookies.get('discordToken');

    const payload = await fetch(`${Config.API_URL}/${url}${id ? `/${id}` : ''}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${discordToken}`,
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

    if (!data || data.status === 'ERROR') {
      return rejectWithValue(data || true);
    }

    return data;
  });

export const createApiPatchAction = <T = any>(name: string, url: string) =>
  createAsyncThunk<any, PatchJson<T>>(`${name}/patch`, async (arg, { rejectWithValue }) => {
    const cookies = new Cookies();
    const discordToken = cookies.get('discordToken');
    const { guildId, id, value } = arg;

    const methodPath = guildId ? `${url}/${guildId}` : url;
    const payload = await fetch(`${Config.API_URL}/${methodPath}/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${discordToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(value),
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

    if (!data || data.status === 'ERROR' || !data.isOk || !data.value) {
      return rejectWithValue(data || true);
    }

    return data.value;
  });

export const createApiPostAction = <T = any>(name: string, url: string, action?: string) =>
  createAsyncThunk<any, PostJson<T>>(
    `${name}/${action ? `action-${action}` : 'post'}`,
    async (arg, { rejectWithValue }) => {
      const cookies = new Cookies();
      const discordToken = cookies.get('discordToken');
      const { id, value } = arg;

      const payload = await fetch(`${Config.API_URL}/${url}${id ? `/${id}` : ''}${action ? `/${action}` : ''}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${discordToken}`,
          'Content-Type': 'application/json',
        },
        body: value ? JSON.stringify(value) : undefined,
      }).catch((err) => {
        console.log('API Post action error:', err);
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

      if (!data || data.status === 'ERROR' || !data.isOk) {
        return rejectWithValue(data || true);
      }

      return data;
    },
  );

const initialState: IReduxState = {
  value: null,
  isLoading: false,
  isSending: false,
  isLoaded: false,
  error: null,
};

export const createApiSlice = <T>(name: string, ...actions: AsyncThunk<any, any, any>[]) =>
  createSlice({
    name,
    initialState: initialState as ReduxStateWrapper<T>,
    reducers: {
      clear: () => {
        return initialState;
      },
    },
    extraReducers: (builder) => {
      actions.forEach((action) => {
        builder.addCase(action.pending, (state: IReduxState, action: any) => {
          const isPatch = /^\w*\/patch\/[\w-]*$/.test(action.type);
          const isPost = /^\w*\/post\/[\w-]*$/.test(action.type);
          const isAction = /^\w*\/action-[\w-]*\/\w*$/.test(action.type);

          if (isPatch) {
            state.isSending = true;
            state.error = null;
          } else if (isPost || isAction) {
            state.isSending = true;
            state.error = null;
          } else {
            state.value = null;
            state.isLoading = true;
            state.isLoaded = false;
            state.error = null;
          }
        });
        builder.addCase(action.fulfilled, (state: IReduxState, action: any) => {
          const data = action.payload;
          const isPatch = /^\w*\/patch\/[\w-]*$/.test(action.type);
          const isPost = /^\w*\/post\/[\w-]*$/.test(action.type);
          const isAction = /^\w*\/action-[\w-]*\/\w*$/.test(action.type);

          // Patch list
          if (isPatch && Array.isArray(state.value)) {
            const id = state.value.findIndex((entity) => entity?.id === data.id);
            if (id !== -1) {
              state.value[id] = data;
            }
            state.isSending = false;
          } else if (isPost || isAction) {
            const isPartial = isAction && !!data.isPartial;
            if (data) {
              if (isPartial) {
                Object.keys(data.value).forEach((key) => {
                  state.value[key] = data.value[key];
                });
              } else {
                state.value = data.value;
              }
            }
            state.isSending = false;
          } else {
            state.value = data;
            state.isLoading = false;
            state.isLoaded = true;
          }

          state.error = null;
        });
        builder.addCase(action.rejected, (state: IReduxState, action: any) => {
          const isPatch = /^\w*\/patch\/[\w-]*$/.test(action.type);
          const isPost = /^\w*\/post\/[\w-]*$/.test(action.type);
          const isAction = /^\w*\/action-[\w-]*\/\w*$/.test(action.type);
          console.log('ACTION REJECTED');

          if (isPatch) {
            state.isSending = false;
          } else if (isPost || isAction) {
            state.isSending = false;
          } else {
            state.isLoading = false;
          }
          state.error = action.payload || true;

          toast.error(state.error.message || 'Error');
        });
      });
    },
  });
