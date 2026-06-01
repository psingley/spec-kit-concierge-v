export const createBackForwardBlocker = () => {
  return (event: Electron.Event, input: Electron.Input): void => {
    if (input.alt && (input.key === 'ArrowLeft' || input.key === 'ArrowRight')) {
      event.preventDefault();
    }
  };
};
