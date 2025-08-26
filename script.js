
     // ========== GLOBAL VARIABLES ==========
    let students = JSON.parse(localStorage.getItem('students')) || [];
    let attendance = JSON.parse(localStorage.getItem('attendance')) || {};
    let currentDate = new Date();
    let systemTitle = localStorage.getItem('systemTitle') || 'Attendance System - AaDiTeCh';
    let exportFormat = 'excel';
    let exportRange = 'day';
    let isOnline = true;

    // ========== FIREBASE CONFIGURATION ==========
    const firebaseConfig = {
     apiKey: "AIzaSyCCr4oeqoUb-343RgchKbfQllT5aFGhI4M",
    authDomain: "attendance-aaditech.firebaseapp.com",
    projectId: "attendance-aaditech",
    storageBucket: "attendance-aaditech.firebasestorage.app",
    messagingSenderId: "784396610079",
    appId: "1:784396610079:web:51aa4ba500d41bc6e6c32a",
    measurementId: "G-CHP37HGJ7S"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();
    const googleProvider = new firebase.auth.GoogleAuthProvider();

    // Firebase collections reference
    const studentsRef = db.collection("students");
    const attendanceRef = db.collection("attendance");

    // ========== AUTHENTICATION FUNCTIONS ==========
    function showLoginModal() {
      document.getElementById('login-modal').style.display = 'flex';
    }

    function closeLoginModal() {
      document.getElementById('login-modal').style.display = 'none';
    }

    function signInWithGoogle() {
      auth.signInWithPopup(googleProvider)
        .then((result) => {
          // Google sign-in successful
          closeLoginModal();
          showNotification('Signed in with Google successfully!');
        })
        .catch((error) => {
          console.error("Google sign-in error:", error);
          alert('Google sign-in error: ' + error.message);
        });
    }

    function login() {
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      
      auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
          // Signed in
          closeLoginModal();
          showNotification('Logged in successfully!');
        })
        .catch((error) => {
          alert('Login error: ' + error.message);
        });
    }

    function signup() {
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      
      auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
          // Signed up
          closeLoginModal();
          showNotification('Account created successfully!');
        })
        .catch((error) => {
          alert('Signup error: ' + error.message);
        });
    }

    function logout() {
      auth.signOut().then(() => {
        showNotification('Logged out successfully!');
      }).catch((error) => {
        alert('Logout error: ' + error.message);
      });
    }

    // ========== FIREBASE SYNC FUNCTIONS ==========
    function loadDataFromFirebase() {
      if (!auth.currentUser) return;
      
      // Load students from Firebase
      studentsRef.where("userId", "==", auth.currentUser.uid)
        .get()
        .then((querySnapshot) => {
          const firebaseStudents = [];
          querySnapshot.forEach((doc) => {
            firebaseStudents.push(doc.data());
          });
          
          // Merge with local data
          if (firebaseStudents.length > 0) {
            students = firebaseStudents;
            localStorage.setItem('students', JSON.stringify(students));
            renderStudents();
            showNotification('Students loaded from cloud!');
          }
        })
        .catch((error) => {
          console.log("Error getting students:", error);
        });
      
      // Load attendance from Firebase
      attendanceRef.where("userId", "==", auth.currentUser.uid)
        .get()
        .then((querySnapshot) => {
          const firebaseAttendance = {};
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            firebaseAttendance[data.date] = data.attendance;
          });
          
          // Merge with local data
          if (Object.keys(firebaseAttendance).length > 0) {
            attendance = {...attendance, ...firebaseAttendance};
            localStorage.setItem('attendance', JSON.stringify(attendance));
            renderAttendance();
            updateStats();
            showNotification('Attendance data loaded from cloud!');
          }
        })
        .catch((error) => {
          console.log("Error getting attendance:", error);
        });
    }

    function syncStudentsToFirebase() {
      if (!auth.currentUser) {
        showLoginModal();
        return;
      }
      
      const userId = auth.currentUser.uid;
      
      // First, clear existing students for this user
      studentsRef.where("userId", "==", userId)
        .get()
        .then((querySnapshot) => {
          const batch = db.batch();
          querySnapshot.forEach((doc) => {
            batch.delete(doc.ref);
          });
          
          return batch.commit();
        })
        .then(() => {
          // Now add all current students
          const batch = db.batch();
          
          students.forEach((student) => {
            const studentRef = studentsRef.doc();
            batch.set(studentRef, {
              ...student,
              userId: userId,
              syncedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          });
          
          return batch.commit();
        })
        .then(() => {
          console.log("Students synced to Firebase");
          showNotification('Students synced to cloud!');
        })
        .catch((error) => {
          console.error("Error syncing students:", error);
        });
    }

    function syncAttendanceToFirebase() {
      if (!auth.currentUser) {
        showLoginModal();
        return;
      }
      
      const userId = auth.currentUser.uid;
      const batch = db.batch();
      
      // For each date in attendance, update Firebase
      Object.keys(attendance).forEach((date) => {
        const attendanceData = attendance[date];
        const attendanceDocRef = attendanceRef.doc(`${userId}_${date}`);
        
        batch.set(attendanceDocRef, {
          date: date,
          attendance: attendanceData,
          userId: userId,
          syncedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      
      batch.commit()
        .then(() => {
          console.log("Attendance synced to Firebase");
          showNotification('Attendance data synced to cloud!');
        })
        .catch((error) => {
          console.error("Error syncing attendance:", error);
        });
    }

    function syncWithFirebase() {
      if (auth.currentUser) {
        syncStudentsToFirebase();
        syncAttendanceToFirebase();
      } else {
        showLoginModal();
      }
    }

    // ========== INITIALIZATION ==========
    function init() {
      document.getElementById('header-title').textContent = systemTitle;
      
      // Set current date and time
      setCurrentDateTime();
      
      // Set export modal dates
      document.getElementById('start-date').value = formatDate(currentDate);
      document.getElementById('end-date').value = formatDate(currentDate);
      
      // Add event listeners
      document.getElementById('attendance-date').addEventListener('change', function() {
        renderAttendance();
        updateStats();
      });
      
      document.getElementById('new-student').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          addStudent();
        }
      });
      
      document.getElementById('roll-number').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          addStudent();
        }
      });
      
      // Add Google Sign-In button listener
      document.getElementById('google-signin-button').addEventListener('click', signInWithGoogle);
      
      // Check online/offline status
      updateConnectionStatus();
      window.addEventListener('online', updateConnectionStatus);
      window.addEventListener('offline', updateConnectionStatus);
      
      // Check authentication state
      auth.onAuthStateChanged((user) => {
        if (user) {
          // User is signed in
          console.log("User is signed in:", user.displayName || user.email);
          updateConnectionStatus(); // Update to show user info
          loadDataFromFirebase();
        } else {
          // No user is signed in, show login modal after a short delay
          setTimeout(showLoginModal, 500);
        }
      });
      
      renderStudents();
      renderAttendance();
      updateStats();
    }

    // ========== OFFLINE/ONLINE SUPPORT ==========
    function updateConnectionStatus() {
      isOnline = navigator.onLine;
      const statusElement = document.getElementById('connection-status');
      let statusHTML = '';
      
      if (isOnline) {
        statusHTML = '<i class="fas fa-wifi"></i> <span>Online</span>';
        statusElement.className = 'connection-status online';
      } else {
        statusHTML = '<i class="fas fa-wifi-slash"></i> <span>Offline - Working Locally</span>';
        statusElement.className = 'connection-status offline';
      }
      
      // Add auth status if user is logged in
      if (auth.currentUser) {
        const userName = auth.currentUser.displayName || auth.currentUser.email;
        statusHTML += ` | <i class="fas fa-user"></i> ${userName}`;
        
        // Add provider info if available
        if (auth.currentUser.providerData && auth.currentUser.providerData.length > 0) {
          const providerId = auth.currentUser.providerData[0].providerId;
          if (providerId === 'google.com') {
            statusHTML += ' (Google)';
          }
        }
      }
      
      statusElement.innerHTML = statusHTML;
    }

    // Format date as YYYY-MM-DD
    function formatDate(date) {
      return date.toISOString().split('T')[0];
    }
    
    // Format time as HH:MM
    function formatTime(date) {
      return date.toTimeString().substring(0, 5);
    }
    
    // Set current date and time
    function setCurrentDateTime() {
      const now = new Date();
      document.getElementById('attendance-date').value = formatDate(now);
      document.getElementById('attendance-time').value = formatTime(now);
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
      
      // Sort students by roll number
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
      const rollInput = document.getElementById('roll-number');
      const nameInput = document.getElementById('new-student');
      const rollNo = rollInput.value.trim();
      const name = nameInput.value.trim();
      
      if (rollNo && name && !students.some(s => s.rollNo === rollNo)) {
        students.push({rollNo, name});
        localStorage.setItem('students', JSON.stringify(students));
        
        // Sync to Firebase if user is logged in
        if (auth.currentUser) {
          const userId = auth.currentUser.uid;
          studentsRef.add({
            rollNo: rollNo,
            name: name,
            userId: userId,
            syncedAt: firebase.firestore.FieldValue.serverTimestamp()
          }).then(() => {
            console.log("Student added to Firebase");
          }).catch((error) => {
            console.error("Error adding student to Firebase:", error);
          });
        }
        
        renderStudents();
        renderAttendance();
        updateStats();
        rollInput.value = '';
        nameInput.value = '';
        showNotification('Student added successfully!');
      } else if (students.some(s => s.rollNo === rollNo)) {
        alert('This roll number is already in the list.');
      } else {
        alert('Please enter both roll number and name.');
      }
    }
    
    function removeStudent(index) {
      if (confirm('Are you sure you want to remove this student?')) {
        students.splice(index, 1);
        localStorage.setItem('students', JSON.stringify(students));
        renderStudents();
        renderAttendance();
        updateStats();
        showNotification('Student removed successfully!');
      }
    }
    
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
        localStorage.setItem('students', JSON.stringify(students));
        renderStudents();
        renderAttendance();
        updateStats();
        showNotification(`Imported ${importedCount} students successfully!`);
        closeImportModal();
      } else {
        alert('No new students were imported. Check your data format or if students already exist.');
      }
    }
    
    function exportStudents() {
      if (students.length === 0) {
        alert('No students to export.');
        return;
      }
      
      let csvContent = "Roll No,Name\n";
      students.forEach(student => {
        csvContent += `${student.rollNo},${student.name}\n`;
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "students.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showNotification('Students exported to CSV successfully!');
    }
    
    function openImportModal() {
      document.getElementById('import-modal').style.display = 'flex';
      document.getElementById('import-data').value = '';
    }
    
    function closeImportModal() {
      document.getElementById('import-modal').style.display = 'none';
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
      const dateKey = document.getElementById('attendance-date').value;
      const timeValue = document.getElementById('attendance-time').value;
      const student = students[index];
      
      if (!dateKey) {
        alert('Please select a date first!');
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
      
      localStorage.setItem('attendance', JSON.stringify(attendance));
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
      const dateKey = document.getElementById('attendance-date').value;
      
      if (!dateKey) {
        alert('Please select a date first!');
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
      
      localStorage.setItem('attendance', JSON.stringify(attendance));
      
      // If online and logged in, sync to Firebase
      if (isOnline && auth.currentUser) {
        syncAttendanceToFirebase();
      }
      
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
    
    function loadAttendanceForDate() {
      renderAttendance();
      updateStats();
      showNotification(`Attendance data loaded for selected date`);
    }
    
    function saveAttendance() {
      localStorage.setItem('attendance', JSON.stringify(attendance));
      showNotification('Attendance data saved successfully!');
      
      // If online and logged in, sync to Firebase
      if (isOnline && auth.currentUser) {
        syncAttendanceToFirebase();
      }
    }
    
    function resetAttendance() {
      if (confirm('Are you sure you want to reset attendance for this date?')) {
        const dateKey = document.getElementById('attendance-date').value;
        if (attendance[dateKey]) {
          delete attendance[dateKey];
          localStorage.setItem('attendance', JSON.stringify(attendance));
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
        alert('Please select a date range.');
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
        alert('No attendance data found for the selected date range.');
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
    
    function exportToExcel(attendanceData, startDate, endDate) {
      // Create HTML table with styling for Excel
      let htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <style>
          td { mso-number-format:"\\@"; }
          .header { font-size: 18px; font-weight: bold; color: #1a2a6c; background-color: #fdbb2d; padding: 10px; text-align: center; }
          .subheader { font-size: 14px; font-weight: bold; color: #1a2a6c; background-color: #e6e6e6; padding: 8px; text-align: center; }
          .column-header { font-weight: bold; text-align: center; background-color: #1a2a6c; color: white; padding: 5px; }
          .present { color: #28a745; font-weight: bold; }
          .absent { color: #dc3545; font-weight: bold; }
          .late { color: #ffc107; font-weight: bold; }
          .not-recorded { color: #6c757d; }
          .footer { font-size: 12px; margin-top: 20px; text-align: center; color: #6c757d; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="7" class="header">Attendance Record - ${systemTitle}</td></tr>
          <tr><td colspan="7" class="subheader">Date Range: ${startDate} to ${endDate}</td></tr>
          <tr>
            <td class="column-header">Date</td>
            <td class="column-header">Roll No</td>
            <td class="column-header">Student Name</td>
            <td class="column-header">Morning</td>
            <td class="column-header">Time</td>
            <td class="column-header">Evening</td>
            <td class="column-header">Time</td>
          </tr>
      `;
      
      attendanceData.forEach(record => {
        const morningStatus = record.morning === 'present' ? 
          '<span class="present">Present</span>' : 
          record.morning === 'absent' ? 
          '<span class="absent">Absent</span>' : 
          record.morning === 'late' ? 
          '<span class="late">Late</span>' : 
          '<span class="not-recorded">Not Recorded</span>';
        
        const eveningStatus = record.evening === 'present' ? 
          '<span class="present">Present</span>' : 
          record.evening === 'absent' ? 
          '<span class="absent">Absent</span>' : 
          record.evening === 'late' ? 
          '<span class="late">Late</span>' : 
          '<span class="not-recorded">Not Recorded</span>';
        
        htmlContent += `
          <tr>
            <td>${record.date}</td>
            <td>${record.rollNo}</td>
            <td>${record.name}</td>
            <td>${morningStatus}</td>
            <td>${record.morningTime || ''}</td>
            <td>${eveningStatus}</td>
            <td>${record.eveningTime || ''}</td>
          </tr>
        `;
      });
      
      htmlContent += `
          <tr><td colspan="7" class="footer">Exported on ${new Date().toLocaleString()}</td></tr>
        </table>
      </body>
      </html>
      `;
      
      // Create a blob and download link
      const blob = new Blob([htmlContent], {type: 'application/vnd.ms-excel'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${startDate}_to_${endDate}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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

    // ========== UI FUNCTIONS ==========
    function showNotification(message) {
      const notification = document.getElementById('notification');
      notification.textContent = message;
      notification.classList.add('show');
      
      setTimeout(() => {
        notification.classList.remove('show');
      }, 3000);
    }
    
    function openTitleModal() {
      document.getElementById('title-modal').style.display = 'flex';
      document.getElementById('new-title').value = systemTitle;
    }
    
    function closeTitleModal() {
      document.getElementById('title-modal').style.display = 'none';
    }
    
    function saveNewTitle() {
      const newTitle = document.getElementById('new-title').value.trim();
      if (newTitle) {
        systemTitle = newTitle;
        localStorage.setItem('systemTitle', systemTitle);
        document.getElementById('header-title').textContent = systemTitle;
        closeTitleModal();
        showNotification('Title changed successfully!');
      } else {
        alert('Please enter a valid title.');
      }
    }

    // ========== INITIALIZE APPLICATION ==========
    window.onload = init;