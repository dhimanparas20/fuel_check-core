$(document).ready(function() {
    // Check for JWT token in sessionStorage
    const access = sessionStorage.getItem('access');
    if (!access) {
        window.location.href = '/auth';
        return;
    }

    const colorProbe = document.createElement('span');
    colorProbe.className = 'vehicle-color-probe';
    colorProbe.style.position = 'absolute';
    colorProbe.style.width = '0';
    colorProbe.style.height = '0';
    colorProbe.style.overflow = 'hidden';
    colorProbe.style.visibility = 'hidden';
    document.body.appendChild(colorProbe);

    function hexToRgb(hex) {
        let normalized = hex.replace('#', '').trim();
        if (![3, 6].includes(normalized.length)) return null;
        if (normalized.length === 3) {
            normalized = normalized.split('').map(ch => ch + ch).join('');
        }
        const num = parseInt(normalized, 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    }

    function parseColor(color) {
        if (!color) return null;
        const trimmed = color.trim();
        const hexMatch = trimmed.match(/^#?[0-9a-fA-F]{3,6}$/);
        if (hexMatch) {
            return hexToRgb(trimmed.startsWith('#') ? trimmed : `#${trimmed}`);
        }
        colorProbe.style.color = '';
        colorProbe.style.color = trimmed;
        if (!colorProbe.style.color) {
            return null;
        }
        const computed = window.getComputedStyle(colorProbe).color;
        const match = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
        if (!match) return null;
        return {
            r: parseInt(match[1], 10),
            g: parseInt(match[2], 10),
            b: parseInt(match[3], 10)
        };
    }

    function formatDateDisplay(value) {
        if (!value) return '—';
        if (typeof value === 'string') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                return value;
            }
            const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
            if (isoMatch) {
                return isoMatch[1];
            }
        }
        const date = new Date(value);
        if (isNaN(date.getTime())) return '—';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatDateForInput(value) {
        if (!value) return '';
        if (typeof value === 'string') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                return value;
            }
            const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
            if (isoMatch) {
                return isoMatch[1];
            }
        }
        const date = new Date(value);
        if (isNaN(date.getTime())) return '';
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${date.getFullYear()}-${month}-${day}`;
    }

    function formatMileage(value) {
        if (value === null || value === undefined || value === '') return '—';
        return `${value} km/l`;
    }

    function sanitizeFormValue(value) {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed === '—' || trimmed === '-') {
                return '';
            }
        }
        return value;
    }

    function populateVehicleForm(vehicle = {}) {
        $('#vehicleId').val(vehicle.id || '');
        $('#regno').val(sanitizeFormValue(vehicle.regno));
        $('#name').val(sanitizeFormValue(vehicle.name));
        $('#fuel_type').val(sanitizeFormValue(vehicle.fuel_type));
        $('#fuel_tank_capacity').val(sanitizeFormValue(vehicle.fuel_tank_capacity));
        
        // Optional fields
        $('#model').val(sanitizeFormValue(vehicle.model));
        $('#color').val(sanitizeFormValue(vehicle.color));
        $('#company').val(sanitizeFormValue(vehicle.company));
        $('#total_kms_driven').val(sanitizeFormValue(vehicle.total_kms_driven));
        $('#last_service_date').val(formatDateForInput(vehicle.last_service_date));
        $('#current_mileage').val(sanitizeFormValue(vehicle.current_mileage));
        $('#average_mileage').val(sanitizeFormValue(vehicle.average_mileage));
    }

    function lightenRgb(rgb, intensity = 0.7) {
        return {
            r: Math.round(rgb.r + (255 - rgb.r) * intensity),
            g: Math.round(rgb.g + (255 - rgb.g) * intensity),
            b: Math.round(rgb.b + (255 - rgb.b) * intensity)
        };
    }

    function buildVehicleCardStyle(color, index) {
        const parsed = parseColor(color);
        if (!parsed) {
            return { column: `--card-index:${index};`, card: '' };
        }
        const tint = lightenRgb(parsed, 0.72);
        const accent = `rgba(${tint.r}, ${tint.g}, ${tint.b}, 0.55)`;
        const border = `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, 0.45)`;
        return {
            column: `--card-index:${index};`,
            card: `--vehicle-accent:${accent}; --vehicle-border:${border};`
        };
    }

    // Fetch and display vehicles
    function loadVehicles() {
        $('#vehicleDetailsBody').removeData('vehicle');
        $.ajax({
            url: '/api/vehicles/',
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + access },
            success: function(data) {
                $('#vehiclesList').empty();
                if (data.length === 0) {
                    $('#vehiclesList').append('<div class="col-12 text-center text-secondary py-5 empty-state">No vehicles yet — add your first ride to begin tracking.</div>');
                } else {
                    data.forEach(function(vehicle, index) {
                        const styles = buildVehicleCardStyle(vehicle.color, index);
                        $('#vehiclesList').append(`
                            <div class="col-12 col-md-6 col-lg-4" style="${styles.column}">
                                <div class="card h-100 shadow-sm vehicle-card" data-id="${vehicle.id}" style="${styles.card}" role="button" tabindex="0" aria-label="Open transactions for ${vehicle.name}">
                                    <div class="card-body d-flex flex-column gap-3">
                                        <div class="vehicle-card-top d-flex justify-content-between align-items-start">
                                            <div>
                                                <h5 class="card-title mb-1 text-capitalize">${vehicle.name}</h5>
                                                <div class="card-subtitle small text-uppercase tracking-wide">Reg · <span class="fw-semibold">${vehicle.regno}</span></div>
                                            </div>
                                            <span class="vehicle-card-chip">${(vehicle.fuel_type || '').toUpperCase()}</span>
                                        </div>
                                        <div class="vehicle-card-stats">
                                            <div class="vehicle-stat">
                                                <span class="stat-label">Mileage</span>
                                                <span class="stat-value">${formatMileage(vehicle.current_mileage)}</span>
                                            </div>
                                            <div class="vehicle-stat">
                                                <span class="stat-label">KMs Driven</span>
                                                <span class="stat-value">${vehicle.total_kms_driven}</span>
                                            </div>
                                            <div class="vehicle-stat">
                                                <span class="stat-label">Last Service</span>
                                                <span class="stat-value">${formatDateDisplay(vehicle.last_service_date)}</span>
                                            </div>
                                        </div>
                                        <div class="vehicle-card-actions d-flex flex-wrap gap-2 mt-auto">
                                            <button class="btn btn-outline-light btn-sm edit-vehicle" data-id="${vehicle.id}">Edit</button>
                                            <button class="btn btn-outline-light btn-sm details-vehicle" data-id="${vehicle.id}">Details</button>
                                            <button class="btn btn-outline-danger btn-sm delete-vehicle" data-id="${vehicle.id}">Delete</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `);
                    });
                }
            },
            error: function(xhr) {
                if (xhr.status === 401) {
                    sessionStorage.clear();
                    window.location.href = '/auth';
                }
            }
        });
    }

    loadVehicles();

    // Add/Edit Vehicle Modal
    $('#vehicleModal').on('show.bs.modal', function(event) {
        const trigger = event.relatedTarget ? $(event.relatedTarget) : null;
        if (!trigger) {
            if (!$('#vehicleId').val()) {
                $('#vehicleForm')[0].reset();
                $('#vehicleModalLabel').text('Add Vehicle');
                $('.modal-subtitle').text('Fill in the details below');
            }
            return;
        }
        const vehicleId = trigger.data('id');
        if (vehicleId) {
            $('#vehicleModalLabel').text('Edit Vehicle');
            $('.modal-subtitle').text('Update vehicle information');
            $.ajax({
                url: `/api/vehicles/${vehicleId}/`,
                method: 'GET',
                headers: { 'Authorization': 'Bearer ' + access },
                success: function(vehicle) {
                    populateVehicleForm(vehicle);
                }
            });
        } else {
            $('#vehicleModalLabel').text('Add Vehicle');
            $('.modal-subtitle').text('Fill in the details below');
            $('#vehicleForm')[0].reset();
            populateVehicleForm({});
        }
    });

    // Save Vehicle (Add/Edit)
    $('#vehicleForm').submit(function(e) {
        e.preventDefault();
        const vehicleId = $('#vehicleId').val();

        // Get raw values for debugging
        const rawCurrentMileage = $('#current_mileage').val();
        const rawLastServiceDate = $('#last_service_date').val();
        console.log('Raw current_mileage:', rawCurrentMileage, 'Type:', typeof rawCurrentMileage);
        console.log('Raw last_service_date:', rawLastServiceDate, 'Type:', typeof rawLastServiceDate);

        // Build data object with only filled values for optional fields
        const data = {
            regno: $('#regno').val().trim(),
            name: $('#name').val().trim(),
            fuel_type: $('#fuel_type').val(),
            fuel_tank_capacity: parseFloat($('#fuel_tank_capacity').val()) || 0
        };

        // Add optional fields only if they have valid values (not empty string)
        const model = $('#model').val().trim();
        if (model && model !== '') data.model = model;

        const company = $('#company').val().trim();
        if (company && company !== '') data.company = company;

        const color = $('#color').val().trim();
        if (color && color !== '') data.color = color;

        const total_kms_driven = $('#total_kms_driven').val();
        if (total_kms_driven && total_kms_driven !== '' && !isNaN(parseFloat(total_kms_driven))) {
            data.total_kms_driven = parseFloat(total_kms_driven);
        }

        const last_service_date = $('#last_service_date').val();
        if (last_service_date && last_service_date !== '') data.last_service_date = last_service_date;

        const current_mileage = $('#current_mileage').val();
        if (current_mileage && current_mileage !== '' && !isNaN(parseFloat(current_mileage))) {
            data.current_mileage = parseFloat(current_mileage);
        }

        const average_mileage = $('#average_mileage').val();
        if (average_mileage && average_mileage !== '' && !isNaN(parseFloat(average_mileage))) {
            data.average_mileage = parseFloat(average_mileage);
        }

        console.log('Data being sent:', JSON.stringify(data, null, 2));

        const method = vehicleId ? 'PATCH' : 'POST';
        const url = vehicleId ? `/api/vehicles/${vehicleId}/` : '/api/vehicles/';
        $.ajax({
            url: url,
            method: method,
            headers: {
                'Authorization': 'Bearer ' + access,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(data),
            success: function() {
                $('#vehicleModal').modal('hide');
                loadVehicles();
            },
            error: function(xhr) {
                alert('Error: ' + (xhr.responseJSON?.detail || 'Could not save vehicle.'));
            }
        });
    });

    function vehicleDetailsHtml(vehicle) {
        const fuelTypeIcon = {
            'petrol': '⛽',
            'diesel': '🛢️',
            'cng': '🔵'
        }[vehicle.fuel_type] || '⛽';

        const colorDot = vehicle.color ? `<span class="color-dot" style="background-color: ${vehicle.color.toLowerCase()}; display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; border: 1px solid rgba(255,255,255,0.3);"></span>` : '';

        return `
        <div class="details-container">
            <!-- Primary Info Section -->
            <div class="details-section primary-section">
                <h6 class="section-title">
                    <span class="section-icon">🚗</span>
                    Primary Information
                </h6>
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="detail-label">Vehicle Name</span>
                        <span class="detail-value highlight">${vehicle.name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Registration No.</span>
                        <span class="detail-value regno">${vehicle.regno.toUpperCase()}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Fuel Type</span>
                        <span class="detail-value fuel-badge">${fuelTypeIcon} ${vehicle.fuel_type.toUpperCase()}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Fuel Tank Capacity</span>
                        <span class="detail-value">${vehicle.fuel_tank_capacity || '-'} L</span>
                    </div>
                </div>
            </div>

            <!-- Vehicle Specs Section -->
            <div class="details-section">
                <h6 class="section-title">
                    <span class="section-icon">📋</span>
                    Vehicle Specifications
                </h6>
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="detail-label">Company</span>
                        <span class="detail-value">${vehicle.company || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Model</span>
                        <span class="detail-value">${vehicle.model || '-'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Color</span>
                        <span class="detail-value">${colorDot}${vehicle.color || '-'}</span>
                    </div>
                </div>
            </div>

            <!-- Performance Stats Section -->
            <div class="details-section stats-section">
                <h6 class="section-title">
                    <span class="section-icon">📊</span>
                    Performance Statistics
                </h6>
                <div class="details-grid stats-grid">
                    <div class="detail-item stat-box">
                        <span class="stat-icon">🚀</span>
                        <span class="detail-label">Current Mileage</span>
                        <span class="detail-value stat-value">${vehicle.current_mileage ? vehicle.current_mileage + ' km/L' : '-'}</span>
                    </div>
                    <div class="detail-item stat-box">
                        <span class="stat-icon">📈</span>
                        <span class="detail-label">Average Mileage</span>
                        <span class="detail-value stat-value">${vehicle.average_mileage ? vehicle.average_mileage + ' km/L' : '-'}</span>
                    </div>
                    <div class="detail-item stat-box">
                        <span class="stat-icon">💰</span>
                        <span class="detail-label">Money Used</span>
                        <span class="detail-value stat-value money">₹${vehicle.money_used || '0.00'}</span>
                    </div>
                </div>
            </div>

            <!-- Service Info Section -->
            <div class="details-section">
                <h6 class="section-title">
                    <span class="section-icon">🔧</span>
                    Service Information
                </h6>
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="detail-label">Last Service Date</span>
                        <span class="detail-value">${formatDateDisplay(vehicle.last_service_date)}</span>
                    </div>
                </div>
            </div>
        </div>`;
    }

    // Details button click
    $(document).on('click', '.details-vehicle', function() {
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

    // Edit button click
    $(document).on('click', '.edit-vehicle', function() {
        const id = $(this).data('id');
        $('#vehicleModalLabel').text('Edit Vehicle');
        const cachedVehicle = $('#vehicleDetailsBody').data('vehicle');
        if (cachedVehicle && String(cachedVehicle.id) === String(id)) {
            populateVehicleForm(cachedVehicle);
            $('#vehicleModal').modal('show');
            return;
        }
        $.ajax({
            url: `/api/vehicles/${id}/`,
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + access },
            success: function(vehicle) {
                populateVehicleForm(vehicle);
                $('#vehicleModal').modal('show');
            }
        });
    });

    // Delete button click
    $(document).on('click', '.delete-vehicle', function() {
        if (!confirm('Are you sure you want to delete this vehicle?')) return;
        const id = $(this).data('id');
        $.ajax({
            url: `/api/vehicles/${id}/`,
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + access },
            success: function() {
                loadVehicles();
            },
            error: function(xhr) {
                alert('Error: ' + (xhr.responseJSON?.detail || 'Could not delete vehicle.'));
            }
        });
    });

    function navigateToTransactions(id) {
        if (!id) return;
        window.location.href = `/txn/${id}/`;
    }

    // Card click opens transactions
    $(document).on('click', '.vehicle-card', function(e) {
        if ($(e.target).closest('button').length) {
            return;
        }
        navigateToTransactions($(this).data('id'));
    });

    // Keyboard accessibility for card navigation
    $(document).on('keydown', '.vehicle-card', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigateToTransactions($(this).data('id'));
        }
    });

    // Logout button
    $('#logoutBtn').click(function() {
        sessionStorage.removeItem('access');
        sessionStorage.removeItem('refresh');
        window.location.href = '/login';
    });
});
