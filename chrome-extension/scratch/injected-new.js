(function () {
  const TAG = 'InjectedScript';
  const VERSION = '1.0.1';
  console.log('**** Pioneer Injection script ****: ', VERSION);

  async function ethereumRequest(method, params = []) {
    let tag = TAG + ' | ethereumRequest | ';
    try {
      console.log(tag, 'method:', method);
      console.log(tag, 'params:', params);

      return await new Promise((resolve, reject) => {
        // Send the request to the content script
        window.postMessage({ type: 'ETH_REQUEST', method, params, tag: TAG }, '*');

        // Listen for the response from the content script
        function handleMessage(event) {
          console.log(tag, 'event:', event);
          console.log(tag, 'event.data:', event.data);
          console.log(tag, 'event.data.type:', event.data.type);
          console.log(tag, 'event.data.result:', event.data.result);
          if (event.data.result) resolve(event.data.result);
        }

        window.addEventListener('message', handleMessage);
      });
    } catch (error) {
      console.error(tag, `Error in ${TAG}:`, error);
      throw error;
    }
  }

  function sendRequestAsync(payload, callback) {
    console.log('ethereum.sendAsync called with:', payload);
    ethereumRequest(payload.method, payload.params).then(
      result => callback(null, { id: payload.id, jsonrpc: '2.0', result }),
      error => callback(error),
    );
  }

  function sendRequestSync(payload) {
    console.log('ethereum.sendSync called with:', payload);
    return {
      id: payload.id,
      jsonrpc: '2.0',
      result: ethereumRequest(payload.method, payload.params),
    };
  }

  function mountEthereum() {
    let tag = TAG + ' | mountEthereum | ';
    const ethereum = {
      isMetaMask: true,
      request: async ({ method, params }) => {
        console.log('ethereum.request called with:', method, params);
        return ethereumRequest(method, params);
      },
      send: (payload, callback) => {
        if (callback) {
          sendRequestAsync(payload, callback);
        } else {
          return sendRequestSync(payload);
        }
      },
      sendAsync: (payload, callback) => {
        sendRequestAsync(payload, callback);
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

    console.log(tag, 'ethereum:', ethereum);

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
  ensureEthereum();
})();
