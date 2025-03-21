import { LIT_CHAINS } from "@lit-protocol/constants";

export const getEnv = (name: string): string => {
  // Browser environment
  if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
    const envMap: Record<string, string | undefined> = {
      'ETHEREUM_PRIVATE_KEY': process.env.NEXT_PUBLIC_ETHEREUM_PRIVATE_KEY,
      'LIT_PKP_PUBLIC_KEY': process.env.NEXT_PUBLIC_LIT_PKP_PUBLIC_KEY,
      'LIT_CAPACITY_CREDIT_TOKEN_ID': process.env.NEXT_PUBLIC_LIT_CAPACITY_CREDIT_TOKEN_ID,
      'CHAIN_TO_SEND_TX_ON': process.env.NEXT_PUBLIC_CHAIN_TO_SEND_TX_ON,
    };
    const env = envMap[name];
    if (name === "ETHEREUM_PRIVATE_KEY" && (env === undefined || env === "")) {
      throw new Error(
        `Browser: ${name} ENV is not defined, please define it in the .env file`
      );
    } else if (env === undefined || env === "") {
      return "";
    } else {
      return env;
    }
  }
  
  // Node environment
  const env = process.env[name];
  if (name === "ETHEREUM_PRIVATE_KEY" && (env === undefined || env === "")) {
    throw new Error(
      `Node: ${name} ENV is not defined, please define it in the .env file`
    );
  } else if (env === undefined || env === "") {
    return "";
  } else {
    return env;
  }
};

export const getChainInfo = (
  chain: string
): { rpcUrl: string; chainId: number } => {
  if (LIT_CHAINS[chain] === undefined)
    throw new Error(`Chain: ${chain} is not supported by Lit`);

  return {
    rpcUrl: LIT_CHAINS[chain].rpcUrls[0],
    chainId: LIT_CHAINS[chain].chainId,
  };
};
