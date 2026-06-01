import React from 'react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { Toasts } from './components/Toasts';

type AppProps = {
  router: ReturnType<typeof createMemoryRouter>;
};

export const App = ({ router }: AppProps): React.ReactElement => {
  return (
    <>
      <RouterProvider router={router} />
      <Toasts />
    </>
  );
};
