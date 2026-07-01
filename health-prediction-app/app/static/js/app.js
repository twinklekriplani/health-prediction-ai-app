// MIRA Health Prediction Application - Frontend Engine

// Global State
let patients = [];
let activeTab = 'dashboard';
let searchQuery = '';
let riskChartInstance = null;
let detailChartInstance = null;

// API Endpoints
const API_BASE = '/api';

// Initial Load
window.addEventListener('DOMContentLoaded', () => {
    checkBackendHealth();
    fetchPatients();
    
    // Set max date for birth date picker to today
    const dobInput = document.getElementById('form-dob');
    if (dobInput) {
        dobInput.max = new Date().toISOString().split('T')[0];
    }
});

// 1. System Health Check
async function checkBackendHealth() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.getElementById('api-status');
        
        if (response.ok) {
            const data = await response.json();
            statusIndicator.className = 'status-indicator online';
            statusText.textContent = data.api_configured ? 'System Online (MIRA AI)' : 'System Online (Local Model)';
        } else {
            statusIndicator.className = 'status-indicator offline';
            statusText.textContent = 'Service Degraded';
        }
    } catch (error) {
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.getElementById('api-status');
        statusIndicator.className = 'status-indicator offline';
        statusText.textContent = 'API Offline';
    }
}

// 2. Switch Dashboard Tabs
function switchTab(tabId) {
    activeTab = tabId;
    
    // Toggle nav classes
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.getElementById(`nav-${tabId}`).classList.add('active');
    
    // Toggle view elements
    document.querySelectorAll('.tab-view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(`view-${tabId}`).classList.add('active');
    
    // Update Headers
    const title = document.getElementById('page-title');
    const subtitle = document.getElementById('page-subtitle');
    
    if (tabId === 'dashboard') {
        title.textContent = 'Operational Dashboard';
        subtitle.textContent = 'Real-time health predictive diagnostics overview';
    } else {
        title.textContent = 'Patients Ledger';
        subtitle.textContent = 'Manage, review, and evaluate patient clinical files';
    }
}

// 3. API Communication: Retrieve Patients
async function fetchPatients() {
    try {
        const url = searchQuery 
            ? `${API_BASE}/patients?search=${encodeURIComponent(searchQuery)}`
            : `${API_BASE}/patients`;
            
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to retrieve patient ledger.');
        
        patients = await response.json();
        
        // Refresh views
        renderPatientTable();
        if (activeTab === 'dashboard') {
            updateDashboardMetrics();
            renderRiskDistributionChart();
            renderRecentEvaluations();
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// 4. Update Dashboard Cards
function updateDashboardMetrics() {
    const totalPatients = patients.length;
    document.getElementById('stat-total-patients').textContent = totalPatients;
    
    if (totalPatients === 0) {
        document.getElementById('stat-avg-glucose').innerHTML = `0 <span class="unit">mg/dL</span>`;
        document.getElementById('stat-avg-haemo').innerHTML = `0 <span class="unit">g/dL</span>`;
        document.getElementById('stat-avg-cholesterol').innerHTML = `0 <span class="unit">mg/dL</span>`;
        return;
    }
    
    // Calculate Averages
    const avgGlucose = patients.reduce((acc, p) => acc + p.glucose, 0) / totalPatients;
    const avgHaemo = patients.reduce((acc, p) => acc + p.haemoglobin, 0) / totalPatients;
    const avgChol = patients.reduce((acc, p) => acc + p.cholesterol, 0) / totalPatients;
    
    document.getElementById('stat-avg-glucose').innerHTML = `${avgGlucose.toFixed(1)} <span class="unit">mg/dL</span>`;
    document.getElementById('stat-avg-haemo').innerHTML = `${avgHaemo.toFixed(1)} <span class="unit">g/dL</span>`;
    document.getElementById('stat-avg-cholesterol').innerHTML = `${avgChol.toFixed(1)} <span class="unit">mg/dL</span>`;
    
    // Status text updates based on averages
    const glucoseStatus = document.getElementById('stat-glucose-status');
    if (avgGlucose < 100) {
        glucoseStatus.textContent = 'Normal Baseline';
        glucoseStatus.className = 'trend';
    } else if (avgGlucose <= 125) {
        glucoseStatus.textContent = 'Borderline Elevated';
        glucoseStatus.className = 'trend warning';
        glucoseStatus.style.color = 'var(--state-moderate)';
    } else {
        glucoseStatus.textContent = 'Diabetic Baseline';
        glucoseStatus.className = 'trend danger';
        glucoseStatus.style.color = 'var(--state-high)';
    }
    
    const haemoStatus = document.getElementById('stat-haemo-status');
    if (avgHaemo >= 12.0 && avgHaemo <= 17.5) {
        haemoStatus.textContent = 'Optimal Range';
        haemoStatus.className = 'trend';
    } else {
        haemoStatus.textContent = 'Anemic / Altered';
        haemoStatus.className = 'trend danger';
        haemoStatus.style.color = 'var(--state-high)';
    }

    const cholesterolStatus = document.getElementById('stat-cholesterol-status');
    if (avgChol < 200) {
        cholesterolStatus.textContent = 'Desirable levels';
        cholesterolStatus.className = 'trend';
    } else {
        cholesterolStatus.textContent = 'Elevated Risk';
        cholesterolStatus.className = 'trend warning';
        cholesterolStatus.style.color = 'var(--state-moderate)';
    }
}

// 5. Render Risk Doughnut Chart
function renderRiskDistributionChart() {
    const ctx = document.getElementById('riskChart');
    if (!ctx) return;
    
    // Count risk levels
    let low = 0, moderate = 0, high = 0;
    
    patients.forEach(p => {
        try {
            const remarks = JSON.parse(p.remarks);
            const risk = remarks.risk_level.toLowerCase();
            if (risk === 'low') low++;
            else if (risk === 'moderate') moderate++;
            else if (risk === 'high') high++;
        } catch (e) {
            low++; // default
        }
    });
    
    // Update HTML legend
    const legend = document.getElementById('risk-legend');
    legend.innerHTML = `
        <div class="legend-item">
            <div class="legend-color" style="background-color: var(--state-low)"></div>
            <span class="legend-label">Low Risk</span>
            <span class="legend-count">${low}</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background-color: var(--state-moderate)"></div>
            <span class="legend-label">Moderate</span>
            <span class="legend-count">${moderate}</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background-color: var(--state-high)"></div>
            <span class="legend-label">High Risk</span>
            <span class="legend-count">${high}</span>
        </div>
    `;
    
    // Destroy previous instance
    if (riskChartInstance) {
        riskChartInstance.destroy();
    }
    
    if (patients.length === 0) {
        // Draw empty chart placeholder
        riskChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['No Data'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#1e293b'],
                    borderWidth: 0
                }]
            },
            options: {
                cutout: '80%',
                responsive: true,
                plugins: { legend: { display: false } }
            }
        });
        return;
    }
    
    riskChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Low Risk', 'Moderate Risk', 'High Risk'],
            datasets: [{
                data: [low, moderate, high],
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                hoverOffset: 4,
                borderWidth: 1,
                borderColor: '#090d16'
            }]
        },
        options: {
            cutout: '75%',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${context.raw} patients`;
                        }
                    }
                }
            }
        }
    });
}

// 6. Render Recent Signups Sidebar List
function renderRecentEvaluations() {
    const list = document.getElementById('recent-patients-list');
    if (!list) return;
    
    // Sort patients by created_at desc, take top 4
    const recent = [...patients].slice(0, 4);
    
    if (recent.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i data-lucide="inbox"></i>
                <p>No patient records. Add a patient to get started.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    list.innerHTML = recent.map(p => {
        let risk = 'Low';
        try {
            const remarks = JSON.parse(p.remarks);
            risk = remarks.risk_level;
        } catch(e){}
        
        const riskClass = `badge-risk-${risk.toLowerCase()}`;
        const initials = p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        
        return `
            <div class="recent-item" onclick="viewPatientDetails(${p.id})">
                <div class="recent-patient-meta">
                    <div class="avatar-small">${initials}</div>
                    <div class="recent-patient-info">
                        <h4>${escapeHTML(p.name)}</h4>
                        <span>${p.email}</span>
                    </div>
                </div>
                <div class="recent-patient-risk">
                    <span class="badge ${riskClass}">${risk}</span>
                </div>
            </div>
        `;
    }).join('');
}

// 7. Render Patients Ledger Table
function renderPatientTable() {
    const tbody = document.getElementById('patient-table-body');
    if (!tbody) return;
    
    if (patients.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <i data-lucide="folder-open"></i>
                        <p>No patients found. Click 'Add Patient' to create a new record.</p>
                    </div>
                </td>
            </tr>
        `;
        lucide.createIcons();
        return;
    }
    
    tbody.innerHTML = patients.map(p => {
        // Calculate age
        const age = calculateAge(p.dob);
        let risk = 'Low';
        try {
            const remarks = JSON.parse(p.remarks);
            risk = remarks.risk_level;
        } catch(e){}
        
        const riskClass = `badge-risk-${risk.toLowerCase()}`;
        
        return `
            <tr onclick="event.target.closest('.actions-cell-flex') ? null : viewPatientDetails(${p.id})">
                <td>
                    <div class="patient-cell-name">${escapeHTML(p.name)}</div>
                    <span class="patient-cell-email">${p.email}</span>
                </td>
                <td>
                    <div>${age} Years</div>
                    <span class="subtitle">${p.dob}</span>
                </td>
                <td class="vital-value-cell">${p.glucose.toFixed(1)} <span class="range-hint">mg/dL</span></td>
                <td class="vital-value-cell">${p.haemoglobin.toFixed(1)} <span class="range-hint">g/dL</span></td>
                <td class="vital-value-cell">${p.cholesterol.toFixed(1)} <span class="range-hint">mg/dL</span></td>
                <td><span class="badge ${riskClass}">${risk}</span></td>
                <td class="actions-col">
                    <div class="actions-cell-flex">
                        <button class="btn-icon" onclick="event.stopPropagation(); openPatientModal(true, ${p.id})" title="Edit Details">
                            <i data-lucide="edit-3"></i>
                        </button>
                        <button class="btn-icon delete-btn" onclick="event.stopPropagation(); deletePatientRecord(${p.id}, '${escapeQuote(p.name)}')" title="Delete File">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    lucide.createIcons();
}

// 8. Search Function
function handleSearch() {
    searchQuery = document.getElementById('patient-search').value;
    fetchPatients();
}

// 9. Input Form Validation
function validateForm() {
    let isValid = true;
    
    // Clear previous errors
    document.querySelectorAll('.error-msg').forEach(el => {
        el.style.display = 'none';
        el.textContent = '';
    });
    
    const name = document.getElementById('form-name').value.trim();
    const dob = document.getElementById('form-dob').value;
    const email = document.getElementById('form-email').value.trim();
    const glucose = parseFloat(document.getElementById('form-glucose').value);
    const haemoglobin = parseFloat(document.getElementById('form-haemoglobin').value);
    const cholesterol = parseFloat(document.getElementById('form-cholesterol').value);
    
    // Validate Name
    if (!name) {
        showFieldError('name', 'Patient full name is required');
        isValid = false;
    }
    
    // Validate DOB
    if (!dob) {
        showFieldError('dob', 'Date of birth is required');
        isValid = false;
    } else {
        const selectedDate = new Date(dob);
        const today = new Date();
        // Zero out time
        today.setHours(0,0,0,0);
        if (selectedDate > today) {
            showFieldError('dob', 'Date of birth cannot be in the future');
            isValid = false;
        }
    }
    
    // Validate Email
    if (!email) {
        showFieldError('email', 'Email address is required');
        isValid = false;
    } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showFieldError('email', 'Please enter a valid email format');
            isValid = false;
        }
    }
    
    // Validate Vitals
    if (isNaN(glucose) || glucose <= 0) {
        showFieldError('glucose', 'Must be a positive number');
        isValid = false;
    }
    if (isNaN(haemoglobin) || haemoglobin <= 0) {
        showFieldError('haemoglobin', 'Must be a positive number');
        isValid = false;
    }
    if (isNaN(cholesterol) || cholesterol <= 0) {
        showFieldError('cholesterol', 'Must be a positive number');
        isValid = false;
    }
    
    return isValid;
}

function showFieldError(field, message) {
    const errorEl = document.getElementById(`error-${field}`);
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}

// 10. CRUD: Create & Update Save Action
async function savePatient(event) {
    event.preventDefault();
    
    if (!validateForm()) return;
    
    const saveButton = document.getElementById('btn-save-patient');
    const originalText = saveButton.innerHTML;
    saveButton.disabled = true;
    saveButton.innerHTML = `<span class="status-indicator online" style="margin-right:8px; animation: pulseGlow 1s infinite"></span> Evaluating...`;
    
    const id = document.getElementById('form-patient-id').value;
    const isEdit = !!id;
    
    const payload = {
        name: document.getElementById('form-name').value.trim(),
        dob: document.getElementById('form-dob').value,
        email: document.getElementById('form-email').value.trim(),
        glucose: parseFloat(document.getElementById('form-glucose').value),
        haemoglobin: parseFloat(document.getElementById('form-haemoglobin').value),
        cholesterol: parseFloat(document.getElementById('form-cholesterol').value)
    };
    
    try {
        let response;
        if (isEdit) {
            response = await fetch(`${API_BASE}/patients/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            response = await fetch(`${API_BASE}/patients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'An error occurred during save operations.');
        }
        
        showToast(isEdit ? 'Patient file updated successfully.' : 'New patient diagnosed & recorded.', 'success');
        closePatientModal();
        fetchPatients();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        saveButton.disabled = false;
        saveButton.innerHTML = originalText;
    }
}

// 11. CRUD: Delete Action
async function deletePatientRecord(id, name) {
    if (!confirm(`Are you sure you want to delete the clinical record for "${name}"?\nThis action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/patients/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.detail || 'Failed to delete record.');
        }
        
        showToast(`Record for ${name} removed.`, 'info');
        fetchPatients();
        
        // If details modal of the deleted patient is open, close it
        const detailsModal = document.getElementById('details-modal');
        if (detailsModal.classList.contains('active')) {
            closeDetailsModal();
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// 12. Modal Handlers
function openPatientModal(isEdit = false, patientId = null) {
    const modal = document.getElementById('patient-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('patient-form');
    
    form.reset();
    document.getElementById('form-patient-id').value = '';
    
    // Clear errors
    document.querySelectorAll('.error-msg').forEach(el => {
        el.style.display = 'none';
        el.textContent = '';
    });
    
    if (isEdit && patientId) {
        title.textContent = 'Edit Patient Vitals';
        const patient = patients.find(p => p.id === patientId);
        if (patient) {
            document.getElementById('form-patient-id').value = patient.id;
            document.getElementById('form-name').value = patient.name;
            document.getElementById('form-dob').value = patient.dob;
            document.getElementById('form-email').value = patient.email;
            document.getElementById('form-glucose').value = patient.glucose;
            document.getElementById('form-haemoglobin').value = patient.haemoglobin;
            document.getElementById('form-cholesterol').value = patient.cholesterol;
        }
    } else {
        title.textContent = 'Record Patient Vitals';
    }
    
    modal.classList.add('active');
}

function closePatientModal() {
    document.getElementById('patient-modal').classList.remove('active');
}

// 13. Patient Detailed Analytics Viewer
function viewPatientDetails(patientId) {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    
    // Populate simple tags
    document.getElementById('detail-name').textContent = patient.name;
    document.getElementById('detail-email').textContent = patient.email;
    document.getElementById('detail-age').textContent = `Age: ${calculateAge(patient.dob)} yrs`;
    document.getElementById('detail-dob-badge').textContent = `DOB: ${patient.dob}`;
    document.getElementById('detail-avatar').textContent = patient.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    
    // Store reference to edit button
    const editBtn = document.getElementById('btn-edit-details');
    editBtn.onclick = () => {
        closeDetailsModal();
        openPatientModal(true, patient.id);
    };

    // Parse AI remarks
    let remarks = {
        engine: "Default System Analysis",
        risk_level: "Low",
        summary: "Patient vitals records loaded.",
        conditions: ["Unable to load prediction matrix"],
        recommendations: ["Ensure local database contains correctly structured data."]
    };
    
    try {
        remarks = JSON.parse(patient.remarks);
    } catch (e) {
        console.error("Failed to parse patient remarks", e);
    }
    
    // Set Engine Tag
    document.getElementById('detail-engine').textContent = remarks.engine || "Clinical Engine v1.2";
    
    // Set Risk Level Badge
    const riskBadge = document.getElementById('detail-risk-badge');
    const risk = remarks.risk_level || "Low";
    riskBadge.textContent = `Risk: ${risk}`;
    riskBadge.className = `badge badge-risk badge-risk-${risk.toLowerCase()}`;
    
    // Narratives & recommendations
    document.getElementById('detail-ai-summary').textContent = remarks.summary || "No summary provided.";
    
    const condList = document.getElementById('detail-ai-conditions');
    condList.innerHTML = '';
    const conditions = remarks.conditions || ["No specific conditions identified."];
    conditions.forEach(c => {
        const li = document.createElement('li');
        li.textContent = c;
        condList.appendChild(li);
    });
    
    const recList = document.getElementById('detail-ai-recommendations');
    recList.innerHTML = '';
    const recs = remarks.recommendations || ["Proceed with general clinical guidelines."];
    recs.forEach(r => {
        const li = document.createElement('li');
        li.textContent = r;
        recList.appendChild(li);
    });
    
    // Render Detail Vitals spectrum Chart
    renderDetailVitalsChart(patient);
    
    // Open Modal
    document.getElementById('details-modal').classList.add('active');
    
    lucide.createIcons();
}

function closeDetailsModal() {
    document.getElementById('details-modal').classList.remove('active');
}

function editFromDetails() {
    // Handled dynamically inside viewPatientDetails
}

// 14. Render Patient Vitals Spectrum Chart
function renderDetailVitalsChart(patient) {
    const ctx = document.getElementById('detailVitalsChart');
    if (!ctx) return;
    
    // We will render patient values normalized by reference limits to make it visually meaningful
    // Reference normal values: Glucose 100 mg/dL, Haemoglobin 15.0 g/dL, Cholesterol 200 mg/dL
    // This allows showing the relative level in a clean single bar comparison!
    // Or we show 3 separate bars, each with a safe/warning threshold line.
    
    if (detailChartInstance) {
        detailChartInstance.destroy();
    }
    
    detailChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Glucose (mg/dL)', 'Haemoglobin (g/dL)', 'Cholesterol (mg/dL)'],
            datasets: [
                {
                    label: 'Patient Vitals',
                    data: [patient.glucose, patient.haemoglobin, patient.cholesterol],
                    backgroundColor: [
                        patient.glucose > 100 || patient.glucose < 70 ? 'rgba(239, 68, 68, 0.75)' : 'rgba(16, 185, 129, 0.75)',
                        patient.haemoglobin < 12.0 || patient.haemoglobin > 17.5 ? 'rgba(239, 68, 68, 0.75)' : 'rgba(16, 185, 129, 0.75)',
                        patient.cholesterol >= 200 ? 'rgba(239, 68, 68, 0.75)' : 'rgba(16, 185, 129, 0.75)'
                    ],
                    borderColor: [
                        patient.glucose > 100 || patient.glucose < 70 ? '#ef4444' : '#10b981',
                        patient.haemoglobin < 12.0 || patient.haemoglobin > 17.5 ? '#ef4444' : '#10b981',
                        patient.cholesterol >= 200 ? '#ef4444' : '#10b981'
                    ],
                    borderWidth: 1.5,
                    borderRadius: 4,
                    barPercentage: 0.5
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.raw;
                            if (context.dataIndex === 0) return ` Fasting Glucose: ${val} mg/dL (Ref: 70-100)`;
                            if (context.dataIndex === 1) return ` Haemoglobin: ${val} g/dL (Ref: 12-17.5)`;
                            if (context.dataIndex === 2) return ` Cholesterol: ${val} mg/dL (Ref: <200)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: 'var(--text-secondary)' }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: 'var(--text-primary)', font: { weight: '600' } }
                }
            }
        }
    });
}

// Helper Utilities
function calculateAge(dobString) {
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

function escapeQuote(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'");
}

// 15. Toast Notification System
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Choose icon based on type
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'alert-triangle';
    
    toast.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px">
            <i data-lucide="${icon}" style="width:16px; height:16px"></i>
            <span class="toast-content">${message}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    // Automatically remove after 4 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 4000);
}
