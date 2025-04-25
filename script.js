document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const taskInput = document.getElementById('taskInput');
    const prioritySelect = document.getElementById('prioritySelect');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const themeToggle = document.getElementById('themeToggle');
    const calendarToggle = document.getElementById('calendarToggle');
    const calendarPopup = document.getElementById('calendarPopup');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const currentMonthSpan = document.getElementById('currentMonth');
    const calendarGrid = document.getElementById('calendarGrid');
    const taskLists = {
        high: document.getElementById('highTasks'),
        medium: document.getElementById('mediumTasks'),
        low: document.getElementById('lowTasks'),
        completed: document.getElementById('completedTasks')
    };

    // Add Sticky Notes Elements
    const addNoteBtn = document.getElementById('addNoteBtn');
    const stickyNotesContainer = document.getElementById('stickyNotesContainer');

    // Create overlay element
    const overlay = document.createElement('div');
    overlay.className = 'calendar-overlay';
    document.body.appendChild(overlay);

    // State
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let notes = JSON.parse(localStorage.getItem('sticky_notes')) || [];
    let currentTab = 'all';
    let isDarkTheme = localStorage.getItem('theme') === 'dark';
    let currentDate = new Date();
    let selectedDate = new Date();
    let isCalendarOpen = false;

    // Initialize the app
    function init() {
        setTheme(isDarkTheme);
        renderCalendar();
        renderTasks();
        renderNotes();
        setupEventListeners();
    }

    // Event Listeners
    function setupEventListeners() {
        addTaskBtn.addEventListener('click', addTask);
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTask();
        });

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                currentTab = button.dataset.tab;
                updateActiveTab();
                renderTasks();
            });
        });

        themeToggle.addEventListener('click', toggleTheme);
        
        // Calendar toggle
        if (calendarToggle) {
            calendarToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleCalendar();
            });
        }

        // Calendar navigation
        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                currentDate.setMonth(currentDate.getMonth() - 1);
                renderCalendar();
            });
        }
        
        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                currentDate.setMonth(currentDate.getMonth() + 1);
                renderCalendar();
            });
        }

        // Close calendar when clicking outside
        document.addEventListener('click', (e) => {
            if (isCalendarOpen && !calendarPopup.contains(e.target) && !calendarToggle.contains(e.target)) {
                closeCalendar();
            }
        });

        // Close calendar on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isCalendarOpen) {
                closeCalendar();
            }
        });

        // Sticky Notes Event Listeners
        if (addNoteBtn) {
            addNoteBtn.addEventListener('click', addNewNote);
        }
    }

    // Theme handling
    function setTheme(isDark) {
        document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
        themeToggle.innerHTML = `<i class="fas ${isDark ? 'fa-sun' : 'fa-moon'}"></i>`;
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    function toggleTheme() {
        isDarkTheme = !isDarkTheme;
        setTheme(isDarkTheme);
    }

    // Add new task
    function addTask() {
        const taskText = taskInput.value.trim();
        if (!taskText) return;

        const newTask = {
            id: Date.now(),
            text: taskText,
            priority: prioritySelect.value,
            completed: false,
            createdAt: new Date()
        };

        tasks.push(newTask);
        saveTasks();
        renderTasks();
        taskInput.value = '';
    }

    // Toggle task completion
    function toggleTaskCompletion(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            if (task.completed) {
                task.completedAt = new Date().toISOString();
                selectedDate = new Date(); // Set selected date to today when completing a task
            } else {
                delete task.completedAt;
            }
            saveTasks();
            renderCalendar();
            if (currentTab === 'completed') {
                updateCompletedTasksList();
            } else {
                renderTasks();
            }
        }
    }

    // Delete task
    function deleteTask(taskId) {
        tasks = tasks.filter(t => t.id !== taskId);
        saveTasks();
        renderTasks();
    }

    // Update active tab
    function updateActiveTab() {
        tabButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.tab === currentTab);
        });
    }

    // Render tasks based on current tab
    function renderTasks() {
        // Clear all lists
        Object.values(taskLists).forEach(list => {
            list.innerHTML = '';
        });

        if (currentTab === 'completed') {
            updateCompletedTasksList();
            return;
        }

        // Filter tasks based on current tab
        let filteredTasks = tasks;
        if (currentTab !== 'all') {
            filteredTasks = tasks.filter(task => 
                task.priority === currentTab && !task.completed
            );
        }

        // Render tasks
        filteredTasks.forEach(task => {
            if (!task.completed || currentTab === 'all') {
                const taskElement = createTaskElement(task);
                const targetList = task.completed ? taskLists.completed : taskLists[task.priority];
                targetList.appendChild(taskElement);
            }
        });

        // Show/hide task categories
        document.querySelectorAll('.task-category').forEach(category => {
            if (currentTab === 'all') {
                category.style.display = 'block';
            } else if (currentTab === 'completed') {
                category.style.display = category.id === 'completed-tasks' ? 'block' : 'none';
            } else {
                category.style.display = category.id === `${currentTab}-priority` ? 'block' : 'none';
            }
        });
    }

    // Create task element
    function createTaskElement(task) {
        const li = document.createElement('li');
        li.className = `task-item ${task.priority} ${task.completed ? 'completed' : ''}`;
        li.dataset.id = task.id;

        const taskContent = document.createElement('div');
        taskContent.className = 'task-content';
        taskContent.textContent = task.text;

        const taskActions = document.createElement('div');
        taskActions.className = 'task-actions';

        const completeBtn = document.createElement('button');
        completeBtn.innerHTML = `<i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i>`;
        completeBtn.title = task.completed ? 'Undo' : 'Complete';
        completeBtn.addEventListener('click', () => toggleTaskCompletion(task.id));

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Delete';
        deleteBtn.addEventListener('click', () => deleteTask(task.id));

        taskActions.appendChild(completeBtn);
        taskActions.appendChild(deleteBtn);

        li.appendChild(taskContent);
        li.appendChild(taskActions);

        if (task.completed) {
            const taskDate = document.createElement('div');
            taskDate.className = 'task-date';
            taskDate.textContent = `Completed on: ${new Date(task.completedAt).toLocaleDateString()}`;
            li.appendChild(taskDate);
        }

        return li;
    }

    // Save tasks to localStorage
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    // Calendar functions
    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Update month display
        currentMonthSpan.textContent = `${currentDate.toLocaleString('default', { month: 'long' })} ${year}`;
        
        // Get first day of month and total days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const totalDays = lastDay.getDate();
        const startingDay = firstDay.getDay();
        
        // Clear calendar
        calendarGrid.innerHTML = '';
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDay; i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day other-month';
            calendarGrid.appendChild(dayElement);
        }
        
        // Add days of the month
        for (let day = 1; day <= totalDays; day++) {
            const date = new Date(year, month, day);
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;
            
            // Check if this day has completed tasks
            const hasTasks = tasks.some(task => {
                if (!task.completed || !task.completedAt) return false;
                const taskDate = new Date(task.completedAt);
                return taskDate.toDateString() === date.toDateString();
            });
            
            if (hasTasks) {
                dayElement.classList.add('has-tasks');
            }
            
            // Highlight today
            if (date.toDateString() === new Date().toDateString()) {
                dayElement.classList.add('today');
            }

            // Highlight selected date
            if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
                dayElement.classList.add('selected');
            }

            // Add direct click handler
            dayElement.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Day clicked:', date);
                selectDate(date);
            });
            
            calendarGrid.appendChild(dayElement);
        }

        // Add empty cells for remaining days to complete the grid
        const remainingDays = 42 - (startingDay + totalDays); // 42 = 6 rows × 7 days
        for (let i = 0; i < remainingDays; i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day other-month';
            calendarGrid.appendChild(dayElement);
        }
    }

    // New function to handle date selection
    function selectDate(date) {
        console.log('Selecting date:', date);
        selectedDate = new Date(date);

        // Update calendar UI
        const allDays = document.querySelectorAll('.calendar-day');
        allDays.forEach(day => {
            day.classList.remove('selected');
            if (!day.classList.contains('other-month')) {
                const dayNum = parseInt(day.textContent);
                if (!isNaN(dayNum)) {
                    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
                    if (dayDate.toDateString() === selectedDate.toDateString()) {
                        day.classList.add('selected');
                    }
                }
            }
        });

        // Update tasks list
        updateCompletedTasksList();
    }

    // Update completed tasks list based on selected date
    function updateCompletedTasksList() {
        console.log('Updating tasks list for date:', selectedDate);
        const completedTasksList = document.getElementById('completedTasks');
        if (!completedTasksList || !selectedDate) return;
        
        completedTasksList.innerHTML = '';

        // Update the header text
        const completedHeader = document.querySelector('.completed-tasks-container h3');
        if (completedHeader) {
            const isToday = selectedDate.toDateString() === new Date().toDateString();
            completedHeader.textContent = isToday ? 'Tasks Completed Today' : `Tasks Completed on ${selectedDate.toLocaleDateString()}`;
        }

        // Filter tasks completed on selected date
        const completedTasks = tasks.filter(task => {
            if (!task.completed || !task.completedAt) return false;
            const taskDate = new Date(task.completedAt);
            return taskDate.toDateString() === selectedDate.toDateString();
        });

        console.log('Found completed tasks:', completedTasks.length);

        if (completedTasks.length === 0) {
            const emptyMessage = document.createElement('li');
            emptyMessage.className = 'task-item';
            emptyMessage.textContent = 'No tasks completed on this date';
            completedTasksList.appendChild(emptyMessage);
        } else {
            completedTasks.forEach(task => {
                const taskElement = createTaskElement(task);
                completedTasksList.appendChild(taskElement);
            });
        }
    }

    // Toggle calendar visibility
    function toggleCalendar() {
        if (!calendarPopup) return;
        
        if (isCalendarOpen) {
            closeCalendar();
        } else {
            openCalendar();
        }
    }

    // Open calendar
    function openCalendar() {
        if (!calendarPopup) return;
        
        isCalendarOpen = true;
        calendarPopup.style.display = 'block';
        calendarPopup.classList.add('show');
        overlay.classList.add('show');
        renderCalendar();
    }

    // Close calendar
    function closeCalendar() {
        if (!calendarPopup) return;
        
        isCalendarOpen = false;
        calendarPopup.style.display = 'none';
        calendarPopup.classList.remove('show');
        overlay.classList.remove('show');
    }

    // Sticky Notes Functions
    function addNewNote() {
        const note = {
            id: Date.now(),
            content: '',
            createdAt: new Date().toISOString()
        };
        
        notes.unshift(note); // Add to beginning of array
        saveNotes();
        renderNotes();

        // Focus on the newly added note
        setTimeout(() => {
            const newNoteElement = document.querySelector(`[data-note-id="${note.id}"]`);
            if (newNoteElement) {
                const textarea = newNoteElement.querySelector('textarea');
                textarea.focus();
            }
        }, 0);
    }

    function updateNote(noteId, content) {
        const note = notes.find(n => n.id === noteId);
        if (note) {
            note.content = content;
            note.updatedAt = new Date().toISOString();
            saveNotes();
        }
    }

    function deleteNote(noteId) {
        notes = notes.filter(note => note.id !== noteId);
        saveNotes();
        renderNotes();
    }

    function renderNotes() {
        if (!stickyNotesContainer) return;
        
        stickyNotesContainer.innerHTML = '';
        
        notes.forEach(note => {
            const noteElement = createNoteElement(note);
            stickyNotesContainer.appendChild(noteElement);
        });
    }

    function createNoteElement(note) {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'sticky-note';
        noteDiv.dataset.noteId = note.id;

        const textarea = document.createElement('textarea');
        textarea.value = note.content;
        textarea.placeholder = 'Write your note here...';
        textarea.spellcheck = false;

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'sticky-note-actions';

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Delete Note';
        deleteBtn.addEventListener('click', () => deleteNote(note.id));

        actionsDiv.appendChild(deleteBtn);
        noteDiv.appendChild(textarea);
        noteDiv.appendChild(actionsDiv);

        // Auto-save on input
        let saveTimeout;
        textarea.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                updateNote(note.id, textarea.value);
            }, 500);
        });

        // Auto-resize textarea
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });

        return noteDiv;
    }

    function saveNotes() {
        localStorage.setItem('sticky_notes', JSON.stringify(notes));
    }

    // Initialize the app
    init();
}); 