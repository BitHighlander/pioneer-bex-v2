import { toggleTheme } from '@lib/toggleTheme';
import { exampleThemeStorage } from '@chrome-extension-boilerplate/storage';
import { onStartKeepkey } from './keepkey';
import { JsonRpcProvider } from 'ethers';

const TAG = ' | content/index.js | ';
console.log(TAG, 'content script loaded');

void toggleTheme();

export async function toggleTheme() {
  console.log('initial theme:', await exampleThemeStorage.get());
  await exampleThemeStorage.toggle();
  console.log('toggled theme:', await exampleThemeStorage.get());
}

console.log('content loaded bro');

let EIP155_CHAINS = {
  'eip155:1': {
    chainId: 1,
    name: 'Ethereum',
    logo: '/chain-logos/eip155-1.png',
    rgb: '99, 125, 234',
    rpc: 'https://eth.llamarpc.com',
    namespace: 'eip155',
  },
};

let ADDRESS = '';
let KEEPKEY_SDK: any = '';

let onStart = async function () {
  let tag = TAG + ' | onStart | ';
  try {
    // Connecting to KeepKey
    let keepkey = await onStartKeepkey();
    console.log(tag, 'keepkey: ', keepkey);
    let address = keepkey.ETH.wallet.address;
    console.log(tag, 'address: ', address);

    // Set addresses
    ADDRESS = address;
    console.log(tag, '**** keepkey: ', keepkey);
    KEEPKEY_SDK = keepkey.ETH.keepkeySdk;
    console.log(tag, 'keepkeySdk: ', KEEPKEY_SDK);

    // Mount to Ethereum provider
    window.ethereum = {
      isMetaMask: true,
      selectedAddress: ADDRESS,
      request: async ({ method, params }: { method: string; params: any[] }) => {
        return handleEthereumRequest(method, params);
      },
      on: (event: string, handler: Function) => {
        console.log(tag, 'Ethereum event registered:', event);
      },
    };
  } catch (e) {
    console.error(tag, 'e: ', e);
  }
};
onStart();

