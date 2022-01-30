export type ReduxStateWrapper<T> = {
  value: T | null;
  isLoading: boolean;
  error: any;
};
