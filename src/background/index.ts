import browser from 'webextension-polyfill';

// Create context menu items when extension is installed
browser.runtime.onInstalled.addListener(() => {
  // Context menu for clipping selection
  browser.contextMenus.create({
    id: 'octarine-clip-selection',
    title: 'Add selection to Octarine',
    contexts: ['selection'],
  });

  // Context menu for clipping entire page
  browser.contextMenus.create({
    id: 'octarine-clip-page',
    title: 'Clip page to Octarine',
    contexts: ['page'],
  });

  console.log('[Octarine Clipper] Extension installed');
});

// Handle context menu clicks
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  switch (info.menuItemId) {
    case 'octarine-clip-selection':
      // Send message to content script to add selection
      await browser.tabs.sendMessage(tab.id, { action: 'ADD_SELECTION' });
      break;

    case 'octarine-clip-page':
      // Open the popup or trigger clip action
      // For now, just open the popup
      await browser.action.openPopup();
      break;
  }
});

// Handle keyboard shortcuts
browser.commands.onCommand.addListener(async (command) => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  
  if (!tab?.id) return;

  switch (command) {
    case 'clip-page':
      await browser.action.openPopup();
      break;
      
    case 'add-selection':
      await browser.tabs.sendMessage(tab.id, { action: 'ADD_SELECTION' });
      break;
  }
});

console.log('[Octarine Clipper] Background script loaded');