async function signMessage(message: any) {
  try {
    console.log('signMessage: ', message);
    console.log('KEEPKEY_SDK.ETH.walletMethods: ', KEEPKEY_SDK.ETH.walletMethods);

    // Use KeepKey's method to sign a message
    let address = KEEPKEY_SDK.ETH.wallet.address;
    const messageFormatted = `0x${Buffer.from(
      Uint8Array.from(typeof message === 'string' ? new TextEncoder().encode(message) : message),
    ).toString('hex')}`;
    return KEEPKEY_SDK.eth.ethSign({ address, message: messageFormatted });
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function signTransaction(transaction: any) {
  let tag = TAG + ' | signTransaction | ';
  try {
    console.log(tag, '**** transaction: ', transaction);

    // Basic transaction validation
    if (!transaction.from) throw Error('invalid tx missing from');
    if (!transaction.to) throw Error('invalid tx missing to');
    // if (!transaction.data) throw Error("invalid tx missing data");
    if (!transaction.chainId) throw Error('invalid tx missing chainId');

    // Get provider for the specified chainId
    let rpcUrl = EIP155_CHAINS['eip155:1'].rpc; // Assuming chainId is 1
    const provider = new JsonRpcProvider(rpcUrl);

    let nonce = await provider.getTransactionCount(transaction.from, 'pending');
    transaction.nonce = `0x${nonce.toString(16)}`;

    const feeData = await provider.getFeeData();
    console.log('feeData: ', feeData);
    transaction.gasPrice = `0x${BigInt(feeData.gasPrice || '0').toString(16)}`;
    transaction.maxFeePerGas = `0x${BigInt(feeData.maxFeePerGas || '0').toString(16)}`;
    transaction.maxPriorityFeePerGas = `0x${BigInt(feeData.maxPriorityFeePerGas || '0').toString(16)}`;

    try {
      const estimatedGas = await provider.estimateGas({
        from: transaction.from,
        to: transaction.to,
        data: transaction.data,
      });
      console.log('estimatedGas: ', estimatedGas);
      transaction.gas = `0x${estimatedGas.toString(16)}`;
    } catch (e) {
      transaction.gas = `0x${BigInt('1000000').toString(16)}`;
    }

    let input: any = {
      from: transaction.from,
      addressNList: [2147483692, 2147483708, 2147483648, 0, 0], // Placeholder for actual derivation path
      data: transaction.data || '0x',
      nonce: transaction.nonce,
      gasLimit: transaction.gas,
      gas: transaction.gas,
      value: transaction.value || '0x0', // Assuming the transaction value is 0
      to: transaction.to,
      chainId: `0x${transaction.chainId.toString(16)}`,
      gasPrice: transaction.gasPrice,
      maxFeePerGas: transaction.maxFeePerGas,
      maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
    };

    console.log(`${tag} Final input: `, input);
    console.log(`${tag} KEEPKEY_SDK: `, KEEPKEY_SDK);
    let output = await KEEPKEY_SDK.eth.ethSignTransaction(input);
    console.log(`${tag} Transaction output: `, output);

    return output.serialized;
  } catch (e) {
    console.error(`${tag} Error: `, e);
    throw e; // Rethrowing for external handling
  }
}

async function signTypedData(params: any) {
  let tag = TAG + ' | signTypedData | ';
  try {
    console.log(tag, '**** params: ', params);
    let signedMessage = await KEEPKEY_SDK.keepkeySdk.eth.ethSignTypedData({
      address: KEEPKEY_SDK.ETH.wallet.address,
      addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
      typedData: params,
    });
    console.log(tag, '**** signedMessage: ', signedMessage);
    return signedMessage;
  } catch (e) {
    console.error(`${tag} Error: `, e);
    throw e; // Rethrowing for external handling
  }
}

async function broadcastTransaction(signedTx: string, networkId: string) {
  try {
    let rpcUrl = EIP155_CHAINS['eip155:1'].rpc; // Assuming chainId is 1
    console.log('rpcUrl: ', rpcUrl);
    const provider = new JsonRpcProvider(rpcUrl);
    console.log('provider:', provider);

    // Broadcasting the signed transaction
    const receipt = await provider.send('eth_sendRawTransaction', [signedTx]);
    console.log('Transaction receipt:', receipt);

    return receipt;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function sendTransaction(transaction: any) {
  let tag = TAG + ' | sendTransaction | ';
  try {
    // Send a message to the background script to open the popup
    chrome.runtime.sendMessage({ action: 'openPopup' }, (response: any) => {
      console.log('Popup open response: ', response);
      console.log('response:', response);
    });

    //TODO if approved by user!

    // console.log(tag, 'transaction:', transaction);
    // let params = transaction[0];
    // let chainId = '0x1';
    // params.chainId = chainId;
    // params.from = ADDRESS;
    // let signedTx = await signTransaction(params);
    // console.log(tag, 'signedTx:', signedTx);

    // let result = '0x1234567890abcdef';
    // //TODO unnerf
    // // let result = await broadcastTransaction(signedTx, chainId)
    // // console.log(tag, 'signedTx:', signedTx)
    //
    // return result;
  } catch (e) {
    console.error(e);
  }
}

async function handleEthereumRequest(method: string, params: any[]): Promise<any> {
  const tag = TAG + ' | handleEthereumRequest | ';
  console.log(tag, 'method:', method);
  console.log(tag, 'params:', params);

  try {
    switch (method) {
      case 'eth_accounts':
        console.log(tag, 'Returning eth_accounts:', [ADDRESS]);
        return [ADDRESS];
      case 'eth_requestAccounts':
        console.log(tag, 'Returning eth_requestAccounts:', [ADDRESS]);
        return [ADDRESS];
      case 'eth_sign':
        console.log(tag, 'Calling signMessage with:', params[1]);
        return await signMessage(params[1]);
      case 'eth_sendTransaction':
        console.log(tag, 'Calling signTransaction with:', params[0]);
        return sendTransaction(params);
      case 'eth_signTransaction':
        console.log(tag, 'Calling signTransaction with:', params[0]);
        return await signTransaction(params[0]);
      case 'eth_sendRawTransaction':
        console.log(tag, 'Calling broadcastTransaction with:', params[0], 'and chainId 1');
        return await broadcastTransaction(params[0], '1'); // Assuming chainId is 1
      case 'eth_signTypedData':
        console.log(tag, 'Calling signTypedData with:', params[1]);
        return await signTypedData(params[1]);
      case 'eth_getEncryptionPublicKey':
      case 'wallet_requestPermissions':
      case 'wallet_getPermissions':
      case 'wallet_watchAsset':
      case 'wallet_addEthereumChain':
      case 'wallet_switchEthereumChain':
        console.log(tag, `Method ${method} not supported`);
        throw new Error(`Method ${method} not supported`);
      default:
        console.log(tag, `Method ${method} not supported`);
        throw new Error(`Method ${method} not supported`);
    }
  } catch (error) {
    console.error(tag, `Error processing method ${method}:`, error);
    throw error;
  }
}

// function handleEthereumRequest(method: string, params: any[]) {
//   const tag = TAG + " | handleEthereumRequest | ";
//   console.log(tag, 'method:', method);
//   console.log(tag, 'params:', params);
//   //
//   return new Promise((resolve, reject) => {
//     switch (method) {
//       case 'eth_accounts':
//         resolve([ADDRESS]);
//         break;
//       case 'eth_requestAccounts':
//         resolve([ADDRESS]);
//         break;
//       case 'eth_sign':
//         signMessage(params[1])
//             .then(resolve)
//             .catch(reject);
//         break;
//       case 'eth_signTransaction':
//         signTransaction(params[0])
//             .then(resolve)
//             .catch(reject);
//         break;
//       case 'eth_sendRawTransaction':
//         broadcastTransaction(params[0], '1') // Assuming chainId is 1
//             .then(resolve)
//             .catch(reject);
//         break;
//       case 'eth_signTypedData':
//         signTypedData(params[1])
//             .then(resolve)
//             .catch(reject);
//         break;
//       case 'wallet_requestPermissions':
//       case 'wallet_getPermissions':
//       case 'wallet_watchAsset':
//       case 'wallet_addEthereumChain':
//       case 'wallet_switchEthereumChain':
//         reject(new Error(`Method ${method} not supported`));
//         break;
//       default:
//         reject(new Error(`Method ${method} not supported`));
//     }
//   });
// }

// Listen for messages from the injected script
window.addEventListener('message', (event: MessageEvent) => {
  const tag = TAG + ' | window.addEventListener | ';
  console.log(tag, 'event:', event);
  if (event.source !== window || !event.data || event.data.type !== 'ETH_REQUEST') return;

  console.log(tag, 'Content script received ETH_REQUEST:', event.data);
  const { method, params } = event.data;
  console.log(tag, 'method:', method);
  console.log(tag, 'params:', params);

  handleEthereumRequest(method, params)
    .then(result => {
      window.postMessage({ type: 'ETH_RESPONSE', method, result }, '*');
    })
    .catch(error => {
      window.postMessage({ type: 'ETH_RESPONSE', method, error: error.message }, '*');
    });
});

// Log window.ethereum to ensure it is correctly defined
console.log('window.ethereum:', window.ethereum);

// Inject MetaMask provider
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
script.onload = function () {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);
