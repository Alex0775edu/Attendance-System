    let students = JSON.parse(localStorage.getItem('students')) || [];
    let attendance = JSON.parse(localStorage.getItem('attendance')) || {};
    let currentDate = new Date().toISOString().split('T')[0];
    let systemTitle = localStorage.getItem('systemTitle') || 'Attendance System';

    function init() {
      document.getElementById('header-title').textContent = systemTitle;
      document.getElementById('attendance-date').value = currentDate;
      
      // Add event listener for date change
      document.getElementById('attendance-date').addEventListener('change', function() {
        renderAttendance();
        updateStats();
      });
      
      // Add event listener for Enter key in student input
      document.getElementById('new-student').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          addStudent();
        }
      });
      
      renderStudents();
      renderAttendance();
      updateStats();
    }

    function renderStudents() {
      const container = document.getElementById('students-container');
      container.innerHTML = '';
      
      if (students.length === 0) {
        container.innerHTML = '<tr><td colspan="2" style="text-align: center;">No students added yet. Use the form above to add students.</td></tr>';
        document.getElementById('total-students').textContent = '0';
        return;
      }
      
      students.forEach((student, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${student}</td>
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
    
    function renderAttendance() {
      const container = document.getElementById('attendance-body');
      container.innerHTML = '';
      
      if (students.length === 0) {
        container.innerHTML = '<tr><td colspan="4" style="text-align: center;">Add students first to mark attendance</td></tr>';
        return;
      }
      
      const dateKey = document.getElementById('attendance-date').value;
      
      students.forEach((student, index) => {
        const tr = document.createElement('tr');
        
        const studentAttendance = attendance[dateKey] && attendance[dateKey][student] ? 
          attendance[dateKey][student] : {morning: null, evening: null};
        
        tr.innerHTML = `
          <td>${student}</td>
          <td style="text-align: center; background-color: ${studentAttendance.morning === true ? '#d4edda' : studentAttendance.morning === false ? '#f8d7da' : 'transparent'}">
            ${studentAttendance.morning === true ? 'P' : studentAttendance.morning === false ? 'A' : ''}
          </td>
          <td style="text-align: center; background-color: ${studentAttendance.evening === true ? '#d4edda' : studentAttendance.evening === false ? '#f8d7da' : 'transparent'}">
            ${studentAttendance.evening === true ? 'P' : studentAttendance.evening === false ? 'A' : ''}
          </td>
          <td class="attendance-actions">
            <button class="attendance-btn present" onclick="markAttendance(${index}, 'morning', true)">
              <i class="fas fa-check"></i> P
            </button>
            <button class="attendance-btn absent" onclick="markAttendance(${index}, 'morning', false)">
              <i class="fas fa-times"></i> A
            </button>
            <button class="attendance-btn present" onclick="markAttendance(${index}, 'evening', true)">
              <i class="fas fa-check"></i> P
            </button>
            <button class="attendance-btn absent" onclick="markAttendance(${index}, 'evening', false)">
              <i class="fas fa-times"></i> A
            </button>
          </td>
        `;
        container.appendChild(tr);
      });
    }
    
    function addStudent() {
      const input = document.getElementById('new-student');
      const name = input.value.trim();
      
      if (name && !students.includes(name)) {
        students.push(name);
        localStorage.setItem('students', JSON.stringify(students));
        renderStudents();
        renderAttendance();
        updateStats();
        input.value = '';
        showNotification('Student added successfully!');
      } else if (students.includes(name)) {
        alert('This student is already in the list.');
      } else {
        alert('Please enter a valid name.');
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

    function markAttendance(index, session, status) {
      const dateKey = document.getElementById('attendance-date').value;
      const student = students[index];
      
      if (!dateKey) {
        alert('Please select a date first!');
        return;
      }
      
      if (!attendance[dateKey]) {
        attendance[dateKey] = {};
      }
      
      if (!attendance[dateKey][student]) {
        attendance[dateKey][student] = {morning: null, evening: null};
      }
      
      attendance[dateKey][student][session] = status;
      localStorage.setItem('attendance', JSON.stringify(attendance));
      renderAttendance();
      updateStats();
    }
    
    function updateStats() {
      const dateKey = document.getElementById('attendance-date').value;
      let morningPresent = 0;
      let eveningPresent = 0;
      let total = students.length;
      
      if (total === 0) {
        document.getElementById('total-students').textContent = '0';
        document.getElementById('morning-present').textContent = '0';
        document.getElementById('evening-present').textContent = '0';
        return;
      }
      
      if (attendance[dateKey]) {
        students.forEach(student => {
          if (attendance[dateKey][student]) {
            if (attendance[dateKey][student].morning === true) morningPresent++;
            if (attendance[dateKey][student].evening === true) eveningPresent++;
          }
        });
      }
      
      document.getElementById('total-students').textContent = total;
      document.getElementById('morning-present').textContent = morningPresent;
      document.getElementById('evening-present').textContent = eveningPresent;
    }
    
    function setToday() {
      document.getElementById('attendance-date').value = new Date().toISOString().split('T')[0];
      renderAttendance();
      updateStats();
    }
    
    function saveAttendance() {
      localStorage.setItem('attendance', JSON.stringify(attendance));
      showNotification('Attendance data saved successfully!');
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

    function exportToExcel() {
      const dateKey = document.getElementById('attendance-date').value;
      
      if (!dateKey) {
        alert('Please select a date first!');
        return;
      }
      
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
          .not-recorded { color: #6c757d; }
          .footer { font-size: 12px; margin-top: 20px; text-align: center; color: #6c757d; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="3" class="header">Attendance Record - ${systemTitle}</td></tr>
          <tr><td colspan="3" class="subheader">Date: ${dateKey}</td></tr>
          <tr>
            <td class="column-header">Student Name</td>
            <td class="column-header">Morning</td>
            <td class="column-header">Evening</td>
          </tr>
      `;
      
      students.forEach(student => {
        const studentAttendance = attendance[dateKey] && attendance[dateKey][student] ? 
          attendance[dateKey][student] : {morning: null, evening: null};
        
        const morningStatus = studentAttendance.morning === true ? 
          '<span class="present">Present</span>' : 
          studentAttendance.morning === false ? 
          '<span class="absent">Absent</span>' : 
          '<span class="not-recorded">Not Recorded</span>';
        
        const eveningStatus = studentAttendance.evening === true ? 
          '<span class="present">Present</span>' : 
          studentAttendance.evening === false ? 
          '<span class="absent">Absent</span>' : 
          '<span class="not-recorded">Not Recorded</span>';
        
        htmlContent += `
          <tr>
            <td>${student}</td>
            <td>${morningStatus}</td>
            <td>${eveningStatus}</td>
          </tr>
        `;
      });
      
      htmlContent += `
          <tr><td colspan="3" class="footer">Exported on ${new Date().toLocaleString()}</td></tr>
        </table>
      </body>
      </html>
      `;
      
      // Create a blob and download link
      const blob = new Blob([htmlContent], {type: 'application/vnd.ms-excel'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${dateKey}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showNotification('Attendance exported successfully!');
    }
    
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

    // Initialize the application when the page loads
    window.onload = init;
