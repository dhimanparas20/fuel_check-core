$(document).ready(function() {
    const access = sessionStorage.getItem('access');
    if (!access) {
        window.location.href = '/login';
        return;
    }
    const vehicleId = window.location.pathname.split('/').filter(Boolean).pop();
    let search = '', sort = '-created_at', filled = '';
    let vehicleData = null;

    // Fetch vehicle details for validation
    function loadVehicleData() {
        $.ajax({
            url: `/api/vehicles/${vehicleId}/`,
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + access },
            success: function(data) {
                vehicleData = data;
            },
            error: function(xhr) {
                if (xhr.status === 401) {
                    sessionStorage.clear();
                    window.location.href = '/login';
                }
            }
        });
    }
    loadVehicleData();

    // Function to populate the transaction form modal
    function populateTxnForm(txn = {}) {
        $('#txnId').val(txn.id || '');
        $('#amount').val(txn.amount || '');
        $('#fuel_qty').val(txn.fuel_qty || '');
        $('#kms_driven').val(txn.kms_driven || '');
        $('#tank_fully_filled').val(txn.tank_fully_filled ? 'true' : 'false');
        $('#location').val(txn.location || '');
        $('#txn_date').val(formatDateForInput(txn.txn_date));
    }

    // Format date for date input (YYYY-MM-DD)
    function formatDateForInput(value) {
        if (!value) return '';
        if (typeof value === 'string') {
            // Handle DD-MM-YYYY HH:MM:SS format
            const customMatch = value.match(/^(\d{2})-(\d{2})-(\d{4})/);
            if (customMatch) {
                return `${customMatch[3]}-${customMatch[2]}-${customMatch[1]}`;
            }
            // Handle ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
            const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
            if (isoMatch) {
                return isoMatch[1];
            }
        }
        const date = new Date(value);
        if (isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Date formatting utility
    function formatDateDisplay(value) {
        if (!value) return '—';
        if (typeof value === 'string') {
            // Handle DD-MM-YYYY HH:MM:SS format (e.g., "17-02-2026 16:52:41")
            const customMatch = value.match(/^(\d{2})-(\d{2})-(\d{4})/);
            if (customMatch) {
                const day = customMatch[1];
                const month = customMatch[2];
                const year = customMatch[3];
                return `${year}-${month}-${day}`;
            }
            // Handle ISO format (e.g., "2026-02-17T16:52:41")
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

    // Function to set loading state for buttons
    function setLoading(button, isLoading) {
        if (!button) return;
        if (isLoading) {
            button.dataset.originalText = button.textContent;
            button.textContent = 'Please wait…';
            button.disabled = true;
        } else {
            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
                delete button.dataset.originalText;
            }
            button.disabled = false;
        }
    }

    function loadTxns() {
        let url = `/api/txns/?vehicle=${vehicleId}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (sort) url += `&ordering=${sort}`;
        if (filled) url += `&tank_fully_filled=${filled}`;
        // REMOVED: pagination parameters (page & page_size)

        $.ajax({
            url: url,
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + access },
            success: function(data) {
                $('#txnList').empty();
                let txns;

                // Handle both array response and paginated response from DRF
                if (Array.isArray(data)) {
                    txns = data;
                } else if (data && Array.isArray(data.results)) {
                    txns = data.results;
                } else {
                    txns = [];
                }

                if (!txns.length) {
                    $('#txnList').append('<div class="empty-state">No transactions recorded yet. Click "Add Transaction" to begin!</div>');
                } else {
                    txns.forEach(function(txn, index) {
                        // Parse decimal values from strings to numbers
                        const currentMileage = txn.current_mileage ? parseFloat(txn.current_mileage) : null;
                        const fuelQty = parseFloat(txn.fuel_qty);
                        const amount = parseFloat(txn.amount);
                        
                        const mileageDisplay = currentMileage 
                            ? `<span class="txn-mileage">${currentMileage.toFixed(1)} km/L</span>`
                            : '<span style="color: var(--text-muted);">-</span>';
                        
                        $('#txnList').append(`
                            <div class="txn-card-item" data-id="${txn.id}" tabindex="0" style="animation-delay: ${index * 0.05}s;">
                                <div class="txn-amount">₹${amount.toFixed(2)}</div>
                                <div class="txn-info">
                                    <div class="txn-location">${txn.location || 'No location'}</div>
                                    <div class="txn-meta">
                                        <span class="txn-meta-item">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3h-2zM4 11V3h3"></path></svg>
                                            ${fuelQty.toFixed(2)}L
                                        </span>
                                        <span class="txn-meta-item">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                            ${txn.tank_fully_filled ? 'Full' : 'Partial'}
                                        </span>
                                    </div>
                                </div>
                                <div class="txn-detail-badge">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>
                                    ${mileageDisplay}
                                </div>
                                <div class="txn-date">${formatDateDisplay(txn.txn_date || txn.created_at)}</div>
                                <div class="txn-actions">
                                    <button class="txn-action-btn edit" data-id="${txn.id}">Edit</button>
                                    <button class="txn-action-btn delete" data-id="${txn.id}">Delete</button>
                                </div>
                            </div>
                        `);
                    });
                }
                // REMOVED: renderPagination() call
            },
            error: function(xhr) {
                if (xhr.status === 401) {
                    sessionStorage.clear();
                    window.location.href = '/login';
                } else {
                    alert('Error loading transactions: ' + (xhr.responseJSON?.detail || 'Unknown error.'));
                }
            }
        });
    }

    // REMOVED: renderPagination() function
    // REMOVED: Pagination click handler

    // Search, sort, filter
    $('#searchInput').on('input', function() { search = $(this).val(); loadTxns(); });
    $('#sortSelect').on('change', function() { sort = $(this).val(); loadTxns(); });
    $('#filterFilled').on('change', function() { filled = $(this).val(); loadTxns(); });

    // Back button
    $('.back-btn').click(function(e) {
        e.preventDefault();
        window.location.href = '/dashboard';
    });

    // Add Transaction button - opens modal
    $('#addTxnBtn').click(function() {
        $('#txnModalLabel').text('Add Transaction');
        populateTxnForm({}); // Clear form for new transaction
        $('#txnModal').modal('show');
    });

    // View Transaction Details (on card click, not action buttons)
    $(document).on('click', '.txn-card-item', function(e) {
        // Only open details if NOT clicking the action buttons
        if ($(e.target).closest('.txn-actions, .txn-action-btn').length) return;
        const txnId = $(this).data('id');
        if (!txnId) return;
        $.ajax({
            url: `/api/txns/${txnId}/`,
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + access },
            success: function(txn) {
                // Parse decimal values from strings
                const amount = parseFloat(txn.amount);
                const fuelQty = parseFloat(txn.fuel_qty);
                const kmsDriven = txn.kms_driven ? parseFloat(txn.kms_driven) : null;
                const currentMileage = txn.current_mileage ? parseFloat(txn.current_mileage) : null;
                
                let html = `<ul style='list-style:none; padding-left:0; margin-bottom:0;'>`;
                html += `<li><strong>Amount:</strong> ₹${amount.toFixed(2)}</li>`;
                html += `<li><strong>Fuel Quantity:</strong> ${fuelQty.toFixed(2)} L</li>`;
                html += `<li><strong>KMs Driven:</strong> ${kmsDriven !== null ? kmsDriven.toFixed(2) : '-'}</li>`;
                html += `<li><strong>Current Mileage:</strong> ${currentMileage !== null ? currentMileage.toFixed(2) + ' km/L' : 'N/A (Tank not full)'}</li>`;
                html += `<li><strong>Full Tank:</strong> ${txn.tank_fully_filled ? 'Yes' : 'No'}</li>`;
                html += `<li><strong>Location:</strong> ${txn.location || '-'}</li>`;
                html += `<li><strong>Transaction Date:</strong> ${formatDateDisplay(txn.txn_date) || formatDateDisplay(txn.created_at)}</li>`;
                html += `</ul>`;
                $('#txnDetailsContent').html(html);
                $('#txnDetailsModal').modal('show');
            },
            error: function(xhr) {
                alert('Error loading transaction details!');
            }
        });
    });

    // Edit Transaction button - opens modal with prefilled data
    $(document).on('click', '.txn-action-btn.edit', function(e) {
        e.stopPropagation(); // Prevent card click from firing
        $('#txnModalLabel').text('Edit Transaction');
        const id = $(this).data('id');
        $.ajax({
            url: `/api/txns/${id}/`,
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + access },
            success: function(txn) {
                populateTxnForm(txn);
                $('#txnModal').modal('show');
            },
            error: function(xhr) {
                alert('Error fetching transaction details: ' + (xhr.responseJSON?.detail || 'Unknown error.'));
            }
        });
    });

    // Save Transaction
    $('#txnForm').submit(function(e) {
        e.preventDefault();
        const txnId = $('#txnId').val();
        const amount = parseFloat($('#amount').val());
        const fuel_qty = parseFloat($('#fuel_qty').val());
        const kms_driven = parseFloat($('#kms_driven').val());
        const location = $('#location').val().trim();

        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount (greater than 0).');
            return;
        }
        if (isNaN(fuel_qty) || fuel_qty <= 0) {
            alert('Please enter a valid fuel quantity (greater than 0).');
            return;
        }
        if (isNaN(kms_driven) || kms_driven < 0) {
            alert('Please enter a valid KMs driven (0 or greater).');
            return;
        }

        // Validate fuel quantity against tank capacity
        if (vehicleData && vehicleData.fuel_tank_capacity) {
            const tankCapacity = parseFloat(vehicleData.fuel_tank_capacity);
            if (fuel_qty > tankCapacity) {
                alert(`Fuel quantity (${fuel_qty}L) cannot exceed tank capacity (${tankCapacity}L).`);
                return;
            }
        }

        const data = {
            amount: amount,
            fuel_qty: fuel_qty,
            kms_driven: kms_driven,
            tank_fully_filled: $('#tank_fully_filled').val() === 'true',
            location: location,
            vehicle: vehicleId
        };

        // Add optional txn_date if provided
        const txnDate = $('#txn_date').val();
        if (txnDate && txnDate !== '') {
            data.txn_date = txnDate;
        }

        const method = txnId ? 'PATCH' : 'POST';
        const url = txnId ? `/api/txns/${txnId}/` : '/api/txns/';
        const submitButton = this.querySelector('button[type="submit"]');

        setLoading(submitButton, true);

        $.ajax({
            url: url,
            method: method,
            headers: {
                'Authorization': 'Bearer ' + access,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(data),
            success: function() {
                $('#txnModal').modal('hide');
                loadTxns();
            },
            error: function(xhr) {
                alert('Error: ' + (xhr.responseJSON?.detail || 'Could not save transaction.'));
            },
            complete: function() {
                setLoading(submitButton, false);
            }
        });
    });

    // Delete Transaction
    $(document).on('click', '.txn-action-btn.delete', function(e) {
        e.stopPropagation(); // Prevent card click from firing
        if (!confirm('Are you sure you want to delete this transaction?')) return;
        const id = $(this).data('id');
        $.ajax({
            url: `/api/txns/${id}/`,
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + access },
            success: function() { loadTxns(); },
            error: function(xhr) { alert('Error: ' + (xhr.responseJSON?.detail || 'Could not delete transaction.')); }
        });
    });

    // Initial load
    loadTxns();
});
