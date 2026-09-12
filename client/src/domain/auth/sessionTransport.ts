import axios, { CanceledError } from "axios";
import type {
  AxiosAdapter,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";

let sessionTail: Promise<void> = Promise.resolve();

function reserveSessionRequest() {
  const ready = sessionTail;
  let release!: () => void;
  const completed = new Promise<void>((resolve) => {
    release = resolve;
  });

  sessionTail = ready.then(() => completed);
  return { ready, release };
}

export async function sendSessionRequest<T = unknown>(
  client: AxiosInstance,
  config: AxiosRequestConfig,
): Promise<AxiosResponse<T>> {
  const first = reserveSessionRequest();
  const transport = config.adapter ?? client.defaults.adapter;
  let firstAttempt = true;
  const adapter: AxiosAdapter = async (requestConfig) => {
    const slot = firstAttempt ? first : reserveSessionRequest();
    firstAttempt = false;
    await slot.ready;
    try {
      requestConfig.cancelToken?.throwIfRequested();
      if (requestConfig.signal?.aborted) {
        throw new CanceledError(undefined, requestConfig);
      }
      return await axios.getAdapter(transport)(requestConfig);
    } finally {
      slot.release();
    }
  };

  try {
    return await client.request<T>({ ...config, adapter });
  } finally {
    first.release();
  }
}
