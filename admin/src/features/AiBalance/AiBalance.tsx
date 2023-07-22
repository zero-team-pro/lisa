import React, { useEffect } from 'react';

import styles from './styles.scss';

import { fetchAiBalance, useAppDispatch, useAppSelector } from 'App/redux';
import { Loader } from 'App/components/Loader';
import { Empty } from 'App/components/Empty';
import { BalanceTransactions } from 'App/features/BalanceTransactions';

const cx = require('classnames/bind').bind(styles);

const AiBalance: React.FC = () => {
  const dispatch = useAppDispatch();

  const aiBalanceState = useAppSelector((state) => state.aiBalance);
  const aiBalanceList = aiBalanceState.value;
  const isLoading = aiBalanceState.isLoading;

  useEffect(() => {
    if (!aiBalanceState.value && !aiBalanceState.isLoading && !aiBalanceState.error) {
      dispatch(fetchAiBalance());
    }
  }, [dispatch, aiBalanceState]);

  const formatCur = (value: number | string) =>
    value.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });

  return (
    <div className={cx('ai-balance')}>
      <Loader isLoading={isLoading}>
        {aiBalanceList ? (
          aiBalanceList.length > 0 ? (
            <>
              <h2>Balance</h2>
              {aiBalanceList.map((balance) => (
                <div key={balance.id}>
                  <div className={cx('ai-balance__title')}>
                    <h3>
                      {balance.ownerType} {balance.owner}
                    </h3>
                    <h3>${formatCur(balance.balance)}</h3>
                    <BalanceTransactions ownerId={balance.owner} ownerType={balance.ownerType} />
                  </div>
                </div>
              ))}
            </>
          ) : (
            <Empty />
          )
        ) : (
          <Empty isError />
        )}
      </Loader>
    </div>
  );
};

export { AiBalance };
