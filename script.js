 
// ========== PWA FUNCTIONALITY ==========
        // Register service worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
                navigator.serviceWorker.register('sw.js')
                    .then(function(registration) {
                        console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    })
                    .catch(function(error) {
                        console.log('ServiceWorker registration failed: ', error);
                    });
            });
        }

        // Handle PWA install prompt
        let deferredPrompt;
        const installButton = document.getElementById('pwa-install-btn');

        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later
            deferredPrompt = e;
            // Show the install button
            installButton.style.display = 'flex';
            
            installButton.addEventListener('click', (e) => {
                // Hide the install button
                installButton.style.display = 'none';
                // Show the install prompt
                deferredPrompt.prompt();
                // Wait for the user to respond to the prompt
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                    } else {
                        console.log('User dismissed the install prompt');
                    }
                    deferredPrompt = null;
                });
            });
        });

        window.addEventListener('appinstalled', (evt) => {
            // Log the install event
            console.log('PWA was installed');
            installButton.style.display = 'none';
        });

        // ========== GLOBAL VARIABLES ==========
        let students = [];
        let attendance = {};
        let currentDate = new Date();
        let systemTitle = 'Attendance System - AaDiTeCh';
        let exportFormat = 'excel';
        let exportRange = 'day';
        let isOnline = true;
        let currentUser = null;

        // ========== FIREBASE CONFIGURATION ==========
        const firebaseConfig = {
          apiKey: "AIzaSyCCr4oeqoUb-343RgchKbfQllT5aFGhI4M",
          authDomain: "attendance-aaditech.firebaseapp.com",
          databaseURL: "https://attendance-aaditech-default-rtdb.firebaseio.com",
          projectId: "attendance-aaditech",
          storageBucket: "attendance-aaditech.firebasestorage.app",
          messagingSenderId: "784396610079",
          appId: "1:784396610079:web:51aa4ba500d41bc6e6c32a",
          measurementId: "G-CHP37HGJ7S"
        };

        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const database = firebase.database();
        const googleProvider = new firebase.auth.GoogleAuthProvider();

        // ========== AUTHENTICATION FUNCTIONS ==========
        function showLoginModal() {
            document.getElementById('login-modal').style.display = 'flex';
        }

        function closeLoginModal() {
            if (currentUser) {
                document.getElementById('login-modal').style.display = 'none';
            }
        }

        function signInWithGoogle() {
            auth.signInWithPopup(googleProvider)
                .then((result) => {
                    currentUser = result.user;
                    closeLoginModal();
                    loadUserData();
                    showNotification('Signed in with Google successfully!');
                })
                .catch((error) => {
                    console.error("Google sign-in error:", error);
                    showNotification('Google sign-in error: ' + error.message, true);
                });
        }

        function login() {
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    currentUser = userCredential.user;
                    closeLoginModal();
                    loadUserData();
                    showNotification('Logged in successfully!');
                })
                .catch((error) => {
                   showNotification(error.message,true);
                });
        }

        function signup() {
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    currentUser = userCredential.user;
                    closeLoginModal();
                    
                    students = [];
                    attendance = {};
                    
                    saveUserData();
                    showNotification('Account created successfully!');
                    
                    renderStudents();
                    renderAttendance();
                    updateStats();
                })
                .catch((error) => {
                    showNotification('Authentication error: ' + error.message, true);
                });
        }

        function logout() {
            auth.signOut().then(() => {
                currentUser = null;
                students = [];
                attendance = {};
                renderStudents();
                renderAttendance();
                updateStats();
                showNotification('Logged out successfully!');
                updateConnectionStatus();
                showLoginModal();
            }).catch((error) => {
                showNotification('Logout error: ' + error.message, true);
            });
        }

        // ========== FIREBASE REALTIME DATABASE FUNCTIONS ==========
        function saveUserData() {
            if (!currentUser) return;
            
            const userData = {
                students: students,
                attendance: attendance,
                systemTitle: systemTitle,
                lastUpdated: Date.now()
            };
            
            database.ref('users/' + currentUser.uid).set(userData)
                .then(() => {
                    showNotification('Data saved to Firebase!');
                })
                .catch((error) => {
                    showNotification('Error saving to Firebase: ' + error.message, true);
                });
        }

        function loadUserData() {
            if (!currentUser) return;
            
            database.ref('users/' + currentUser.uid).once('value')
                .then((snapshot) => {
                    const userData = snapshot.val();
                    
                    if (userData) {
                        if (userData.students) {
                            students = userData.students;
                            renderStudents();
                        }
                        
                        if (userData.attendance) {
                            attendance = userData.attendance;
                            renderAttendance();
                            updateStats();
                        }
                        
                        if (userData.systemTitle) {
                            systemTitle = userData.systemTitle;
                            document.getElementById('header-title').textContent = systemTitle;
                        }
                        
                        showNotification('Data loaded from Firebase for ' + currentUser.email);
                    } else {
                        showNotification('No data found for this user. Starting fresh.');
                    }
                })
                .catch((error) => {
                    showNotification('Error loading from Firebase: ' + error.message, true);
                });
        }

        function syncWithFirebase() {
            if (currentUser) {
                saveUserData();
                showNotification('Data synced with Firebase for ' + currentUser.email);
            } else {
                showLoginModal();
            }
        }

        // ========== INITIALIZATION ==========
        function init() {
            document.getElementById('header-title').textContent = systemTitle;
            
            setCurrentDateTime();
            
            auth.onAuthStateChanged((user) => {
                if (user) {
                    currentUser = user;
                    closeLoginModal();
                    loadUserData();
                    updateConnectionStatus();
                } else {
                    currentUser = null;
                    showLoginModal();
                    updateConnectionStatus();
                }
            });
            
            document.getElementById('google-signin-button').addEventListener('click', signInWithGoogle);
            
            // Add event listener for search input (Enter key)
            document.getElementById('student-search').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    searchStudents();
                }
            });
            
            // Add event listener for attendance search input (Enter key)
            document.getElementById('attendance-search').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    searchAttendance();
                }
            });
            
            renderStudents();
            renderAttendance();
            updateStats();
        }

        // ========== UI FUNCTIONS ==========
        function updateConnectionStatus() {
            const statusElement = document.getElementById('connection-status');
            
            if (currentUser) {
                statusElement.innerHTML = `<i class="fas fa-user"></i> <span>${currentUser.email}</span> | <i class="fas fa-wifi"></i> <span>Online</span>`;
                statusElement.className = 'connection-status online';
            } else {
                statusElement.innerHTML = '<i class="fas fa-wifi"></i> <span>Online - Not Signed In</span>';
                statusElement.className = 'connection-status online';
            }
            
            statusElement.style.display = 'flex';
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 3000);
        }

        function setCurrentDateTime() {
            const now = new Date();
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            
            document.getElementById('attendance-date').value = `${year}-${month}-${day}`;
            document.getElementById('attendance-time').value = `${hours}:${minutes}`;
        }

        // ========== STUDENT MANAGEMENT ==========
        function renderStudents() {
            const container = document.getElementById('students-container');
            container.innerHTML = '';
            
            if (students.length === 0) {
                container.innerHTML = '<tr><td colspan="3" style="text-align: center;">No students added yet. Use the form above to add students.</td></tr>';
                document.getElementById('total-students').textContent = '0';
                return;
            }
            
            students.sort((a, b) => a.rollNo.localeCompare(b.rollNo, undefined, {numeric: true, sensitivity: 'base'}));
            
            students.forEach((student, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${student.rollNo}</td>
                    <td>${student.name}</td>
                    <td>
                        <button onclick="removeStudent(${index})">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                    </td>
                `;
                container.appendChild(tr);
            });
            
            document.getElementById('total-students').textContent = students.length;
        }
        
        function addStudent() {
            if (!currentUser) {
                showNotification('Please login first', true);
                showLoginModal();
                return;
            }
            
            const rollInput = document.getElementById('roll-number');
            const nameInput = document.getElementById('new-student');
            const rollNo = rollInput.value.trim();
            const name = nameInput.value.trim();
            
            if (rollNo && name && !students.some(s => s.rollNo === rollNo)) {
                students.push({rollNo, name});
                saveUserData();
                renderStudents();
                renderAttendance();
                updateStats();
                rollInput.value = '';
                nameInput.value = '';
                showNotification('Student added successfully!');
            } else if (students.some(s => s.rollNo === rollNo)) {
                showNotification('This roll number is already in the list.', true);
            } else {
                showNotification('Please enter both roll number and name.', true);
            }
        }
        
        function removeStudent(index) {
            if (confirm('Are you sure you want to remove this student?')) {
                students.splice(index, 1);
                saveUserData();
                renderStudents();
                renderAttendance();
                updateStats();
                showNotification('Student removed successfully!');
            }
        }

        // ========== SEARCH FUNCTIONALITY ==========
        function searchStudents() {
            const searchTerm = document.getElementById('student-search').value.toLowerCase().trim();
            
            if (!searchTerm) {
                renderStudents();
                return;
            }
            
            const filteredStudents = students.filter(student => 
                student.rollNo.toLowerCase().includes(searchTerm) || 
                student.name.toLowerCase().includes(searchTerm)
            );
            
            const container = document.getElementById('students-container');
            container.innerHTML = '';
            
            if (filteredStudents.length === 0) {
                container.innerHTML = '<tr><td colspan="3" style="text-align: center;">No students found matching your search.</td></tr>';
                return;
            }
            
            filteredStudents.forEach((student, index) => {
                const originalIndex = students.findIndex(s => s.rollNo === student.rollNo);
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${student.rollNo}</td>
                    <td>${student.name}</td>
                    <td>
                        <button onclick="removeStudent(${originalIndex})">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                    </td>
                `;
                container.appendChild(tr);
            });
            
            showNotification(`Found ${filteredStudents.length} student(s) matching your search`);
        }
        
        function searchAttendance() {
            const searchTerm = document.getElementById('attendance-search').value.toLowerCase().trim();
            const dateKey = document.getElementById('attendance-date').value;
            
            if (!searchTerm) {
                renderAttendance();
                return;
            }
            
            const container = document.getElementById('attendance-body');
            container.innerHTML = '';
            
            if (students.length === 0) {
                container.innerHTML = '<tr><td colspan="5" style="text-align: center;">Add students first to mark attendance</td></tr>';
                return;
            }
            
            const filteredStudents = students.filter(student => 
                student.rollNo.toLowerCase().includes(searchTerm) || 
                student.name.toLowerCase().includes(searchTerm)
            );
            
            if (filteredStudents.length === 0) {
                container.innerHTML = '<tr><td colspan="5" style="text-align: center;">No students found matching your search.</td></tr>';
                return;
            }
            
            filteredStudents.forEach((student, index) => {
                const studentAttendance = attendance[dateKey] && attendance[dateKey][student.rollNo] ? 
                    attendance[dateKey][student.rollNo] : {morning: null, evening: null};
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${student.rollNo}</td>
                    <td>${student.name}</td>
                    <td style="text-align: center; background-color: ${getStatusColor(studentAttendance.morning)}">
                        ${getStatusText(studentAttendance.morning)}
                        ${studentAttendance.morningTime ? `<div class="time-display">${studentAttendance.morningTime}</div>` : ''}
                    </td>
                    <td style="text-align: center; background-color: ${getStatusColor(studentAttendance.evening)}">
                        ${getStatusText(studentAttendance.evening)}
                        ${studentAttendance.eveningTime ? `<div class="time-display">${studentAttendance.eveningTime}</div>` : ''}
                    </td>
                    <td class="attendance-actions">
                        <button class="attendance-btn present" onclick="markAttendance(${students.findIndex(s => s.rollNo === student.rollNo)}, 'morning', 'present')">
                            <i class="fas fa-check"></i> P
                        </button>
                        <button class="attendance-btn absent" onclick="markAttendance(${students.findIndex(s => s.rollNo === student.rollNo)}, 'morning', 'absent')">
                            <i class="fas fa-times"></i> A
                        </button>
                        <button class="attendance-btn late" onclick="markAttendance(${students.findIndex(s => s.rollNo === student.rollNo)}, 'morning', 'late')">
                            <i class="fas fa-clock"></i> L
                        </button>
                        <button class="attendance-btn present" onclick="markAttendance(${students.findIndex(s => s.rollNo === student.rollNo)}, 'evening', 'present')">
                            <i class="fas fa-check"></i> P
                        </button>
                        <button class="attendance-btn absent" onclick="markAttendance(${students.findIndex(s => s.rollNo === student.rollNo)}, 'evening', 'absent')">
                            <i class="fas fa-times"></i> A
                        </button>
                        <button class="attendance-btn late" onclick="markAttendance(${students.findIndex(s => s.rollNo === student.rollNo)}, 'evening', 'late')">
                            <i class="fas fa-clock"></i> L
                        </button>
                    </td>
                `;
                container.appendChild(tr);
            });
            
            showNotification(`Found ${filteredStudents.length} student(s) matching your search`);
        }

        // ========== ATTENDANCE MANAGEMENT ==========
        function loadAttendanceForDate() {
            renderAttendance();
            updateStats();
            showNotification('Attendance loaded for selected date');
        }
        
        function renderAttendance() {
            const container = document.getElementById('attendance-body');
            container.innerHTML = '';
            
            if (students.length === 0) {
                container.innerHTML = '<tr><td colspan="5" style="text-align: center;">Add students first to mark attendance</td></tr>';
                return;
            }
            
            const dateKey = document.getElementById('attendance-date').value;
            
            students.forEach((student, index) => {
                const tr = document.createElement('tr');
                
                const studentAttendance = attendance[dateKey] && attendance[dateKey][student.rollNo] ? 
                    attendance[dateKey][student.rollNo] : {morning: null, evening: null};
                
                tr.innerHTML = `
                    <td>${student.rollNo}</td>
                    <td>${student.name}</td>
                    <td style="text-align: center; background-color: ${getStatusColor(studentAttendance.morning)}">
                        ${getStatusText(studentAttendance.morning)}
                        ${studentAttendance.morningTime ? `<div class="time-display">${studentAttendance.morningTime}</div>` : ''}
                    </td>
                    <td style="text-align: center; background-color: ${getStatusColor(studentAttendance.evening)}">
                        ${getStatusText(studentAttendance.evening)}
                        ${studentAttendance.eveningTime ? `<div class="time-display">${studentAttendance.eveningTime}</div>` : ''}
                    </td>
                    <td class="attendance-actions">
                        <button class="attendance-btn present" onclick="markAttendance(${index}, 'morning', 'present')">
                            <i class="fas fa-check"></i> P
                        </button>
                        <button class="attendance-btn absent" onclick="markAttendance(${index}, 'morning', 'absent')">
                            <i class="fas fa-times"></i> A
                        </button>
                        <button class="attendance-btn late" onclick="markAttendance(${index}, 'morning', 'late')">
                            <i class="fas fa-clock"></i> L
                        </button>
                        <button class="attendance-btn present" onclick="markAttendance(${index}, 'evening', 'present')">
                            <i class="fas fa-check"></i> P
                        </button>
                        <button class="attendance-btn absent" onclick="markAttendance(${index}, 'evening', 'absent')">
                            <i class="fas fa-times"></i> A
                        </button>
                        <button class="attendance-btn late" onclick="markAttendance(${index}, 'evening', 'late')">
                            <i class="fas fa-clock"></i> L
                        </button>
                    </td>
                `;
                container.appendChild(tr);
            });
        }
        
        function getStatusColor(status) {
            switch(status) {
                case 'present': return '#d4edda';
                case 'absent': return '#f8d7da';
                case 'late': return '#fff3cd';
                default: return 'transparent';
            }
        }
        
        function getStatusText(status) {
            switch(status) {
                case 'present': return 'P';
                case 'absent': return 'A';
                case 'late': return 'L';
                default: return '';
            }
        }
        
        function markAttendance(index, session, status) {
            if (!currentUser) {
                showNotification('Please login first', true);
                showLoginModal();
                return;
            }
            
            const dateKey = document.getElementById('attendance-date').value;
            const timeValue = document.getElementById('attendance-time').value;
            const student = students[index];
            
            if (!dateKey) {
                showNotification('Please select a date first!', true);
                return;
            }
            
            if (!attendance[dateKey]) {
                attendance[dateKey] = {};
            }
            
            if (!attendance[dateKey][student.rollNo]) {
                attendance[dateKey][student.rollNo] = {morning: null, evening: null};
            }
            
            attendance[dateKey][student.rollNo][session] = status;
            attendance[dateKey][student.rollNo][`${session}Time`] = timeValue;
            
            saveUserData();
            renderAttendance();
            updateStats();
        }
        
        function markAllPresent() {
            const session = document.getElementById('attendance-session').value;
            const timeValue = document.getElementById('attendance-time').value;
            
            if (session === 'full-day') {
                markAllStatus('morning', 'present', timeValue);
                markAllStatus('evening', 'present', timeValue);
            } else {
                markAllStatus(session, 'present', timeValue);
            }
            
            showNotification(`Marked all as present for ${session}`);
        }
        
        function markAllAbsent() {
            const session = document.getElementById('attendance-session').value;
            const timeValue = document.getElementById('attendance-time').value;
            
            if (session === 'full-day') {
                markAllStatus('morning', 'absent', timeValue);
                markAllStatus('evening', 'absent', timeValue);
            } else {
                markAllStatus(session, 'absent', timeValue);
            }
            
            showNotification(`Marked all as absent for ${session}`);
        }
        
        function markAllStatus(session, status, timeValue) {
            if (!currentUser) {
                showNotification('Please login first', true);
                showLoginModal();
                return;
            }
            
            const dateKey = document.getElementById('attendance-date').value;
            
            if (!dateKey) {
                showNotification('Please select a date first!', true);
                return;
            }
            
            if (!attendance[dateKey]) {
                attendance[dateKey] = {};
            }
            
            students.forEach(student => {
                if (!attendance[dateKey][student.rollNo]) {
                    attendance[dateKey][student.rollNo] = {morning: null, evening: null};
                }
                attendance[dateKey][student.rollNo][session] = status;
                attendance[dateKey][student.rollNo][`${session}Time`] = timeValue;
            });
            
            saveUserData();
            renderAttendance();
            updateStats();
        }
        
        function updateStats() {
            const dateKey = document.getElementById('attendance-date').value;
            let morningPresent = 0;
            let eveningPresent = 0;
            let morningLate = 0;
            let eveningLate = 0;
            let total = students.length;
            
            if (total === 0) {
                document.getElementById('total-students').textContent = '0';
                document.getElementById('morning-present').textContent = '0';
                document.getElementById('evening-present').textContent = '0';
                document.getElementById('attendance-percentage').textContent = '0%';
                return;
            }
            
            if (attendance[dateKey]) {
                students.forEach(student => {
                    if (attendance[dateKey][student.rollNo]) {
                        if (attendance[dateKey][student.rollNo].morning === 'present') morningPresent++;
                        if (attendance[dateKey][student.rollNo].evening === 'present') eveningPresent++;
                        if (attendance[dateKey][student.rollNo].morning === 'late') morningLate++;
                        if (attendance[dateKey][student.rollNo].evening === 'late') eveningLate++;
                    }
                });
            }
            
            const totalPresent = morningPresent + eveningPresent;
            const totalSessions = total * 2;
            const attendancePercentage = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0;
            
            document.getElementById('total-students').textContent = total;
            document.getElementById('morning-present').textContent = morningPresent;
            document.getElementById('evening-present').textContent = eveningPresent;
            document.getElementById('attendance-percentage').textContent = `${attendancePercentage}%`;
        }
        
        function saveAttendance() {
            saveUserData();
            showNotification('Attendance data saved to Firebase!');
        }
        
        function resetAttendance() {
            if (confirm('Are you sure you want to reset attendance for this date?')) {
                const dateKey = document.getElementById('attendance-date').value;
                if (attendance[dateKey]) {
                    delete attendance[dateKey];
                    saveUserData();
                    renderAttendance();
                    updateStats();
                    showNotification('Attendance reset for ' + dateKey);
                } else {
                    showNotification('No attendance data found for ' + dateKey);
                }
            }
        }

        // ========== EXPORT FUNCTIONALITY ==========
        function openExportModal() {
            document.getElementById('export-modal').style.display = 'flex';
            selectRange('day');
        }
        
        function closeExportModal() {
            document.getElementById('export-modal').style.display = 'none';
        }
        
        function selectRange(rangeType) {
            document.querySelectorAll('.range-option').forEach(option => {
                option.classList.remove('active');
            });
            
            event.currentTarget.classList.add('active');
            
            const today = new Date();
            let startDate, endDate;
            
            switch(rangeType) {
                case 'day':
                    startDate = today;
                    endDate = today;
                    break;
                case 'week':
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - today.getDay());
                    endDate = new Date(today);
                    endDate.setDate(today.getDate() + (6 - today.getDay()));
                    break;
                case 'month':
                    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    break;
                case 'year':
                    startDate = new Date(today.getFullYear(), 0, 1);
                    endDate = new Date(today.getFullYear(), 11, 31);
                    break;
            }
            
            document.getElementById('start-date').value = formatDate(startDate);
            document.getElementById('end-date').value = formatDate(endDate);
            
            exportRange = rangeType;
        }
        
        function selectExportFormat(format) {
            document.querySelectorAll('.option-card').forEach(option => {
                option.classList.remove('active');
            });
            
            event.currentTarget.classList.add('active');
            
            exportFormat = format;
        }
        
        function exportData() {
            const startDate = document.getElementById('start-date').value;
            const endDate = document.getElementById('end-date').value;
            
            if (!startDate || !endDate) {
                showNotification('Please select a date range.', true);
                return;
            }
            
            if (exportFormat === 'print') {
                window.print();
                closeExportModal();
                return;
            }
            
            const dateArray = getDatesInRange(startDate, endDate);
            
            let attendanceData = [];
            dateArray.forEach(date => {
                if (attendance[date]) {
                    Object.keys(attendance[date]).forEach(rollNo => {
                        const student = students.find(s => s.rollNo === rollNo);
                        if (student) {
                            attendanceData.push({
                                date: date,
                                rollNo: rollNo,
                                name: student.name,
                                morning: attendance[date][rollNo].morning || 'Not recorded',
                                morningTime: attendance[date][rollNo].morningTime || '',
                                evening: attendance[date][rollNo].evening || 'Not recorded',
                                eveningTime: attendance[date][rollNo].eveningTime || ''
                            });
                        }
                    });
                }
            });
            
            if (attendanceData.length === 0) {
                showNotification('No attendance data found for the selected date range.', true);
                return;
            }
            
            if (exportFormat === 'excel') {
                exportToExcel(attendanceData, startDate, endDate);
            } else if (exportFormat === 'csv') {
                exportToCSV(attendanceData, startDate, endDate);
            }
            
            closeExportModal();
            showNotification(`Data exported successfully for ${dateArray.length} days!`);
        }
        
        function getDatesInRange(startDate, endDate) {
            const dates = [];
            let currentDate = new Date(startDate);
            const end = new Date(endDate);
            
            while (currentDate <= end) {
                dates.push(formatDate(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            return dates;
        }
        
        function formatDate(date) {
            const d = new Date(date);
            let month = '' + (d.getMonth() + 1);
            let day = '' + d.getDate();
            const year = d.getFullYear();

            if (month.length < 2) month = '0' + month;
            if (day.length < 2) day = '0' + day;

            return [year, month, day].join('-');
        }
        
        function exportToExcel(attendanceData, startDate, endDate) {
            const excelData = attendanceData.map(record => ({
                'Date': record.date,
                'Roll No': record.rollNo,
                'Student Name': record.name,
                'Morning': record.morning,
                'Morning Time': record.morningTime,
                'Evening': record.evening,
                'Evening Time': record.eveningTime
            }));
            
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
            
            XLSX.writeFile(workbook, 'attendance_' + startDate + '_to_' + endDate + '.xlsx');
        }
        
        function exportToCSV(attendanceData, startDate, endDate) {
            let csvContent = "Date,Roll No,Student Name,Morning,Morning Time,Evening,Evening Time\n";
            
            attendanceData.forEach(record => {
                csvContent += `"${record.date}","${record.rollNo}","${record.name}","${record.morning}","${record.morningTime || ''}","${record.evening}","${record.eveningTime || ''}"\n`;
            });
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `attendance_${startDate}_to_${endDate}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        // ========== NOTIFICATION FUNCTION ==========
        function showNotification(message, isError = false) {
            const notification = document.getElementById('notification');
            notification.textContent = message;
            notification.className = 'notification';
            
            if (isError) {
                notification.classList.add('error');
            }
            
            notification.classList.add('show');
            
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }

        // ========== TITLE CHANGE FUNCTIONS ==========
        function openTitleModal() {
            document.getElementById('new-title').value = systemTitle;
            document.getElementById('title-modal').style.display = 'flex';
        }
        
        function closeTitleModal() {
            document.getElementById('title-modal').style.display = 'none';
        }
        
        function changeTitle() {
            const newTitle = document.getElementById('new-title').value.trim();
            if (newTitle) {
                systemTitle = newTitle;
                document.getElementById('header-title').textContent = systemTitle;
                saveUserData();
                closeTitleModal();
                showNotification('Title changed successfully!');
            } else {
                showNotification('Title cannot be empty!', true);
            }
        }

        // ========== LOGO CHANGE FUNCTION ==========
        function changeLogo() {
            const logoUrl = prompt("Enter the URL for your logo image:");
            if (logoUrl) {
                const logoPlaceholder = document.querySelector('.logo-placeholder');
                logoPlaceholder.innerHTML = '';
                const img = document.createElement('img');
                img.src = logoUrl;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.borderRadius = '50%';
                img.style.objectFit = 'cover';
                logoPlaceholder.appendChild(img);
                showNotification('Logo updated successfully!');
            }
        }

        // ========== STUDENT IMPORT/EXPORT ==========
        function openImportModal() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = function (evt) {
                    let importedStudents = [];
                    if (file.name.endsWith('.csv')) {
                        const lines = evt.target.result.split('\n');
                        for (let line of lines) {
                            const [rollNo, name] = line.split(',').map(x => x && x.trim());
                            if (rollNo && name && !students.some(s => s.rollNo === rollNo)) {
                                importedStudents.push({ rollNo, name });
                            }
                        }
                    } else {
                        const data = new Uint8Array(evt.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        const sheet = workbook.Sheets[workbook.SheetNames[0]];
                        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                        for (let row of json) {
                            const [rollNo, name] = row;
                            if (rollNo && name && !students.some(s => s.rollNo === rollNo)) {
                                importedStudents.push({ rollNo: String(rollNo).trim(), name: String(name).trim() });
                            }
                        }
                    }
                    if (importedStudents.length > 0) {
                        students = students.concat(importedStudents);
                        saveUserData();
                        renderStudents();
                        renderAttendance();
                        updateStats();
                        showNotification(`${importedStudents.length} students imported successfully!`);
                    } else {
                        showNotification('No valid students found to import.', true);
                    }
                };
                if (file.name.endsWith('.csv')) {
                    reader.readAsText(file);
                } else {
                    reader.readAsArrayBuffer(file);
                }
            };
            input.click();
        }

        function exportStudents() {
            if (!students.length) {
                showNotification('No students to export.', true);
                return;
            }
            let csv = 'Roll No,Student Name\n';
            students.forEach(s => {
                csv += `"${s.rollNo}","${s.name}"\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", "students.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showNotification('Students exported successfully!');
        }

        // ========== ONLINE/OFFLINE STATUS ==========
        window.addEventListener('online', () => {
            document.getElementById('connection-status').innerHTML = '<i class="fas fa-wifi"></i> <span>Online</span>';
            document.getElementById('connection-status').className = 'connection-status online';
            document.getElementById('connection-status').style.display = 'flex';
            setTimeout(() => {
                document.getElementById('connection-status').style.display = 'none';
            }, 3000);
        });
        
        window.addEventListener('offline', () => {
            document.getElementById('connection-status').innerHTML = '<i class="fas fa-wifi"></i> <span>Offline</span>';
            document.getElementById('connection-status').className = 'connection-status offline';
            document.getElementById('connection-status').style.display = 'flex';
            setTimeout(() => {
                document.getElementById('connection-status').style.display = 'none';
            }, 3000);
        });

        // Initialize the application

        window.onload = init;
