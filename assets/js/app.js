document.addEventListener('DOMContentLoaded', () => {
  // Register a Handlebars helper to check equality
  Handlebars.registerHelper('eq', function (a, b) {
    return a.trim() === b.trim();
  });

  // Register a Handlebars helper to check if a string starts with a specific character
  Handlebars.registerHelper('startsWith', function (text, char) {
    return text.trim().startsWith(char);
  });

  // Register a Handlebars helper to title case a string
  Handlebars.registerHelper('titleCase', function (text) {
    return text.trim().charAt(0).toUpperCase() + text.trim().slice(1).toLowerCase();
  });

  // Register a Handlebars helper to capitalize the first character of a string
  Handlebars.registerHelper('capitalizeFirst', function (text) {
    return text.trim().charAt(0).toUpperCase() + text.trim().slice(1);
  });

  // Register a Handlebars helper to format the separator by removing the leading "-" and converting to title case
  Handlebars.registerHelper('formatSeparator', function (text) {
    let trimmedText = text.trim().substring(1).trim(); // Remove the leading "-"
    if (trimmedText) {
      // Title case
      trimmedText = trimmedText
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      trimmedText = ` ${trimmedText} `;
    }
    return trimmedText;
  });

  const listSelect = document.getElementById('listSelect');
  const addListButton = document.getElementById('addList');
  const editListButton = document.getElementById('editList');
  const showSettingsButton = document.getElementById('showSettings');
  const listContainer = document.getElementById('listContainer');
  const newItemInput = document.getElementById('newItemInput');
  const addNewItemButton = document.getElementById('addNewItem');
  const saveListButton = document.getElementById('saveList');
  const deleteListButton = document.getElementById('deleteList');
  const clearAllButton = document.getElementById('clearAll');
  const clearCompletedButton = document.getElementById('clearCompleted');
  const sortCompletedButton = document.getElementById('sortCompleted');
  const exportButton = document.getElementById('exportData');
  const importButton = document.getElementById('importData');
  const importFileInput = document.getElementById('importFileInput');
  const closeEditListPopupButton = document.getElementById('closeEditListPopup');
  const closeSettingsPopupButton = document.getElementById('closeSettingsPopup');
  const toggleDeleteButton = document.getElementById('toggleDelete');
  const toggleReorderButton = document.getElementById('toggleReorder');
  const overlay = document.getElementById('overlay');
  const colorSwatch = document.getElementById('listColorSwatch');
  const completionCount = document.getElementById('completionCount');
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');

  const listsKey = 'lists';
  const lastSelectedListKey = 'lastSelectedList';
  const defaultListName = 'Default';
  const defaultListColor = '#0000ff';

  let lists = JSON.parse(localStorage.getItem(listsKey)) || {};
  let isNewList = false;
  let isReorderEnabled = false;
  let isDeleteEnabled = false;
  let activePopupId = null;

  if (Object.keys(lists).length === 0) {
    const defaultListKey = generateUUID();
    lists[defaultListKey] = { name: defaultListName, color: defaultListColor };
    localStorage.setItem(listsKey, JSON.stringify(lists));
    localStorage.setItem(`list-${defaultListKey}`, JSON.stringify([]));
  }

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  const getTextColor = (backgroundColor) => {
    const rgb = parseInt(backgroundColor.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = rgb & 0xff;
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance > 186 ? '#000000' : '#ffffff';
  };

  const getRandomColor = () => {
    const letters = '0123456789abcdef';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  const applyListAccent = (listKey) => {
    const color = (lists[listKey] && lists[listKey].color) || '#000000';
    document.getElementById('header-main').style.borderBottomColor = color;
    if (colorSwatch) colorSwatch.style.backgroundColor = color;
    if (themeColorMeta) themeColorMeta.setAttribute('content', color);
  };

  const isSeparator = (item) => item.text.trim().startsWith('-');

  const updateCompletionCount = (items) => {
    if (!completionCount) return;
    const real = items.filter(i => !isSeparator(i));
    const total = real.length;
    if (total === 0) {
      completionCount.textContent = '';
      return;
    }
    const done = real.filter(i => i.checked).length;
    completionCount.textContent = `${done}/${total}`;
  };

  const selectList = () => {
    localStorage.setItem(lastSelectedListKey, listSelect.value);
    loadListItems(listSelect.value);
    applyListAccent(listSelect.value);
  };

  const renderLists = () => {
    populateListSelect();
    const lastSelectedList = localStorage.getItem(lastSelectedListKey) || listSelect.value;
    listSelect.value = lastSelectedList;
    loadListItems(lastSelectedList);
    applyListAccent(lastSelectedList);
  };

  const loadListItems = (listKey) => {
    const items = JSON.parse(localStorage.getItem(`list-${listKey}`)) || [];

    if (items.length === 0) {
      listContainer.innerHTML = '<p class="empty-state">Nothing here. Add an item below.</p>';
      updateCompletionCount([]);
      return;
    }

    const template = Handlebars.compile(document.getElementById('list-template').innerHTML);
    listContainer.innerHTML = template({ items });

    if (isReorderEnabled) {
      listContainer.classList.add('reorder-enabled');
      listContainer.querySelectorAll('.move-up-btn, .move-down-btn, .grip').forEach(el => el.classList.remove('hidden'));
    }

    if (isDeleteEnabled) {
      listContainer.querySelectorAll('.list-item').forEach(item => item.classList.add('show-delete'));
    }

    updateCompletionCount(items);
    addDragAndDropHandlers();
  };

  const populateListSelect = () => {
    listSelect.innerHTML = '';
    Object.keys(lists).forEach((listKey) => {
      const option = document.createElement('option');
      option.value = listKey;
      option.textContent = lists[listKey].name;
      option.style.backgroundColor = lists[listKey].color;
      option.style.color = getTextColor(lists[listKey].color);
      listSelect.appendChild(option);
    });
  };

  const addList = () => {
    isNewList = true;
    document.getElementById('listName').value = '';
    document.getElementById('listColor').value = getRandomColor();
    showPopup('popup-edit-list');
    document.getElementById('listName').focus();
  };

  const editList = () => {
    isNewList = false;
    const listKey = listSelect.value;
    document.getElementById('listName').value = lists[listKey].name;
    document.getElementById('listColor').value = lists[listKey].color;
    showPopup('popup-edit-list');
    document.getElementById('listName').focus();
  };

  const saveList = () => {
    const listKey = listSelect.value;
    const newListName = document.getElementById('listName').value.trim();
    const listColor = document.getElementById('listColor').value;

    if (isNewList) {
      if (newListName && !Object.values(lists).some(list => list.name === newListName)) {
        const newListKey = generateUUID();
        lists[newListKey] = { name: newListName, color: listColor };
        localStorage.setItem(listsKey, JSON.stringify(lists));
        localStorage.setItem(`list-${newListKey}`, JSON.stringify([]));
        renderLists();
        listSelect.value = newListKey;
        loadListItems(newListKey);
        applyListAccent(newListKey);
      }
    } else {
      if (newListName) lists[listKey].name = newListName;
      lists[listKey].color = listColor;
      localStorage.setItem(listsKey, JSON.stringify(lists));
      renderLists();
      applyListAccent(listSelect.value);
    }
    localStorage.setItem(lastSelectedListKey, listSelect.value);
    hidePopup('popup-edit-list');
  };

  const deleteList = () => {
    if (Object.keys(lists).length <= 1) return;
    withInlineConfirm(deleteListButton, () => {
      const listKey = listSelect.value;
      delete lists[listKey];
      localStorage.removeItem(`list-${listKey}`);
      localStorage.setItem(listsKey, JSON.stringify(lists));
      renderLists();
      hidePopup('popup-edit-list');
    });
  };

  const addItem = () => {
    const listKey = listSelect.value;
    const itemText = newItemInput.value.trim();
    if (itemText) {
      const items = JSON.parse(localStorage.getItem(`list-${listKey}`)) || [];
      items.push({ text: itemText, checked: false });
      localStorage.setItem(`list-${listKey}`, JSON.stringify(items));
      newItemInput.value = '';
      loadListItems(listKey);
      newItemInput.focus();
    }
  };

  const editItem = (index) => {
    const listKey = listSelect.value;
    const items = JSON.parse(localStorage.getItem(`list-${listKey}`)) || [];
    const item = items[index];
    const template = Handlebars.compile(document.getElementById('item-edit-template').innerHTML);
    const listItem = listContainer.querySelector(`li[data-index="${index}"]`);
    listItem.innerHTML = template({ index, text: item.text });
    listItem.querySelector('.edit-input').focus();
  };

  const saveItem = (index) => {
    const listKey = listSelect.value;
    const items = JSON.parse(localStorage.getItem(`list-${listKey}`)) || [];
    const editInput = listContainer.querySelector(`li[data-index="${index}"] .edit-input`);
    if (!editInput) return;
    const itemText = editInput.value.trim();
    if (itemText) {
      items[index].text = itemText;
      localStorage.setItem(`list-${listKey}`, JSON.stringify(items));
      loadListItems(listKey);
    }
  };

  const deleteItem = (index) => {
    const listKey = listSelect.value;
    const items = JSON.parse(localStorage.getItem(`list-${listKey}`)) || [];
    items.splice(index, 1);
    localStorage.setItem(`list-${listKey}`, JSON.stringify(items));
    loadListItems(listKey);
  };

  const toggleItemChecked = (index) => {
    const listKey = listSelect.value;
    const items = JSON.parse(localStorage.getItem(`list-${listKey}`)) || [];
    items[index].checked = !items[index].checked;
    localStorage.setItem(`list-${listKey}`, JSON.stringify(items));
    loadListItems(listKey);
  };

  // Inline confirmation for high-stakes bulk actions.
  // Each button tracks its own timer so multiple buttons work independently.
  const withInlineConfirm = (button, action) => {
    if (button.dataset.confirming === 'true') {
      clearTimeout(parseInt(button.dataset.timerId, 10));
      button.dataset.confirming = 'false';
      button.classList.remove('confirming');
      button.innerHTML = button.dataset.originalHtml;
      action();
    } else {
      button.dataset.confirming = 'true';
      button.dataset.originalHtml = button.innerHTML;
      button.classList.add('confirming');
      button.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Confirm?';
      const timer = setTimeout(() => {
        button.dataset.confirming = 'false';
        button.classList.remove('confirming');
        button.innerHTML = button.dataset.originalHtml;
      }, 3000);
      button.dataset.timerId = String(timer);
    }
  };

  const clearAll = () => {
    withInlineConfirm(clearAllButton, () => {
      const listKey = listSelect.value;
      localStorage.setItem(`list-${listKey}`, JSON.stringify([]));
      loadListItems(listKey);
    });
  };

  const clearCompleted = () => {
    withInlineConfirm(clearCompletedButton, () => {
      const listKey = listSelect.value;
      const items = JSON.parse(localStorage.getItem(`list-${listKey}`)) || [];
      localStorage.setItem(`list-${listKey}`, JSON.stringify(items.filter(i => !i.checked)));
      loadListItems(listKey);
    });
  };

  const sortCompleted = () => {
    const listKey = listSelect.value;
    const items = JSON.parse(localStorage.getItem(`list-${listKey}`)) || [];
    const sorted = [...items.filter(i => !i.checked), ...items.filter(i => i.checked)];
    localStorage.setItem(`list-${listKey}`, JSON.stringify(sorted));
    loadListItems(listKey);
  };

  const exportData = () => {
    const allLists = JSON.parse(localStorage.getItem(listsKey)) || {};
    const data = { [listsKey]: allLists };
    Object.keys(allLists).forEach(key => {
      data[`list-${key}`] = JSON.parse(localStorage.getItem(`list-${key}`)) || [];
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lists-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        Object.keys(data).forEach(key => {
          localStorage.setItem(key, JSON.stringify(data[key]));
        });
        lists = JSON.parse(localStorage.getItem(listsKey)) || {};
        renderLists();
      } catch (_) {
        // invalid JSON file, ignore silently
      }
    };
    reader.readAsText(file);
  };

  const showPopup = (popupId) => {
    activePopupId = popupId;
    document.getElementById(popupId).style.display = 'block';
    overlay.style.display = 'block';
  };

  const hidePopup = (popupId) => {
    document.getElementById(popupId).style.display = 'none';
    overlay.style.display = 'none';
    activePopupId = null;
  };

  const addDragAndDropHandlers = () => {
    listContainer.querySelectorAll('.list-item').forEach(item => {
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragover', handleDragOver);
      item.addEventListener('dragleave', handleDragLeave);
      item.addEventListener('drop', handleDrop);
      item.addEventListener('dragend', handleDragEnd);
    });
  };

  let dragSrcEl = null;

  const handleDragStart = (e) => {
    dragSrcEl = e.target.closest('li');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragSrcEl.dataset.index);
    dragSrcEl.classList.add('dragging');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    const li = e.target.closest('li');
    if (li) li.classList.add('drag-over');
    e.dataTransfer.dropEffect = 'move';
    return false;
  };

  const handleDragLeave = (e) => {
    const li = e.target.closest('li');
    if (li) li.classList.remove('drag-over');
  };

  const handleDrop = (e) => {
    e.stopPropagation();
    const li = e.target.closest('li');
    if (li) li.classList.remove('drag-over');
    if (dragSrcEl && li && dragSrcEl !== li) {
      reorderItems(dragSrcEl.dataset.index, li.dataset.index);
    }
    return false;
  };

  const handleDragEnd = (e) => {
    const li = e.target.closest('li');
    if (li) li.classList.remove('dragging');
  };

  const reorderItems = (srcIndex, targetIndex) => {
    const listKey = listSelect.value;
    const items = JSON.parse(localStorage.getItem(`list-${listKey}`)) || [];
    const [movedItem] = items.splice(srcIndex, 1);
    items.splice(targetIndex, 0, movedItem);
    localStorage.setItem(`list-${listKey}`, JSON.stringify(items));
    loadListItems(listKey);
  };

  const moveItem = (fromIndex, toIndex) => {
    const listKey = listSelect.value;
    const items = JSON.parse(localStorage.getItem(`list-${listKey}`)) || [];
    if (toIndex >= 0 && toIndex < items.length) {
      const [movedItem] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, movedItem);
      localStorage.setItem(`list-${listKey}`, JSON.stringify(items));
      loadListItems(listKey); // isReorderEnabled boolean preserves mode state
    }
  };

  toggleReorderButton.addEventListener('click', () => {
    isReorderEnabled = !isReorderEnabled;
    if (isReorderEnabled && isDeleteEnabled) {
      isDeleteEnabled = false;
      toggleDeleteButton.classList.remove('active');
      listContainer.querySelectorAll('.list-item').forEach(item => item.classList.remove('show-delete'));
    }
    toggleReorderButton.classList.toggle('active', isReorderEnabled);
    listContainer.classList.toggle('reorder-enabled', isReorderEnabled);
    listContainer.querySelectorAll('.move-up-btn, .move-down-btn, .grip').forEach(el => el.classList.toggle('hidden', !isReorderEnabled));
  });

  toggleDeleteButton.addEventListener('click', () => {
    isDeleteEnabled = !isDeleteEnabled;
    if (isDeleteEnabled && isReorderEnabled) {
      isReorderEnabled = false;
      toggleReorderButton.classList.remove('active');
      listContainer.classList.remove('reorder-enabled');
      listContainer.querySelectorAll('.move-up-btn, .move-down-btn, .grip').forEach(el => el.classList.add('hidden'));
    }
    toggleDeleteButton.classList.toggle('active', isDeleteEnabled);
    listContainer.querySelectorAll('.list-item').forEach(item => item.classList.toggle('show-delete', isDeleteEnabled));
  });

  listContainer.addEventListener('click', (event) => {
    const li = event.target.closest('li');
    if (!li) return;
    const index = parseInt(li.dataset.index, 10);

    if (event.target.closest('.move-up-btn')) {
      moveItem(index, index - 1);
    } else if (event.target.closest('.move-down-btn')) {
      moveItem(index, index + 1);
    } else if (event.target.closest('.item-delete-btn')) {
      deleteItem(index);
    } else if (event.target.classList.contains('editable')) {
      editItem(index);
    } else if (event.target.closest('.save-btn')) {
      saveItem(index);
    } else if (event.target.type === 'checkbox') {
      toggleItemChecked(index);
    }
  });

  document.getElementById('listName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveList();
  });

  newItemInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addItem();
  });

  listContainer.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('edit-input')) {
      saveItem(e.target.dataset.index);
    }
  });

  listSelect.addEventListener('change', selectList);
  addListButton.addEventListener('click', addList);
  addNewItemButton.addEventListener('click', addItem);
  saveListButton.addEventListener('click', saveList);
  deleteListButton.addEventListener('click', deleteList);
  clearAllButton.addEventListener('click', clearAll);
  clearCompletedButton.addEventListener('click', clearCompleted);
  sortCompletedButton.addEventListener('click', sortCompleted);
  exportButton.addEventListener('click', exportData);
  importButton.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) importData(e.target.files[0]);
    e.target.value = '';
  });
  editListButton.addEventListener('click', editList);
  showSettingsButton.addEventListener('click', () => showPopup('popup-settings'));
  closeEditListPopupButton.addEventListener('click', () => hidePopup('popup-edit-list'));
  closeSettingsPopupButton.addEventListener('click', () => hidePopup('popup-settings'));

  overlay.addEventListener('click', () => {
    if (activePopupId) hidePopup(activePopupId);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activePopupId) hidePopup(activePopupId);
  });

  renderLists();
});
