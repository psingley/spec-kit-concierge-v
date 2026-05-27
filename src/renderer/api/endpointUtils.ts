import type { IpcQueryError } from './baseQuery';
import type { RendererFactoryError } from './factoryUtils';

export const parsingError = (error: RendererFactoryError<string>): IpcQueryError => ({
  status: 'PARSING_ERROR',
  data: {
    name: error.name,
    message: error.message
  }
});
