import { ReportOpts } from 'web-vitals';

const reportWebVitals = (onPerfEntry?: () => void, opts?: ReportOpts) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      onCLS(onPerfEntry, opts);
      onINP(onPerfEntry, opts);
      onFCP(onPerfEntry, opts);
      onLCP(onPerfEntry, opts);
      onTTFB(onPerfEntry, opts);
    });
  }
};

export default reportWebVitals;
