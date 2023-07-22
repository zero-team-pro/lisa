import React, { useEffect, useMemo } from 'react';
import { ChartData } from 'chart.js/auto';

import { fetchBalanceTransactionList, useAppDispatch, useAppSelector } from 'App/redux';
import { Loader } from 'App/components/Loader';
import { Empty } from 'App/components/Empty';
import { Graph } from 'App/components/Graph';

interface IProps {
  ownerId: string;
  ownerType: string;
}

const BalanceTransactions: React.FC<IProps> = ({ ownerId, ownerType }) => {
  const dispatch = useAppDispatch();

  const balanceTransactionState = useAppSelector((state) => state.balanceTransaction);
  const balanceTransactionList = balanceTransactionState.value;
  const isLoading = balanceTransactionState.isLoading;

  useEffect(() => {
    if (!balanceTransactionState.value && !balanceTransactionState.isLoading && !balanceTransactionState.error) {
      dispatch(fetchBalanceTransactionList(`${ownerType}-${ownerId}`));
    }
  }, [dispatch, balanceTransactionState, ownerType, ownerId]);

  const data = useMemo(() => {
    const result: ChartData<'bar'> = {
      labels: [],
      datasets: [
        {
          label: 'Transactions',
          data: [],
          backgroundColor: 'rgba(87, 242, 135, 0.67)', // $color-green,
        },
      ],
    };

    balanceTransactionList?.forEach((trans) => {
      result.labels?.push(trans.createdAt);
      result.datasets[0].data.push(trans.amount);
    });

    return result;
  }, [balanceTransactionList]);

  return (
    <div>
      <Loader isLoading={isLoading}>
        {balanceTransactionList ? (
          balanceTransactionList.length > 0 ? (
            <Graph title="Daily AI Usage" data={data} isLoading={isLoading} />
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

export { BalanceTransactions };
