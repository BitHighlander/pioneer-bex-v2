(function () {
  function ethereumRequest(method, params = []) {
    return new Promise((resolve, reject) => {
      window.postMessage({ type: 'ETH_REQUEST', method, params }, '*');

      function handleMessage(event) {
        if (event.source !== window || event.data.type !== 'ETH_RESPONSE' || event.data.method !== method) return;

        window.removeEventListener('message', handleMessage);
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.result);
        }
      }

      window.addEventListener('message', handleMessage);
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
