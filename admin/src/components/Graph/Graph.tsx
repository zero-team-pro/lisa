import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart,
  Tooltip,
  Legend,
  Title,
  BarElement,
  LinearScale,
  CategoryScale,
  ChartData,
  ChartOptions,
} from 'chart.js/auto';

import { Loader } from 'App/components/Loader';

interface IProps {
  data: ChartData<'bar'>;
  isLoading?: boolean;
  title?: string;
}

Chart.defaults.color = '#dcddde'; // $color-text
Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export const defOptions: ChartOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    title: {
      display: true,
      // text: 'props.title',
      font: { size: 16 },
    },
    decimation: {},
  },
};

const Graph: React.FC<IProps> = ({ data, isLoading, title }) => {
  const options = useMemo<ChartOptions>(
    () => ({
      ...defOptions,
      plugins: {
        ...defOptions.plugins,
        title: {
          ...defOptions.plugins?.title,
          text: title,
        },
      },
    }),
    [title],
  );

  return (
    <div>
      {isLoading ? <Loader /> : null}
      <Bar options={options} data={data} />
    </div>
  );
};

export { Graph };
