$(document).ready(function() {
    const access = sessionStorage.getItem('access');
    if (!access) {
        window.location.href = '/login';
        return;
    }

    const colorProbe = document.createElement('span');
    colorProbe.className = 'vehicle-color-probe';
    colorProbe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;';
    document.body.appendChild(colorProbe);

    function hexToRgb(hex) {
        let normalized = hex.replace('#', '').trim();
        if (![3, 6].includes(normalized.length)) return null;
        if (normalized.length === 3) normalized = normalized.split('').map(ch => ch + ch).join('');
        const num = parseInt(normalized, 16);
        return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    }

    function formatMileage(value) {
        if (value === null || value === undefined || value === '') return '—';
        return `${Number(value).toFixed(1)} km/L`;
    }

    function formatMoney(value) {
        if (value === null || value === undefined) return '₹0.00';
        return '₹' + Number(value).toFixed(2);
    }

    function sanitizeFormValue(value) {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed === '—' || trimmed === '-') return '';
        }
        return value;
    }

    function formatDateForInput(value) {
        if (!value) return '';
        if (typeof value === 'string') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
            const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
            if (isoMatch) return isoMatch[1];
        }
        const date = new Date(value);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    }

    function formatDateDisplay(value) {
        if (!value) return '—';
        if (typeof value === 'string') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
            const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
            if (isoMatch) return isoMatch[1];
        }
        const date = new Date(value);
        if (isNaN(date.getTime())) return '—';
        return date.toISOString().split('T')[0];
    }

    function populateVehicleForm(vehicle = {}) {
        $('#vehicleId').val(vehicle.id || '');
        $('#regno').val(sanitizeFormValue(vehicle.regno));
        $('#name').val(sanitizeFormValue(vehicle.name));
        $('#fuel_type').val(sanitizeFormValue(vehicle.fuel_type));
        $('#fuel_tank_capacity').val(sanitizeFormValue(vehicle.fuel_tank_capacity));
        $('#model').val(sanitizeFormValue(vehicle.model));
        $('#color').val(sanitizeFormValue(vehicle.color));
        $('#company').val(sanitizeFormValue(vehicle.company));
        $('#total_kms_driven').val(sanitizeFormValue(vehicle.total_kms_driven));
        $('#last_service_date').val(formatDateForInput(vehicle.last_service_date));
        $('#current_mileage').val(sanitizeFormValue(vehicle.current_mileage));
        $('#average_mileage').val(sanitizeFormValue(vehicle.average_mileage));
    }

    // Fetch and display vehicles
    function loadVehicles() {
        $('#vehicleDetailsBody').removeData('vehicle');
        $('#vehiclesList').html(`
            <div class="skeleton-card"></div>
            <div class="skeleton-card" style="animation-delay:0.1s"></div>
            <div class="skeleton-card" style="animation-delay:0.2s"></div>
        `);

        $.ajax({
            url: '/api/vehicles/',
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + access },
            success: function(data) {
                $('#vehiclesList').empty();
                if (data.length === 0) {
                    $('#vehiclesList').append(`
                        <div class="empty-state">
                            <div class="empty-state-icon">🚗</div>
                            <h3>No vehicles yet</h3>
                            <p>Add your first vehicle to start tracking fuel consumption and mileage.</p>
                            <button class="btn btn-success" data-bs-toggle="modal" data-bs-target="#vehicleModal">Add Your First Vehicle</button>
                        </div>`);
                } else {
                    data.forEach(function(vehicle, index) {
                        const fuelIcon = { petrol: '⛽', diesel: '🛢️', cng: '🔵' }[vehicle.fuel_type] || '⛽';
                        const colorDot = vehicle.color
                            ? `<span class="vehicle-color-dot" style="background-color:${vehicle.color.toLowerCase()};"></span>`
                            : '';

                        const card = $(`
                            <div class="vehicle-card-item" data-id="${vehicle.id}" tabindex="0"
                                 style="animation-delay:${index * 0.06}s;"
                                 aria-label="${vehicle.name} - View transactions">
                                <div class="vehicle-card-header">
                                    <div>
                                        <div class="vehicle-name">${vehicle.name}</div>
                                        <div class="vehicle-regno">${vehicle.regno.toUpperCase()}</div>
                                    </div>
                                    <span class="vehicle-fuel-badge">${fuelIcon} ${vehicle.fuel_type}</span>
                                </div>
                                <div class="vehicle-meta-row">
                                    ${colorDot}${vehicle.color || 'No color'}
                                    ${vehicle.model ? '<span>· ' + vehicle.model + '</span>' : ''}
                                    ${vehicle.company ? '<span>· ' + vehicle.company + '</span>' : ''}
                                </div>
                                <div class="vehicle-stats-grid">
                                    <div class="vehicle-stat-box">
                                        <span class="stat-label">Mileage</span>
                                        <span class="stat-value blue">${formatMileage(vehicle.average_mileage)}</span>
                                    </div>
                                    <div class="vehicle-stat-box">
                                        <span class="stat-label">KMs</span>
                                        <span class="stat-value">${Number(vehicle.total_kms_driven || 0).toLocaleString()}</span>
                                    </div>
                                    <div class="vehicle-stat-box">
                                        <span class="stat-label">Spent</span>
                                        <span class="stat-value green">${formatMoney(vehicle.money_used)}</span>
                                    </div>
                                </div>
                                <div class="vehicle-card-actions">
                                    <button class="card-action-btn edit" data-id="${vehicle.id}">✏️ Edit</button>
                                    <button class="card-action-btn details" data-id="${vehicle.id}">ℹ️ Details</button>
                                    <button class="card-action-btn delete" data-id="${vehicle.id}">🗑 Delete</button>
                                </div>
                            </div>
                        `);
                        $('#vehiclesList').append(card);
                    });
                }
            },
            error: function(xhr) {
                if (xhr.status === 401) { sessionStorage.clear(); window.location.href = '/login'; }
                else { Toast.error('Error', 'Failed to load vehicles.'); }
            }
        });
    }

    loadVehicles();

    // Add Vehicle Modal
    $('#vehicleModal').on('show.bs.modal', function(event) {
        const trigger = event.relatedTarget ? $(event.relatedTarget) : null;
        if (!trigger || !$(trigger).data('id')) {
            $('#vehicleForm')[0].reset();
            $('#vehicleId').val('');
            $('#vehicleModalLabel').text('Add Vehicle');
            $('.modal-subtitle').text('Fill in the details below');
            return;
        }
        const vehicleId = $(trigger).data('id');
        $('#vehicleModalLabel').text('Edit Vehicle');
        $('.modal-subtitle').text('Update vehicle information');
        $.ajax({
            url: `/api/vehicles/${vehicleId}/`,
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + access },
            success: function(vehicle) { populateVehicleForm(vehicle); }
        });
    });

    $('#vehicleForm').submit(function(e) {
        e.preventDefault();
        const vehicleId = $('#vehicleId').val();
        const submitBtn = $(this).find('button[type="submit"]');
        const originalText = submitBtn.text();

        const data = {
            regno: $('#regno').val().trim(),
            name: $('#name').val().trim(),
            fuel_type: $('#fuel_type').val(),
            fuel_tank_capacity: parseFloat($('#fuel_tank_capacity').val()) || 0
        };

        const model = $('#model').val().trim();
        if (model) data.model = model;
        const company = $('#company').val().trim();
        if (company) data.company = company;
        const color = $('#color').val().trim();
        if (color) data.color = color;

        const tkm = $('#total_kms_driven').val();
        if (tkm && !isNaN(parseFloat(tkm))) data.total_kms_driven = parseFloat(tkm);

        const lsd = $('#last_service_date').val();
        if (lsd) data.last_service_date = lsd;

        const cm = $('#current_mileage').val();
        if (cm && !isNaN(parseFloat(cm))) data.current_mileage = parseFloat(cm);

        const am = $('#average_mileage').val();
        if (am && !isNaN(parseFloat(am))) data.average_mileage = parseFloat(am);

        const method = vehicleId ? 'PATCH' : 'POST';
        const url = vehicleId ? `/api/vehicles/${vehicleId}/` : '/api/vehicles/';

        submitBtn.prop('disabled', true).html('<span class="spinner"></span> Saving...');

        $.ajax({
            url: url,
            method: method,
            headers: { 'Authorization': 'Bearer ' + access, 'Content-Type': 'application/json' },
            data: JSON.stringify(data),
            success: function() {
                $('#vehicleModal').modal('hide');
                loadVehicles();
                Toast.success('Success', vehicleId ? 'Vehicle updated successfully.' : 'Vehicle added successfully.');
            },
            error: function(xhr) {
                Toast.error('Error', xhr.responseJSON?.detail || 'Could not save vehicle.');
            },
            complete: function() {
                submitBtn.prop('disabled', false).text(originalText);
            }
        });
    });

    function vehicleDetailsHtml(vehicle) {
        const fuelIcon = { petrol: '⛽', diesel: '🛢️', cng: '🔵' }[vehicle.fuel_type] || '⛽';
        const colorDot = vehicle.color
            ? `<span class="vehicle-color-dot" style="background-color:${vehicle.color.toLowerCase()};width:12px;height:12px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.3);display:inline-block;margin-right:6px;vertical-align:middle;"></span>`
            : '';

        return `
        <div class="details-container">
            <div class="details-section primary-section">
                <h6 class="section-title"><span class="section-icon">🚗</span>Primary Information</h6>
                <div class="details-grid">
                    <div class="detail-item"><span class="detail-label">Vehicle Name</span><span class="detail-value highlight">${vehicle.name}</span></div>
                    <div class="detail-item"><span class="detail-label">Registration No.</span><span class="detail-value regno">${vehicle.regno.toUpperCase()}</span></div>
                    <div class="detail-item"><span class="detail-label">Fuel Type</span><span class="detail-value fuel-badge">${fuelIcon} ${vehicle.fuel_type.toUpperCase()}</span></div>
                    <div class="detail-item"><span class="detail-label">Tank Capacity</span><span class="detail-value">${vehicle.fuel_tank_capacity || '-'} L</span></div>
                </div>
            </div>
            <div class="details-section">
                <h6 class="section-title"><span class="section-icon">📋</span>Specifications</h6>
                <div class="details-grid">
                    <div class="detail-item"><span class="detail-label">Company</span><span class="detail-value">${vehicle.company || '-'}</span></div>
                    <div class="detail-item"><span class="detail-label">Model</span><span class="detail-value">${vehicle.model || '-'}</span></div>
                    <div class="detail-item"><span class="detail-label">Color</span><span class="detail-value">${colorDot}${vehicle.color || '-'}</span></div>
                </div>
            </div>
            <div class="details-section stats-section">
                <h6 class="section-title"><span class="section-icon">📊</span>Performance</h6>
                <div class="details-grid stats-grid">
                    <div class="detail-item stat-box"><span class="stat-icon">🚀</span><span class="detail-label">Current Mileage</span><span class="detail-value stat-value">${vehicle.current_mileage ? Number(vehicle.current_mileage).toFixed(1) + ' km/L' : '-'}</span></div>
                    <div class="detail-item stat-box"><span class="stat-icon">📈</span><span class="detail-label">Avg Mileage</span><span class="detail-value stat-value">${vehicle.average_mileage ? Number(vehicle.average_mileage).toFixed(1) + ' km/L' : '-'}</span></div>
                    <div class="detail-item stat-box"><span class="stat-icon">💰</span><span class="detail-label">Money Used</span><span class="detail-value stat-value money">₹${Number(vehicle.money_used || 0).toFixed(2)}</span></div>
                </div>
            </div>
            <div class="details-section">
                <h6 class="section-title"><span class="section-icon">🔧</span>Service</h6>
                <div class="details-grid">
                    <div class="detail-item"><span class="detail-label">Last Service</span><span class="detail-value">${formatDateDisplay(vehicle.last_service_date)}</span></div>
                </div>
            </div>
        </div>`;
    }

    $(document).on('click', '.card-action-btn.details', function(e) {
        e.stopPropagation();
        const id = $(this).data('id');
        $.ajax({
            url: `/api/vehicles/${id}/`,
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + access },
            success: function(vehicle) {
                $('#vehicleDetailsBody').html(vehicleDetailsHtml(vehicle));
                $('#vehicleDetailsBody').data('vehicle', vehicle);
                $('#vehicleDetailsModal').modal('show');
            }
        });
    });

    $(document).on('click', '.card-action-btn.edit', function(e) {
        e.stopPropagation();
        const id = $(this).data('id');
        const cached = $('#vehicleDetailsBody').data('vehicle');
        if (cached && String(cached.id) === String(id)) {
            populateVehicleForm(cached);
            $('#vehicleModal').modal('show');
            return;
        }
        $.ajax({
            url: `/api/vehicles/${id}/`,
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + access },
            success: function(vehicle) {
                populateVehicleForm(vehicle);
                $('#vehicleModalLabel').text('Edit Vehicle');
                $('.modal-subtitle').text('Update vehicle information');
                $('#vehicleModal').modal('show');
            }
        });
    });

    // Delete with confirmation modal
    $(document).on('click', '.card-action-btn.delete', async function(e) {
        e.stopPropagation();
        const id = $(this).data('id');
        const confirmed = await Toast.confirm('Delete Vehicle', 'This action cannot be undone. All transactions for this vehicle will also be deleted.');
        if (!confirmed) return;

        $.ajax({
            url: `/api/vehicles/${id}/`,
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + access },
            success: function() {
                loadVehicles();
                Toast.success('Deleted', 'Vehicle deleted successfully.');
            },
            error: function(xhr) {
                Toast.error('Error', xhr.responseJSON?.detail || 'Could not delete vehicle.');
            }
        });
    });

    function navigateToTransactions(id) {
        if (!id) return;
        window.location.href = `/txn/${id}/`;
    }

    $(document).on('click', '.vehicle-card-item', function(e) {
        if ($(e.target).closest('button').length) return;
        navigateToTransactions($(this).data('id'));
    });

    $(document).on('keydown', '.vehicle-card-item', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateToTransactions($(this).data('id')); }
    });

    $('#logoutBtn').click(function() {
        sessionStorage.clear();
        window.location.href = '/login';
    });
});
