import 'webextension-polyfill';
import { exampleThemeStorage } from '@chrome-extension-boilerplate/storage';

const TAG = ' | background | ';
exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  let tag = TAG + ' | onMessage | ';
  console.log(tag, '****** debug message received ******');
  console.log(tag, 'message', message);
  if (message.action === 'openPopup') {
    console.log(tag, '****** CALLING POPUP ******');

    // First, check if the popup is already open
    chrome.windows.getAll({ windowTypes: ['popup'] }, windows => {
      for (let win of windows) {
        if (win.tabs && win.tabs[0].url.includes('popup/index.html')) {
          console.log(tag, 'Popup is already open, focusing on it.');
          chrome.windows.update(win.id, { focused: true });
          sendResponse({ success: true });
          return;
        }
      }
      // If the popup is not open, create a new one
      chrome.windows.create(
        {
          url: chrome.runtime.getURL('popup/index.html'),
          type: 'popup',
          width: 400,
          height: 600,
        },
        window => {
          if (chrome.runtime.lastError) {
            console.error(tag, 'Error creating popup:', chrome.runtime.lastError);
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            console.log(tag, 'Popup created:', window);
            sendResponse({ success: true });
          }
        },
      );
    });

    return true; // Keep the message channel open for sendResponse
  }
  return false; // Close the message channel
});

console.log('background loaded');
console.log("Edit 'chrome-extension/lib/background/index.ts' and save to reload.");
