import { DEFAULT_RPC_URL, FIVE_SECONDS, HALF_A_SECOND } from '../../constants';

export type Config = {
  providerUrl: string;
  notifications?: {
    expiration?: number;
    checkInterval?: number;
  };
  contractEvents?: {
    expiration?: number;
    checkInterval?: number;
  };
};

export const DEFAULT_CONFIG: Config = {
  providerUrl: DEFAULT_RPC_URL,
  notifications: {
    expiration: FIVE_SECONDS,
    checkInterval: HALF_A_SECOND,
  },
  contractEvents: {
    expiration: FIVE_SECONDS,
    checkInterval: HALF_A_SECOND,
  },
};
