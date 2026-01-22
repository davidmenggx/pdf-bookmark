chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'pageChanged':
      break;
      
    case 'getBookmarks':
      chrome.storage.local.get('pdfBookmarks', (result) => {
        sendResponse(result.pdfBookmarks || {});
      });
      return true;
      
    case 'saveBookmarks':
      chrome.storage.local.set({ pdfBookmarks: request.bookmarks }, () => {
        sendResponse({ success: true });
      });
      return true;
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.get('pdfBookmarks', (result) => {
      if (!result.pdfBookmarks) {
        chrome.storage.local.set({ pdfBookmarks: {} });
      }
    });
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isPdf = isPdfUrl(tab.url);
    
    if (isPdf) {
      chrome.action.setIcon({ 
        tabId: tabId, 
        path: {
          16: 'icons/icon16-active.png',
          48: 'icons/icon48-active.png',
          128: 'icons/icon128-active.png'
        }
      });
    } else {
      chrome.action.setIcon({ 
        tabId: tabId, 
        path: {
          16: 'icons/icon16.png',
          48: 'icons/icon48.png',
          128: 'icons/icon128.png'
        }
      });
    }
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      const isPdf = isPdfUrl(tab.url);
      
      if (isPdf) {
        chrome.action.setIcon({ 
          tabId: activeInfo.tabId, 
          path: {
            16: 'icons/icon16-active.png',
            48: 'icons/icon48-active.png',
            128: 'icons/icon128-active.png'
          }
        });
      } else {
        chrome.action.setIcon({ 
          tabId: activeInfo.tabId, 
          path: {
            16: 'icons/icon16.png',
            48: 'icons/icon48.png',
            128: 'icons/icon128.png'
          }
        });
      }
    }
  } catch (e) {}
});

function isPdfUrl(url) {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return lowerUrl.endsWith('.pdf') ||
        lowerUrl.includes('.pdf?') ||
        lowerUrl.includes('.pdf#') ||
        (lowerUrl.startsWith('chrome-extension://') && lowerUrl.includes('pdf'));
}
