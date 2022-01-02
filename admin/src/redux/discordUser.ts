import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ReduxStateWrapper } from 'App/redux/tpyes';

interface DiscordUser {
  id: string;
  username: string;
  avatar: string;
  discriminator: string;
  public_flags: number;
}

// interface DiscordAuth {
//   application: {
//     id: string;
//     name: string;
//     icon: string;
//     description: string;
//     summary: string;
//     hook: boolean;
//     bot_public: boolean;
//     bot_require_code_grant: boolean;
//     verify_key: string;
//   };
//   scopes: string[];
//   expires: string;
//   user: DiscordUser;
// }

const initialState = {
  value: null,
} as ReduxStateWrapper<DiscordUser>;

export const discordUserSlice = createSlice({
  name: 'discordUser',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<DiscordUser>) => {
      state.value = action.payload;
    },
    logout: (state) => {
      state.value = null;
    },
  },
});

export const { login, logout } = discordUserSlice.actions;

export default discordUserSlice.reducer;
