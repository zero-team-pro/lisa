import React, { JSXElementConstructor } from 'react';

export type ViewProps<T extends keyof JSX.IntrinsicElements | JSXElementConstructor<any>> = React.ComponentProps<T>;
