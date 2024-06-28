(function () {
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

  function ethereumRequest(method, params = []) {
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

  function mountEthereum() {
    const ethereum = {
      isMetaMask: true,
      request: async ({ method, params }) => {
        console.log('ethereum.request called with:', method, params);
        return ethereumRequest(method, params);
      },
      on: (event, handler) => {
        console.log(`event registered: ${event}`);
        window.addEventListener(event, handler);
      },
      removeListener: (event, handler) => {
        console.log(`event unregistered: ${event}`);
        window.removeEventListener(event, handler);
      },
    };
    Object.defineProperty(window, 'ethereum', {
      value: ethereum,
      writable: false,
    });
    console.log('window.ethereum has been mounted');
  }

  function ensureEthereum() {
    if (window.ethereum && !window.ethereum.isMetaMask) {
      console.log('window.ethereum already exists. Replacing it...');
      delete window.ethereum;
      mountEthereum();
    } else if (!window.ethereum) {
      mountEthereum();
    }
  }

  // Initial check
  ensureEthereum();

  // Use MutationObserver to watch for changes to window.ethereum
  const observer = new MutationObserver(() => {
    ensureEthereum();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Also use an interval as a fallback
  setInterval(() => {
    ensureEthereum();
  }, 1000);
})();
