import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { encryptString } from '@lit-protocol/encryption';
import { LIT_NETWORK, LIT_RPC, LIT_ABILITY } from "@lit-protocol/constants";
import {
  LitActionResource,
  LitPKPResource,
} from "@lit-protocol/auth-helpers";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import { AccessControlConditions } from "@lit-protocol/types";
import { EthWalletProvider } from "@lit-protocol/lit-auth-client";
import { LIT_NETWORKS_KEYS } from "@lit-protocol/types";
import { api } from "@lit-protocol/wrapped-keys";
import { getEncryptedKey } from "@lit-protocol/wrapped-keys/src/lib/api";
import fs from "node:fs";
import * as ethers from "ethers";

import { getEnv, mintPkp } from "./utils";
const litActionCode = fs.readFileSync("src/litAction.bundle.js", "utf8");

const { generatePrivateKey } = api;

const ETHEREUM_PRIVATE_KEY = getEnv("ETHEREUM_PRIVATE_KEY");
const OPENAI_API_KEY = getEnv("OPENAI_API_KEY");
const LIT_PKP_PUBLIC_KEY = process.env["LIT_PKP_PUBLIC_KEY"];
const litNetwork =
  (process.env["LIT_NETWORK"] as LIT_NETWORKS_KEYS) || LIT_NETWORK.DatilDev;

export const solanaOpenAI = async () => {
  let litNodeClient: LitNodeClient;
  let pkpInfo: {
    tokenId?: string;
    publicKey?: string;
    ethAddress?: string;
  } = {
    publicKey: LIT_PKP_PUBLIC_KEY,
  };

  try {
    const ethersWallet = new ethers.Wallet(
      ETHEREUM_PRIVATE_KEY,
      new ethers.providers.JsonRpcProvider(LIT_RPC.CHRONICLE_YELLOWSTONE)
    );

    console.log("🔄 Connecting to the Lit network...");
    litNodeClient = new LitNodeClient({
      litNetwork: litNetwork,
      debug: false,
    });
    await litNodeClient.connect();
    console.log("✅ Connected to the Lit network");

    console.log("🔄 Connecting LitContracts client to network...");
    const litContracts = new LitContracts({
      signer: ethersWallet,
      network: litNetwork,
      debug: false,
    });
    await litContracts.connect();
    console.log("✅ Connected LitContracts client to network");

    if (LIT_PKP_PUBLIC_KEY === undefined || LIT_PKP_PUBLIC_KEY === "") {
      console.log("🔄 PKP wasn't provided, minting a new one...");
      pkpInfo = (await mintPkp(ethersWallet)) as {
        tokenId?: string;
        publicKey?: string;
        ethAddress?: string;
      };
      console.log("✅ PKP successfully minted");
      console.log(`ℹ️  PKP token ID: ${pkpInfo.tokenId}`);
      console.log(`ℹ️  PKP public key: ${pkpInfo.publicKey}`);
      console.log(`ℹ️  PKP ETH address: ${pkpInfo.ethAddress}`);
    } else {
      console.log(`ℹ️  Using provided PKP: ${LIT_PKP_PUBLIC_KEY}`);
      pkpInfo = {
        publicKey: LIT_PKP_PUBLIC_KEY,
        ethAddress: ethers.utils.computeAddress(`0x${LIT_PKP_PUBLIC_KEY}`),
      };
    }

    console.log("🔄 Creating AuthMethod using the ethersSigner...");
    const authMethod = await EthWalletProvider.authenticate({
      signer: ethersWallet,
      litNodeClient,
    });
    console.log("✅ Finished creating the AuthMethod");

    console.log("🔄 Getting the Session Signatures...");
    const pkpSessionSigs = await litNodeClient.getPkpSessionSigs({
      pkpPublicKey: pkpInfo.publicKey!,
      chain: "ethereum",
      authMethods: [authMethod],
      expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
      resourceAbilityRequests: [
        {
          resource: new LitActionResource("*"),
          ability: LIT_ABILITY.LitActionExecution,
        },
        {
          resource: new LitPKPResource("*"),
          ability: LIT_ABILITY.PKPSigning,
        },
      ],
    });
    console.log("✅ Generated the Session Signatures");

    console.log("🔄 Generating wrapped key...");
    const response = await generatePrivateKey({
      pkpSessionSigs,
      network: "solana",
      memo: "This is a Dev Guide code example testing Solana key",
      litNodeClient,
    });
    console.log(
      `✅ Generated wrapped key with id: ${response.id} and public key: ${response.generatedPublicKey}`
    );

    const {
      ciphertext: solanaCipherText,
      dataToEncryptHash: solanaDataToEncryptHash,
    } = await getEncryptedKey({
      pkpSessionSigs,
      litNodeClient,
      id: response.id,
    });

    const accessControlConditions: AccessControlConditions = [
      {
        contractAddress: "",
        standardContractType: "",
        chain: "ethereum",
        method: "",
        parameters: [":userAddress"],
        returnValueTest: {
          comparator: "=",
          value: pkpInfo.ethAddress!,
        },
      },
    ];

    const {
      ciphertext: apiKeyCipherText,
      dataToEncryptHash: apiKeyDataToEncryptHash,
    } = await encryptString(
      {
        accessControlConditions: accessControlConditions,
        dataToEncrypt: OPENAI_API_KEY,
      },
      litNodeClient
    );

    const prompt = "Should I buy DogeCoin?";

    console.log("🔄 Executing the Lit Action...");
    const litActionResponse = await litNodeClient.executeJs({
      sessionSigs: pkpSessionSigs,
      code: litActionCode,
      jsParams: {
        accessControlConditions,
        solanaCipherText,
        solanaDataToEncryptHash,
        apiKeyCipherText,
        apiKeyDataToEncryptHash,
        prompt,
      },
    });
    console.log("✅ Executed the Lit Action");
    console.log(litActionResponse);

    return litActionResponse;
  } catch (error) {
    console.error(error);
  } finally {
    litNodeClient!.disconnect();
  }
};
