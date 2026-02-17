$(document).ready(function() {
    const access = sessionStorage.getItem('access');
    if (!access) {
        window.location.href = '/login';
        return;
    }
    const vehicleId = window.location.pathname.split('/').filter(Boolean).pop();
    let search = '', sort = '-created_at', filled = '';

    // Function to populate the transaction form modal
    function populateTxnForm(txn = {}) {
        $('#txnId').val(txn.id || '');
        $('#amount').val(txn.amount || '');
        $('#fuel_qty').val(txn.fuel_qty || '');
        $('#tank_fully_filled').val(txn.tank_fully_filled ? 'true' : 'false');
        $('#location').val(txn.location || '');
    }

    // Date formatting utility
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
                        $('#txnList').append(`
                            <div class="txn-card-item" data-id="${txn.id}" tabindex="0" style="animation-delay: ${index * 0.05}s;">
                                <div class="txn-amount">₹${txn.amount}</div>
                                <div class="txn-detail">
                                    <span>Fuel:</span>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3h-2zM4 11V3h3"></path></svg>
                                    <span>${txn.fuel_qty} L</span>
                                </div>
                                <div class="txn-detail">
                                    <span>Filled:</span>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                    <span>${txn.tank_fully_filled ? 'Yes' : 'No'}</span>
                                </div>
                                <div class="txn-detail">
                                    <span>Location:</span>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                    <span>${txn.location || 'N/A'}</span>
                                </div>
                                <div class="txn-date">${formatDateDisplay(txn.created_at)}</div>
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
                let html = `<ul style='list-style:none; padding-left:0; margin-bottom:0;'>`;
                html += `<li><strong>Amount:</strong> ₹${txn.amount}</li>`;
                html += `<li><strong>Fuel Quantity:</strong> ${txn.fuel_qty} L</li>`;
                html += `<li><strong>Filled:</strong> ${txn.tank_fully_filled ? 'Yes' : 'No'}</li>`;
                html += `<li><strong>Location:</strong> ${txn.location || '-'}</li>`;
                html += `<li><strong>Created at:</strong> ${formatDateDisplay(txn.created_at)}</li>`;
                html += `<li><strong>Updated at:</strong> ${formatDateDisplay(txn.updated_at)}</li>`;
                if (typeof txn.kms_driven !== 'undefined') html += `<li><strong>KMs Driven:</strong> ${txn.kms_driven}</li>`;
                if (txn.current_mileage !== null && typeof txn.current_mileage !== 'undefined') html += `<li><strong>Current Mileage:</strong> ${txn.current_mileage}</li>`;
                html += `<li><strong>Transaction ID:</strong> ${txn.id}</li>`;
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
        const location = $('#location').val().trim();

        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount (greater than 0).');
            return;
        }
        if (isNaN(fuel_qty) || fuel_qty <= 0) {
            alert('Please enter a valid fuel quantity (greater than 0).');
            return;
        }

        const data = {
            amount: amount,
            fuel_qty: fuel_qty,
            tank_fully_filled: $('#tank_fully_filled').val() === 'true',
            location: location,
            vehicle: vehicleId
        };

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
