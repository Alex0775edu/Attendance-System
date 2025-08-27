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
        // Replace with your Firebase configuration
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
                    // Google sign-in successful
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
                    // Signed in
                    currentUser = userCredential.user;
                    closeLoginModal();
                    loadUserData();
                    showNotification('Logged in successfully!');
                })
                .catch((error) => {
                    // If login fails, try to create account instead
                    signup();
                });
        }

        function signup() {
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Signed up
                    currentUser = userCredential.user;
                    closeLoginModal();
                    
                    // Initialize empty data for new user
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
            
            // Save data to Firebase Realtime Database
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
            
            // Load data from Firebase Realtime Database
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
            
            // Set current date and time
            setCurrentDateTime();
            
            // Set up authentication state observer
            auth.onAuthStateChanged((user) => {
                if (user) {
                    // User is signed in
                    currentUser = user;
                    closeLoginModal();
                    loadUserData();
                    updateConnectionStatus();
                } else {
                    // No user is signed in
                    currentUser = null;
                    showLoginModal();
                    updateConnectionStatus();
                }
            });
            
            // Add Google Sign-In button listener
            document.getElementById('google-signin-button').addEventListener('click', signInWithGoogle);
            
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

        // ========== ATTENDANCE MANAGEMENT ==========
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
            // Set default to current date
            selectRange('day');
        }
        
        function closeExportModal() {
            document.getElementById('export-modal').style.display = 'none';
        }
        
        function selectRange(rangeType) {
            // Remove active class from all options
            document.querySelectorAll('.range-option').forEach(option => {
                option.classList.remove('active');
            });
            
            // Add active class to clicked option
            event.currentTarget.classList.add('active');
            
            // Calculate dates based on selection
            const today = new Date();
            let startDate, endDate;
            
            switch(rangeType) {
                case 'day':
                    startDate = today;
                    endDate = today;
                    break;
                case 'week':
                    // Get the first day of the week (Sunday)
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - today.getDay());
                    endDate = new Date(today);
                    endDate.setDate(today.getDate() + (6 - today.getDay()));
                    break;
                case 'month':
                    // Get the first day of the month
                    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    // Get the last day of the month
                    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    break;
                case 'year':
                    // Get the first day of the year
                    startDate = new Date(today.getFullYear(), 0, 1);
                    // Get the last day of the year
                    endDate = new Date(today.getFullYear(), 11, 31);
                    break;
            }
            
            // Update date inputs
            document.getElementById('start-date').value = formatDate(startDate);
            document.getElementById('end-date').value = formatDate(endDate);
            
            exportRange = rangeType;
        }
        
        function selectExportFormat(format) {
            // Remove active class from all options
            document.querySelectorAll('.option-card').forEach(option => {
                option.classList.remove('active');
            });
            
            // Add active class to clicked option
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
            
            // Get all dates in the range
            const dateArray = getDatesInRange(startDate, endDate);
            
            // Collect all attendance data for the date range
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
            
            // Export based on selected format
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
            // Prepare data for Excel export
            const excelData = attendanceData.map(record => ({
                'Date': record.date,
                'Roll No': record.rollNo,
                'Student Name': record.name,
                'Morning': record.morning,
                'Morning Time': record.morningTime,
                'Evening': record.evening,
                'Evening Time': record.eveningTime
            }));
            
            // Create worksheet
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            
            // Create workbook
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
            
            // Generate Excel file
            XLSX.writeFile(workbook, `attendance_${startDate}_to_${endDate}.xlsx`);
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
   

 // Listen for online/offline events
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


    function importStudents() {
      const importData = document.getElementById('import-data').value.trim();
      if (!importData) {
        alert('Please enter data to import.');
        return;
      }
      
      const lines = importData.split('\n');
      let importedCount = 0;
      
      lines.forEach(line => {
        const [rollNo, ...nameParts] = line.split(',');
        if (rollNo && nameParts.length > 0) {
          const name = nameParts.join(',').trim();
          if (!students.some(s => s.rollNo === rollNo.trim())) {
            students.push({rollNo: rollNo.trim(), name});
            importedCount++;
          }
        }
      });
      
      if (importedCount > 0) {
        saveUserData();
        renderStudents();
        renderAttendance();
        updateStats();
        showNotification(`Imported ${importedCount} students successfully!`);
        closeImportModal();
      } else {
        alert('No new students were imported. Check your data format or if students already exist.');
      }
    }
    

        // Initialize the app on page load
        window.onload = init;