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

// Listen for messages from the injected script
window.addEventListener('message', event => {
  if (event.source !== window || !event.data || event.data.type !== 'GET_ADDRESS') return;

  console.log('Content script received message:', event.data);

  // Forward the message to the background script
  chrome.runtime.sendMessage({ message: 'getAddress' }, function (response) {
    console.log('Mocked address received from background script: ', response.address);
    if (response.address) {
      // Send the address back to the injected script
      window.postMessage({ type: 'ADDRESS_RESPONSE', address: response.address }, '*');
    }
  });
});

// Inject MetaMask provider
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
script.onload = function () {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);
