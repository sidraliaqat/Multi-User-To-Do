(function() {
  'use strict';

  const taskInput = document.getElementById('taskInput');
  const taskUserSelect = document.getElementById('taskUserSelect');
  const addBtn = document.getElementById('addBtn');
  const taskList = document.getElementById('taskList');
  const pendingCountEl = document.getElementById('pendingCount');
  const completedCountEl = document.getElementById('completedCount');
  const taskCountEl = document.getElementById('taskCount');
  const clearCompletedBtn = document.getElementById('clearCompletedBtn');

  const userInput = document.getElementById('userInput');
  const addUserBtn = document.getElementById('addUserBtn');
  const resetUsersBtn = document.getElementById('resetUsersBtn');
  const userChips = document.getElementById('userChips');
  const filterBar = document.getElementById('filterBar');
  const totalUsersCountEl = document.getElementById('totalUsersCount');

  let tasks = [];
  let users = [];
  let currentFilter = 'all';

  function isValidName(name) {
    const trimmed = name.trim();
    if (!trimmed) {
      return { valid: false, message: 'Name cannot be empty.' };
    }
    if (trimmed.length < 2) {
      return { valid: false, message: 'Name must be at least 2 characters long.' };
    }
    if (trimmed.length > 20) {
      return { valid: false, message: 'Name cannot exceed 20 characters.' };
    }
    if (/\d/.test(trimmed)) {
      return { valid: false, message: 'Name cannot contain numbers (0-9).' };
    }
    if (!/^[a-zA-Z\s]+$/.test(trimmed)) {
      return { valid: false, message: 'Name can only contain letters and spaces. No numbers or special characters.' };
    }
    if (/\s{2,}/.test(trimmed)) {
      return { valid: false, message: 'Name cannot have multiple consecutive spaces.' };
    }
    return { valid: true, message: '' };
  }

  function isValidTask(text) {
    const trimmed = text.trim();
    if (!trimmed) {
      return { valid: false, message: 'Task cannot be empty.' };
    }
    if (/^[0-9]/.test(trimmed)) {
      return { valid: false, message: 'Task cannot start with a number.' };
    }
    if (!/^[a-zA-Z0-9\s,.!?\-_()]+$/.test(trimmed)) {
      return { valid: false, message: 'Task contains invalid special characters.' };
    }
    return { valid: true, message: '' };
  }

  function generateId() { return Date.now() + Math.random() * 10000; }

  function loadData() {
    try {
      const storedTasks = localStorage.getItem('taskflow_tasks');
      tasks = storedTasks ? JSON.parse(storedTasks) : [];
      const storedUsers = localStorage.getItem('taskflow_users');
      users = storedUsers ? JSON.parse(storedUsers) : [];
      tasks = tasks.filter(t => t && typeof t === 'object')
                   .map(t => ({ ...t, user: t.user || '' }));
      if (!Array.isArray(users)) users = [];
      updateTotalUsers();
    } catch { 
      tasks = []; 
      users = [];
      updateTotalUsers();
    }
  }

  function saveTasks() { localStorage.setItem('taskflow_tasks', JSON.stringify(tasks)); }
  function saveUsers() { localStorage.setItem('taskflow_users', JSON.stringify(users)); }

  function updateTotalUsers() {
    if (totalUsersCountEl) {
      totalUsersCountEl.textContent = users.length;
    }
  }

  function renderUsers() {
    userChips.innerHTML = '';
    if (users.length === 0) {
      const msg = document.createElement('span');
      msg.className = 'empty-users-msg';
      msg.textContent = 'No users yet. Add one above.';
      userChips.appendChild(msg);
    } else {
      users.forEach(u => {
        const chip = document.createElement('span');
        chip.className = `user-chip ${currentFilter === u ? 'active' : ''}`;
        chip.innerHTML = `${u} <button class="remove-user" data-user="${u}"><i class="fas fa-times"></i></button>`;
        chip.addEventListener('click', (e) => {
          if (e.target.closest('.remove-user')) return;
          setFilter(u);
        });
        userChips.appendChild(chip);
      });
    }

    const existingFilterBtns = filterBar.querySelectorAll('.filter-btn:not([data-filter="all"])');
    existingFilterBtns.forEach(b => b.remove());

    if (users.length > 0) {
      users.forEach(u => {
        const btn = document.createElement('button');
        btn.className = `filter-btn ${currentFilter === u ? 'active' : ''}`;
        btn.dataset.filter = u;
        btn.textContent = u;
        btn.addEventListener('click', () => setFilter(u));
        filterBar.appendChild(btn);
      });
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('disabled'));
    } else {
      document.querySelectorAll('.filter-btn:not([data-filter="all"])').forEach(b => b.classList.add('disabled'));
      if (currentFilter !== 'all') setFilter('all');
    }

    const allBtn = filterBar.querySelector('[data-filter="all"]');
    if (allBtn) allBtn.classList.toggle('active', currentFilter === 'all');

    taskUserSelect.innerHTML = '<option value="">— assign to —</option>';
    users.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u;
      opt.textContent = u;
      taskUserSelect.appendChild(opt);
    });
    
    if (users.length > 0 && currentFilter !== 'all' && users.includes(currentFilter)) {
      taskUserSelect.value = currentFilter;
    } else {
      taskUserSelect.value = '';
    }
    
    addBtn.disabled = (users.length === 0);
    taskUserSelect.disabled = (users.length === 0);

    document.querySelectorAll('.user-chip .remove-user').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const user = this.dataset.user;
        if (users.length <= 1) { alert('Need at least one user.'); return; }
        users = users.filter(u => u !== user);
        if (currentFilter === user) setFilter('all');
        saveUsers();
        renderUsers();
        render();
      });
    });

    updateTotalUsers();
  }

  function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.user-chip').forEach(chip => {
      const userName = chip.textContent.replace('×', '').trim();
      chip.classList.toggle('active', userName === filter);
    });
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    render();
  }

  function render() {
    taskList.innerHTML = '';

    let filtered = tasks;
    if (currentFilter !== 'all') {
      filtered = tasks.filter(t => t.user === currentFilter);
    }

    filtered.sort((a, b) => {
      if (a.completed === b.completed) return 0;
      return a.completed ? 1 : -1;
    });

    if (filtered.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      let msg = 'No tasks yet.';
      if (currentFilter !== 'all') msg = `No tasks for ${currentFilter}.`;
      else if (users.length === 0) msg = 'Add a user and create tasks!';
      empty.innerHTML = `<i class="fas fa-clipboard-list"></i><p>${msg}</p>`;
      taskList.appendChild(empty);
    } else {
      filtered.forEach(task => {
        const li = document.createElement('li');
        li.className = 'task-item';
        li.dataset.id = task.id;

        const checkbox = document.createElement('div');
        checkbox.className = `checkbox ${task.completed ? 'completed' : ''}`;
        checkbox.innerHTML = task.completed ? '<i class="fas fa-check"></i>' : '';
        checkbox.addEventListener('click', () => toggleTask(task.id));

        const textSpan = document.createElement('span');
        textSpan.className = `task-text ${task.completed ? 'done' : ''}`;
        textSpan.textContent = task.text;

        const userBadge = document.createElement('span');
        userBadge.className = 'task-user';
        userBadge.textContent = task.user || 'unassigned';

        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.innerHTML = '<i class="fas fa-times"></i>';
        delBtn.addEventListener('click', () => deleteTask(task.id));

        li.appendChild(checkbox);
        li.appendChild(textSpan);
        li.appendChild(userBadge);
        li.appendChild(delBtn);
        taskList.appendChild(li);
      });
    }

    updateStats();
  }

  function updateStats() {
    let filtered = tasks;
    if (currentFilter !== 'all') filtered = tasks.filter(t => t.user === currentFilter);
    const pending = filtered.filter(t => !t.completed).length;
    const completed = filtered.filter(t => t.completed).length;
    pendingCountEl.textContent = pending;
    completedCountEl.textContent = completed;
    taskCountEl.textContent = `${filtered.length} task${filtered.length !== 1 ? 's' : ''}`;
  }

  function addTask(text, user) {
    const validation = isValidTask(text);
    if (!validation.valid) {
      alert(validation.message);
      return false;
    }
    if (!user) { 
      alert('Please assign a user.'); 
      return false; 
    }
    if (!users.includes(user)) { 
      alert('User does not exist.'); 
      return false; 
    }

    const safeText = text.trim().replace(/[<>]/g, '');
    tasks.push({
      id: generateId(),
      text: safeText,
      completed: false,
      user: user
    });
    saveTasks();
    render();
    taskInput.value = '';
    taskInput.focus();
    return true;
  }

  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
  }

  function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      saveTasks();
      render();
    }
  }

  function clearCompleted() {
    const hasCompleted = tasks.some(t => t.completed);
    if (!hasCompleted) return;
    if (confirm('Delete all completed tasks?')) {
      tasks = tasks.filter(t => !t.completed);
      saveTasks();
      render();
    }
  }

  function addUser(name) {
    const validation = isValidName(name);
    if (!validation.valid) {
      alert(validation.message);
      return false;
    }
    const trimmed = name.trim();
    if (users.includes(trimmed)) { 
      alert('User already exists.'); 
      return false; 
    }
    users.push(trimmed);
    saveUsers();
    renderUsers();
    render();
    userInput.value = '';
    userInput.focus();
    addBtn.disabled = false;
    taskUserSelect.disabled = false;
    updateTotalUsers();
    return true;
  }

  function resetUsers() {
    if (confirm('Reset will remove ALL users and tasks, and create default user "Sidra". Continue?')) {
      users = [];
      tasks = [];
      saveUsers();
      saveTasks();
      users = ['Sidra'];
      saveUsers();
      currentFilter = 'all';
      renderUsers();
      render();
      taskInput.value = '';
      addBtn.disabled = false;
      taskUserSelect.disabled = false;
      setFilter('all');
      updateTotalUsers();
    }
  }

  addBtn.addEventListener('click', () => {
    const user = taskUserSelect.value;
    addTask(taskInput.value, user);
  });

  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const user = taskUserSelect.value;
      addTask(taskInput.value, user);
    }
  });

  clearCompletedBtn.addEventListener('click', clearCompleted);

  document.querySelector('[data-filter="all"]')?.addEventListener('click', () => setFilter('all'));

  addUserBtn.addEventListener('click', () => addUser(userInput.value));
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addUser(userInput.value); }
  });
  resetUsersBtn.addEventListener('click', resetUsers);

  loadData();
  renderUsers();
  render();
  setFilter('all');
  updateTotalUsers();
  
  if (users.length === 0) {
    addBtn.disabled = true;
    taskUserSelect.disabled = true;
  }
  taskInput.focus();

})();