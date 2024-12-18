import { expect, use } from "chai";
import chaiJsonSchema from "chai-json-schema";
import { ethers } from "ethers";
import { runExample } from "../src";

use(chaiJsonSchema);

describe("Signing an EIP-712 message using a Wrapped Key", () => {
  it("should return signed EIP-712 message", async () => {
    console.log("🔄 Generating EIP-712 message...");
    const domain = {
      name: "Ether Mail",
      version: "1",
      chainId: 1,
      verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
    };
    const types = {
      Person: [
        { name: "name", type: "string" },
        { name: "wallet", type: "address" },
      ],
      Mail: [
        { name: "from", type: "Person" },
        { name: "to", type: "Person" },
        { name: "contents", type: "string" },
      ],
    };
    const message = {
      from: {
        name: "Alice",
        wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
      },
      to: {
        name: "Bob",
        wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
      },
      contents: "Hello, Bob!",
    };

    const typedData = {
      domain,
      types,
      primaryType: "Mail",
      message,
    };
    const serializedEip712Message = JSON.stringify(typedData);
    console.log(
      `✅ Generated and serialized EIP-712 message: ${serializedEip712Message}`
    );

    const { signedMessage, wrappedKeyEthAddress } = (await runExample(
      serializedEip712Message,
      true
    )) ?? { signedMessage: "", wrappedKeyEthAddress: "" };
    expect(signedMessage).to.not.equal("");
    expect(wrappedKeyEthAddress).to.not.equal("");

    // Verify the signature using EIP-712
    const recoveredAddress = ethers.utils.verifyTypedData(
      domain,
      types,
      message,
      signedMessage
    );
    expect(recoveredAddress).to.equal(wrappedKeyEthAddress);
  }).timeout(120_000);
});

describe("Signing a EIP-191 message using a Wrapped Key", () => {
  it("should return signed EIP-191 message", async () => {
    const message = "Hello, World!";

    const { signedMessage, wrappedKeyEthAddress } = (await runExample(
      message,
      false
    )) ?? { signedMessage: "", wrappedKeyEthAddress: "" };
    expect(signedMessage).to.not.equal("");
    expect(wrappedKeyEthAddress).to.not.equal("");

    // Verify the signature using EIP-191
    const recoveredAddress = ethers.utils.verifyMessage(message, signedMessage);
    expect(recoveredAddress).to.equal(wrappedKeyEthAddress);
  }).timeout(120_000);
});
