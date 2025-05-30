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
  const closeEditListPopupButton = document.getElementById('closeEditListPopup');
  const closeSettingsPopupButton = document.getElementById('closeSettingsPopup');
  const toggleDeleteButton = document.getElementById('toggleDelete');
  const toggleReorderButton = document.getElementById('toggleReorder');

  const listsKey = 'lists';
  const lastSelectedListKey = 'lastSelectedList';
  const defaultListName = 'Default';
  const defaultListColor = '#0000FF';

  let lists = JSON.parse(localStorage.getItem(listsKey)) || {};
  let isNewList = false;

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

  const selectList = () => {
    localStorage.setItem(lastSelectedListKey, listSelect.value);
    loadListItems(listSelect.value);
  };

  const renderLists = () => {
    populateListSelect();
    const lastSelectedList = localStorage.getItem(lastSelectedListKey) || listSelect.value;
    listSelect.value = lastSelectedList;
    loadListItems(lastSelectedList);
  };

  const loadListItems = (listKey) => {
    const items = JSON.parse(localStorage.getItem(`list-${listKey}`)) || [];
    const template = Handlebars.compile(document.getElementById('list-template').innerHTML);
    listContainer.innerHTML = template({ items });
    addDragAndDropHandlers();
  };

  const getRandomColor = () => {
    const letters = '0123456789abcdef';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  const addList = () => {
    isNewList = true;
    document.getElementById('listName').value = '';
    document.getElementById('listColor').value = getRandomColor();
    showPopup('popup-edit-list');
  };

  const editList = () => {
    isNewList = false;
    const listKey = listSelect.value;
    document.getElementById('listName').value = lists[listKey].name;
    document.getElementById('listColor').value = lists[listKey].color;
    showPopup('popup-edit-list');
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
      }
    } else {
      if (newListName && newListName !== lists[listKey].name) {
        lists[listKey].name = newListName;
      }
      lists[listKey].color = listColor;
      localStorage.setItem(listsKey, JSON.stringify(lists));
      renderLists();
    }
    localStorage.setItem(lastSelectedListKey, listSelect.value);
    hidePopup('popup-edit-list');
  };

  const deleteList = () => {
    const listKey = listSelect.value;
    if (confirm(`Are you sure you want to delete the list "${lists[listKey].name}"?`)) {
      delete lists[listKey];
      localStorage.removeItem(`list-${listKey}`);
      localStorage.setItem(listsKey, JSON.stringify(lists));
      renderLists();
    }
    hidePopup('popup-edit-list');
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
    const itemText = listContainer.querySelector(`li[data-index="${index}"] .edit-input`).value.trim();
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

  const clearAll = () => {
    const listKey = listSelect.value;
    if (confirm(`Are you sure you want to clear all items from the list "${lists[listKey].name}"?`)) {
      localStorage.setItem(`list-${listKey}`, JSON.stringify([]));
      loadListItems(listKey);
    }
  };

  const clearCompleted = () => {
    const listKey = listSelect.value;
    const items = JSON.parse(localStorage.getItem(`list-${listKey}`)) || [];
    const filteredItems = items.filter(item => !item.checked);
    localStorage.setItem(`list-${listKey}`, JSON.stringify(filteredItems));
    loadListItems(listKey);
  };

  const showPopup = (popupId) => {
    document.getElementById(popupId).style.display = 'block';
  };

  const hidePopup = (popupId) => {
    document.getElementById(popupId).style.display = 'none';
  };

  const addDragAndDropHandlers = () => {
    const listItems = listContainer.querySelectorAll('.list-item');
    listItems.forEach(item => {
      item.setAttribute('draggable', true);
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragover', handleDragOver);
      item.addEventListener('dragleave', handleDragLeave);
      item.addEventListener('drop', handleDrop);
      item.addEventListener('dragend', handleDragEnd);
    });
  };

  let dragSrcEl = null;

  const handleDragStart = (e) => {
    dragSrcEl = e.target;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.index);
    e.target.classList.add('dragging');
  };

  const handleDragOver = (e) => {
    if (e.preventDefault) {
      e.preventDefault();
    }
    const li = e.target.closest('li');
    if (li) {
      li.classList.add('drag-over');
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
  };

  const handleDragLeave = (e) => {
    const li = e.target.closest('li');
    if (li) {
      li.classList.remove('drag-over');
    }
  };

  const handleDrop = (e) => {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    const li = e.target.closest('li');
    if (li) {
      li.classList.remove('drag-over');
    }
    if (dragSrcEl !== e.target) {
      const srcIndex = dragSrcEl.dataset.index;
      const targetIndex = e.target.closest('li').dataset.index;
      reorderItems(srcIndex, targetIndex);
      updateListOrder();
    }
    return false;
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
  };

  const reorderItems = (srcIndex, targetIndex) => {
    const listKey = listSelect.value;
    const items = JSON.parse(localStorage.getItem(`list-${listKey}`)) || [];
    const [movedItem] = items.splice(srcIndex, 1);
    items.splice(targetIndex, 0, movedItem);
    localStorage.setItem(`list-${listKey}`, JSON.stringify(items));
    loadListItems(listKey);
  };

  const updateListOrder = () => {
    const listKey = listSelect.value;
    const items = [];
    listContainer.querySelectorAll('.list-item').forEach((item, index) => {
      const text = item.querySelector('.editable').textContent;
      const checked = item.querySelector('input[type="checkbox"]').checked;
      items.push({ text, checked });
    });
    localStorage.setItem(`list-${listKey}`, JSON.stringify(items));
  };

  const moveItem = (fromIndex, toIndex) => {
    const listKey = listSelect.value;
    const items = JSON.parse(localStorage.getItem(`list-${listKey}`)) || [];
    if (toIndex >= 0 && toIndex < items.length) {
      const [movedItem] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, movedItem);
      localStorage.setItem(`list-${listKey}`, JSON.stringify(items));

      // Update only the list items without hiding the move buttons
      const moveButtonsVisible = !document.querySelector('.move-up-btn').classList.contains('hidden');
      loadListItems(listKey);

      // Re-enable move buttons if they were visible
      if (moveButtonsVisible) {
        const moveButtons = document.querySelectorAll('.move-up-btn, .move-down-btn, .grip');
        moveButtons.forEach(button => button.classList.remove('hidden'));
      }
    }
  };

  toggleReorderButton.addEventListener('click', () => {
    const isReorderEnabled = listContainer.classList.toggle('reorder-enabled');
    const moveButtons = document.querySelectorAll('.move-up-btn, .move-down-btn, .grip');
    moveButtons.forEach(button => button.classList.toggle('hidden', !isReorderEnabled));
  });

  listContainer.addEventListener('dragstart', (event) => {
    if (event.target.classList.contains('grip')) {
      // Ensure the move buttons and grip remain visible during drag
      listContainer.classList.add('reorder-enabled');
    }
  });

  listContainer.addEventListener('dragend', (event) => {
    if (event.target.classList.contains('grip')) {
      // Keep the reorder-enabled state intact after dragging
      if (!listContainer.classList.contains('reorder-enabled')) {
        listContainer.classList.add('reorder-enabled');
      }
    }
  });

  listContainer.addEventListener('click', (event) => {
    if (event.target.closest('.move-up-btn')) {
      const index = parseInt(event.target.closest('.move-up-btn').dataset.index, 10);
      moveItem(index, index - 1);
    } else if (event.target.closest('.move-down-btn')) {
      const index = parseInt(event.target.closest('.move-down-btn').dataset.index, 10);
      moveItem(index, index + 1);
    }
  });

  newItemInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addItem();
    }
  });

  listContainer.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('edit-input')) {
      const index = e.target.dataset.index;
      saveItem(index);
    }
  });

  toggleDeleteButton.addEventListener('click', () => {
    const listItems = listContainer.querySelectorAll('.list-item');
    listItems.forEach(item => {
      item.classList.toggle('show-delete');
    });
  });

  listSelect.addEventListener('change', selectList);
  addListButton.addEventListener('click', addList);
  addNewItemButton.addEventListener('click', addItem);
  listContainer.addEventListener('click', (event) => {
    const target = event.target;
    const index = target.closest('li').dataset.index;
    if (target.classList.contains('delete-btn')) {
      deleteItem(index);
    } else if (target.classList.contains('editable')) {
      editItem(index);
    } else if (target.classList.contains('save-btn')) {
      saveItem(index);
    } else if (target.type === 'checkbox') {
      toggleItemChecked(index);
    }
  });
  saveListButton.addEventListener('click', saveList);
  deleteListButton.addEventListener('click', deleteList);
  clearAllButton.addEventListener('click', clearAll);
  clearCompletedButton.addEventListener('click', clearCompleted);
  editListButton.addEventListener('click', editList);
  showSettingsButton.addEventListener('click', () => showPopup('popup-settings'));
  closeEditListPopupButton.addEventListener('click', () => hidePopup('popup-edit-list'));
  closeSettingsPopupButton.addEventListener('click', () => hidePopup('popup-settings'));

  const populateListSelect = () => {
    const lists = JSON.parse(localStorage.getItem('lists')) || [];

    // Clear existing options
    listSelect.innerHTML = '';

    // Populate the dropdown with options
    Object.keys(lists).forEach((listKey) => {
      const option = document.createElement('option');
      option.value = listKey;
      option.textContent = lists[listKey].name;
      option.style.backgroundColor = lists[listKey].color;
      option.style.color = getTextColor(lists[listKey].color);
      listSelect.appendChild(option);
    });
  };

  // Utility function to determine text color (black or white) for contrast
  const getTextColor = (backgroundColor) => {
    const rgb = parseInt(backgroundColor.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = rgb & 0xff;

    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    return luminance > 186 ? '#000000' : '#ffffff';
  };

  renderLists();
});