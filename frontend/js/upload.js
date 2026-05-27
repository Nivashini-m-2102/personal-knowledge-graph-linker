const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const uploadBtn = document.getElementById('upload-btn');
const loadingOverlay = document.getElementById('loading-overlay');

let selectedFiles = [];

// Click to upload
dropZone.addEventListener('click', () => fileInput.click());

// Drag and drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFiles(e.target.files);
    }
});

function handleFiles(files) {
    selectedFiles = Array.from(files);
    fileList.innerHTML = '';
    
    selectedFiles.forEach(file => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `
            <span>📄 ${file.name}</span>
            <span style="color: #94A3B8;">${(file.size / 1024).toFixed(1)} KB</span>
        `;
        fileList.appendChild(item);
    });

    if (selectedFiles.length > 0) {
        uploadBtn.classList.remove('hidden');
    } else {
        uploadBtn.classList.add('hidden');
    }
}

uploadBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    const token = localStorage.getItem('token');
    if (!token) {
        alert("Please log in first!");
        window.location.href = 'login.html';
        return;
    }

    const formData = new FormData();
    selectedFiles.forEach(file => {
        formData.append('files', file);
    });

    loadingOverlay.classList.remove('hidden');

    try {
        const API_BASE = "http://localhost:5000";

const response = await fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            // File uploaded and graph created on backend.
            window.location.href = 'dashboard.html';
        } else {
            alert(result.message || 'Upload failed');
            loadingOverlay.classList.add('hidden');
        }
    } catch (error) {
        console.error('Upload Error:', error);
        alert('Server connection failed');
        loadingOverlay.classList.add('hidden');
    }
});