import { toggleTheme } from '@lib/toggleTheme';
import { exampleThemeStorage } from '@chrome-extension-boilerplate/storage';

console.log('content script loaded');

void toggleTheme();

export async function toggleTheme() {
  console.log('initial theme:', await exampleThemeStorage.get());
  await exampleThemeStorage.toggle();
  console.log('toggled theme:', await exampleThemeStorage.get());
}

console.log('content loaded');

// Mock Ethereum provider setup
const mockedAddress = '0x141D9959cAe3853b035000490C03991eB70Fc4aC';
const mockResponses = {
  eth_accounts: [mockedAddress],
  eth_requestAccounts: [mockedAddress],
  eth_chainId: '0x1',
  net_version: '1',
  eth_getBlockByNumber: {
    baseFeePerGas: '0x1',
  },
  eth_sign: '0xMockedSignature',
  personal_sign: '0xMockedPersonalSignature',
  eth_signTypedData: '0xMockedTypedDataSignature',
  eth_signTypedData_v3: '0xMockedTypedDataV3Signature',
  eth_signTypedData_v4: '0xMockedTypedDataV4Signature',
  eth_getEncryptionPublicKey: '0xMockedEncryptionPublicKey',
  eth_decrypt: '0xMockedDecryptionResult',
  eth_sendTransaction: '0xMockedTransactionHash',
  wallet_addEthereumChain: true,
  wallet_switchEthereumChain: true,
  wallet_watchAsset: true,
  wallet_requestPermissions: [{ parentCapability: 'eth_accounts' }],
  wallet_getPermissions: [{ parentCapability: 'eth_accounts' }],
};

function handleEthereumRequest(method: string, params: any[]) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (mockResponses[method]) {
        resolve(mockResponses[method]);
      } else {
        reject(new Error(`Method ${method} not supported`));
      }
    }, 100);
  });
}

// Listen for messages from the injected script
window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window || !event.data || event.data.type !== 'ETH_REQUEST') return;

  console.log('Content script received ETH_REQUEST:', event.data);
  const { method, params } = event.data;

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
