$(document).ready(function() {
    const access = sessionStorage.getItem('access');
    if (!access) {
        window.location.href = '/login';
        return;
    }
    const vehicleId = window.location.pathname.split('/').filter(Boolean).pop();
    let search = '', sort = '-created_at', filled = '';
    let vehicleData = null;

    function loadVehicleData() {
        $.ajax({
            url: `/api/vehicles/${vehicleId}/`,
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + access },
            success: function(data) {
                vehicleData = data;
                if (data.name) {
                    $('.txn-vehicle-name').text(data.name + ' · ' + (data.regno || '').toUpperCase());
                }
            },
            error: function(xhr) {
                if (xhr.status === 401) { sessionStorage.clear(); window.location.href = '/login'; }
            }
        });
    }
    loadVehicleData();

    function populateTxnForm(txn = {}) {
        $('#txnId').val(txn.id || '');
        $('#amount').val(txn.amount || '');
        $('#fuel_qty').val(txn.fuel_qty || '');
        $('#kms_driven').val(txn.kms_driven || '');
        $('#tank_fully_filled').val(txn.tank_fully_filled ? 'true' : 'false');
        $('#location').val(txn.location || '');
        $('#txn_date').val(formatDateForInput(txn.txn_date));
    }

    function formatDateForInput(value) {
        if (!value) return '';
        if (typeof value === 'string') {
            const customMatch = value.match(/^(\d{2})-(\d{2})-(\d{4})/);
            if (customMatch) return `${customMatch[3]}-${customMatch[2]}-${customMatch[1]}`;
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
            const customMatch = value.match(/^(\d{2})-(\d{2})-(\d{4})/);
            if (customMatch) return `${customMatch[3]}-${customMatch[2]}-${customMatch[1]}`;
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
            const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
            if (isoMatch) return isoMatch[1];
        }
        const date = new Date(value);
        if (isNaN(date.getTime())) return '—';
        return date.toISOString().split('T')[0];
    }

    function loadTxns() {
        let url = `/api/txns/?vehicle=${vehicleId}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (sort) url += `&ordering=${sort}`;
        if (filled) url += `&tank_fully_filled=${filled}`;

        $.ajax({
            url: url,
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + access },
            success: function(data) {
                $('#txnList').empty();
                let txns = Array.isArray(data) ? data : (data.results || []);

                if (!txns.length) {
                    $('#txnList').append(`
                        <div class="empty-state">
                            <div class="empty-state-icon">📝</div>
                            <h3>No transactions yet</h3>
                            <p>Add your first fuel transaction to start tracking.</p>
                        </div>`);
                } else {
                    txns.forEach(function(txn, index) {
                        const mileage = txn.current_mileage ? parseFloat(txn.current_mileage) : null;
                        const fuelQty = parseFloat(txn.fuel_qty);
                        const amount = parseFloat(txn.amount);

                        const mileageHtml = mileage
                            ? `<div class="txn-mileage-badge">${mileage.toFixed(1)} km/L</div>`
                            : '<div class="txn-mileage-badge missing">— km/L</div>';

                        const item = $(`
                            <div class="txn-card-item" data-id="${txn.id}" tabindex="0"
                                 style="animation-delay:${index * 0.04}s;">
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
                                ${mileageHtml}
                                <div class="txn-date">${formatDateDisplay(txn.txn_date || txn.created_at)}</div>
                                <div class="txn-actions">
                                    <button class="txn-action-btn edit" data-id="${txn.id}">Edit</button>
                                    <button class="txn-action-btn delete" data-id="${txn.id}">Delete</button>
                                </div>
                            </div>
                        `);
                        $('#txnList').append(item);
                    });
                }
            },
            error: function(xhr) {
                if (xhr.status === 401) { sessionStorage.clear(); window.location.href = '/login'; }
                else { Toast.error('Error', 'Failed to load transactions.'); }
            }
        });
    }

    // Search, sort, filter with debounce
    let searchTimeout;
    $('#searchInput').on('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => { search = $(this).val(); loadTxns(); }, 300);
    });
    $('#sortSelect').on('change', function() { sort = $(this).val(); loadTxns(); });
    $('#filterFilled').on('change', function() { filled = $(this).val(); loadTxns(); });

    $('.back-btn').click(function(e) { e.preventDefault(); window.location.href = '/dashboard'; });

    $('#addTxnBtn').click(function() {
        $('#txnModalLabel').text('Add Transaction');
        populateTxnForm({});
        $('#txnModal').modal('show');
    });

    // View details on card click
    $(document).on('click', '.txn-card-item', function(e) {
        if ($(e.target).closest('.txn-actions, .txn-action-btn').length) return;
        const txnId = $(this).data('id');
        if (!txnId) return;

        $.ajax({
            url: `/api/txns/${txnId}/`,
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + access },
            success: function(txn) {
                const amount = parseFloat(txn.amount);
                const fuelQty = parseFloat(txn.fuel_qty);
                const kmsDriven = txn.kms_driven ? parseFloat(txn.kms_driven) : null;
                const mileage = txn.current_mileage ? parseFloat(txn.current_mileage) : null;

                let html = '<ul>';
                html += `<li><strong>Amount</strong><span>₹${amount.toFixed(2)}</span></li>`;
                html += `<li><strong>Fuel Qty</strong><span>${fuelQty.toFixed(2)} L</span></li>`;
                html += `<li><strong>KMs Driven</strong><span>${kmsDriven !== null ? kmsDriven.toFixed(2) : '-'}</span></li>`;
                html += `<li><strong>Mileage</strong><span>${mileage !== null ? mileage.toFixed(2) + ' km/L' : 'N/A (Tank not full)'}</span></li>`;
                html += `<li><strong>Full Tank</strong><span>${txn.tank_fully_filled ? 'Yes' : 'No'}</span></li>`;
                html += `<li><strong>Location</strong><span>${txn.location || '-'}</span></li>`;
                html += `<li><strong>Date</strong><span>${formatDateDisplay(txn.txn_date || txn.created_at)}</span></li>`;
                html += '</ul>';
                $('#txnDetailsContent').html(html);
                $('#txnDetailsModal').modal('show');
            },
            error: function() { Toast.error('Error', 'Could not load transaction details.'); }
        });
    });

    // Edit
    $(document).on('click', '.txn-action-btn.edit', function(e) {
        e.stopPropagation();
        $('#txnModalLabel').text('Edit Transaction');
        const id = $(this).data('id');
        $.ajax({
            url: `/api/txns/${id}/`,
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + access },
            success: function(txn) { populateTxnForm(txn); $('#txnModal').modal('show'); },
            error: function() { Toast.error('Error', 'Could not fetch transaction.'); }
        });
    });

    // Save transaction
    $('#txnForm').submit(function(e) {
        e.preventDefault();
        const txnId = $('#txnId').val();
        const submitBtn = $(this).find('button[type="submit"]');
        const originalText = submitBtn.text();

        const amount = parseFloat($('#amount').val());
        const fuel_qty = parseFloat($('#fuel_qty').val());
        const kms_driven = parseFloat($('#kms_driven').val());
        const location = $('#location').val().trim();

        if (isNaN(amount) || amount <= 0) { Toast.warning('Validation', 'Please enter a valid amount.'); return; }
        if (isNaN(fuel_qty) || fuel_qty <= 0) { Toast.warning('Validation', 'Please enter a valid fuel quantity.'); return; }
        if (isNaN(kms_driven) || kms_driven < 0) { Toast.warning('Validation', 'Please enter valid KMs driven.'); return; }

        if (vehicleData && vehicleData.fuel_tank_capacity) {
            const tank = parseFloat(vehicleData.fuel_tank_capacity);
            if (fuel_qty > tank) { Toast.warning('Validation', `Fuel quantity exceeds tank capacity (${tank}L).`); return; }
        }

        const data = {
            amount, fuel_qty, kms_driven,
            tank_fully_filled: $('#tank_fully_filled').val() === 'true',
            location, vehicle: vehicleId
        };

        const txnDate = $('#txn_date').val();
        if (txnDate) data.txn_date = txnDate;

        const method = txnId ? 'PATCH' : 'POST';
        const url = txnId ? `/api/txns/${txnId}/` : '/api/txns/';

        submitBtn.prop('disabled', true).html('<span class="spinner"></span> Saving...');

        $.ajax({
            url: url,
            method: method,
            headers: { 'Authorization': 'Bearer ' + access, 'Content-Type': 'application/json' },
            data: JSON.stringify(data),
            success: function() {
                $('#txnModal').modal('hide');
                loadTxns();
                Toast.success('Success', txnId ? 'Transaction updated.' : 'Transaction added.');
            },
            error: function(xhr) {
                Toast.error('Error', xhr.responseJSON?.detail || 'Could not save transaction.');
            },
            complete: function() {
                submitBtn.prop('disabled', false).text(originalText);
            }
        });
    });

    // Delete with confirmation modal
    $(document).on('click', '.txn-action-btn.delete', async function(e) {
        e.stopPropagation();
        const id = $(this).data('id');
        const confirmed = await Toast.confirm('Delete Transaction', 'Are you sure you want to delete this transaction? This cannot be undone.');
        if (!confirmed) return;

        $.ajax({
            url: `/api/txns/${id}/`,
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + access },
            success: function() {
                loadTxns();
                Toast.success('Deleted', 'Transaction deleted successfully.');
            },
            error: function(xhr) {
                Toast.error('Error', xhr.responseJSON?.detail || 'Could not delete transaction.');
            }
        });
    });

    loadTxns();
});
