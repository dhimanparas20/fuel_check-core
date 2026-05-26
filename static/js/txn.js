$(document).ready(function() {
    const access = localStorage.getItem('access');
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
                if (xhr.status === 401) { localStorage.clear(); window.location.href = '/login'; }
            }
        });
    }
    loadVehicleData();

    function populateTxnForm(txn) {
        txn = txn || {};
        $('#txnId').val(txn.id || '');
        $('#amount').val(txn.amount || '');
        $('#fuel_qty').val(txn.fuel_qty || '');
        $('#kms_driven').val(txn.kms_driven || '');
        $('#tank_fully_filled').val(txn.tank_fully_filled ? 'true' : 'false');
        $('#location').val(txn.location || '');
        var dateVal = formatDateForInput(txn.txn_date);
        if (!dateVal && !txn.id) {
            dateVal = new Date().toISOString().split('T')[0];
        }
        $('#txn_date').val(dateVal);
    }

    function formatDateForInput(value) {
        if (!value) return '';
        if (typeof value === 'string') {
            var cm = value.match(/^(\d{2})-(\d{2})-(\d{4})/);
            if (cm) return cm[3] + '-' + cm[2] + '-' + cm[1];
            var im = value.match(/^(\d{4}-\d{2}-\d{2})/);
            if (im) return im[1];
        }
        var date = new Date(value);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    }

    function formatDateDisplay(value) {
        if (!value) return '—';
        if (typeof value === 'string') {
            var cm = value.match(/^(\d{2})-(\d{2})-(\d{4})/);
            if (cm) return cm[3] + '-' + cm[2] + '-' + cm[1];
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
            var im = value.match(/^(\d{4}-\d{2}-\d{2})/);
            if (im) return im[1];
        }
        var date = new Date(value);
        if (isNaN(date.getTime())) return '—';
        return date.toISOString().split('T')[0];
    }

    function loadTxns() {
        var url = '/api/txns/?vehicle=' + vehicleId;
        if (search) url += '&search=' + encodeURIComponent(search);
        if (sort) url += '&ordering=' + sort;
        if (filled) url += '&tank_fully_filled=' + filled;

        Loader.show();

        $.ajax({
            url: url,
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + access },
            success: function(data) {
                Loader.hide();
                $('#txnList').empty();
                var txns = Array.isArray(data) ? data : (data.results || []);

                if (!txns.length) {
                    $('#txnList').append('<div class="empty-state"><div class="empty-state-icon">📝</div><h3>No transactions yet</h3><p>Add your first fuel transaction to start tracking.</p></div>');
                } else {
                    txns.forEach(function(txn, index) {
                        var mileage = txn.current_mileage ? parseFloat(txn.current_mileage) : null;
                        var fuelQty = parseFloat(txn.fuel_qty);
                        var amount = parseFloat(txn.amount);
                        var ppl = txn.price_per_liter ? parseFloat(txn.price_per_liter) : null;

                        var mileageHtml = mileage
                            ? '<div class="txn-mileage-badge">' + mileage.toFixed(1) + ' km/L</div>'
                            : '<div class="txn-mileage-badge missing">— km/L</div>';

                        $('#txnList').append(
                            '<div class="txn-card-item" data-id="' + txn.id + '" tabindex="0" style="animation-delay:' + (index * 0.04) + 's;">' +
                            '<div class="txn-amount">₹' + amount.toFixed(2) + '</div>' +
                            '<div class="txn-info">' +
                            '<div class="txn-location">' + (txn.location || 'No location') + '</div>' +
                            '<div class="txn-meta">' +
                            '<span class="txn-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3h-2zM4 11V3h3"></path></svg> ' + fuelQty.toFixed(2) + 'L</span>' +
                            '<span class="txn-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> ' + (txn.tank_fully_filled ? 'Full' : 'Partial') + '</span>' +
                            (ppl ? '<span class="txn-meta-item" style="color:var(--warning,#fbbf24)">₹' + ppl.toFixed(2) + '/L</span>' : '') +
                            '</div></div>' +
                            mileageHtml +
                            '<div class="txn-date">' + formatDateDisplay(txn.txn_date || txn.created_at) + '</div>' +
                            '<div class="txn-actions">' +
                            '<button class="txn-action-btn edit" data-id="' + txn.id + '">Edit</button>' +
                            '<button class="txn-action-btn delete" data-id="' + txn.id + '">Delete</button>' +
                            '</div></div>'
                        );
                    });
                }
            },
            error: function(xhr) {
                Loader.hide();
                if (xhr.status === 401) { localStorage.clear(); window.location.href = '/login'; }
                else { Toast.error('Error', 'Failed to load transactions.'); }
            }
        });
    }

    var searchTimeout;
    $('#searchInput').on('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function() { search = $('#searchInput').val(); loadTxns(); }, 300);
    });
    $('#sortSelect').on('change', function() { sort = $(this).val(); loadTxns(); });
    $('#filterFilled').on('change', function() { filled = $(this).val(); loadTxns(); });

    $('.back-btn').click(function(e) { e.preventDefault(); window.location.href = '/dashboard'; });

    // Add Transaction button
    $('#addTxnBtn').click(function() {
        $('#txnModalLabel').text('Add Transaction');
        populateTxnForm();
        $('#txnModal').modal('show');
    });

    // Edit Transaction button
    $(document).on('click', '.txn-action-btn.edit', function(e) {
        e.stopPropagation();
        $('#txnModalLabel').text('Edit Transaction');
        var id = $(this).data('id');
        $.ajax({
            url: '/api/txns/' + id + '/',
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + access },
            success: function(txn) { populateTxnForm(txn); $('#txnModal').modal('show'); },
            error: function() { Toast.error('Error', 'Could not fetch transaction.'); }
        });
    });

    // Save Transaction
    $('#txnForm').submit(function(e) {
        e.preventDefault();
        var txnId = $('#txnId').val();
        var submitBtn = $(this).find('button[type="submit"]');
        var originalText = submitBtn.text();

        var amount = parseFloat($('#amount').val());
        var fuel_qty = parseFloat($('#fuel_qty').val());
        var kms_driven = parseFloat($('#kms_driven').val());
        var location = $('#location').val().trim();

        if (isNaN(amount) || amount <= 0) { Toast.warning('Validation', 'Please enter a valid amount.'); return; }
        if (isNaN(fuel_qty) || fuel_qty <= 0) { Toast.warning('Validation', 'Please enter a valid fuel quantity.'); return; }
        if (isNaN(kms_driven) || kms_driven < 0) { Toast.warning('Validation', 'Please enter valid KMs driven.'); return; }

        if (vehicleData && vehicleData.fuel_tank_capacity) {
            var tank = parseFloat(vehicleData.fuel_tank_capacity);
            if (fuel_qty > tank) { Toast.warning('Validation', 'Fuel quantity exceeds tank capacity (' + tank + 'L).'); return; }
        }

        var data = {
            amount: amount,
            fuel_qty: fuel_qty,
            kms_driven: kms_driven,
            tank_fully_filled: $('#tank_fully_filled').val() === 'true',
            location: location,
            vehicle: vehicleId
        };

        var txnDate = $('#txn_date').val();
        if (txnDate) data.txn_date = txnDate;

        var method = txnId ? 'PATCH' : 'POST';
        var url = txnId ? '/api/txns/' + txnId + '/' : '/api/txns/';

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

    var txnMap = null;

    // View details
    $(document).on('click', '.txn-card-item', function(e) {
        if ($(e.target).closest('.txn-actions, .txn-action-btn').length) return;
        var txnId = $(this).data('id');
        if (!txnId) return;

        // Destroy previous map
        if (txnMap) { txnMap.remove(); txnMap = null; }
        $('#txnMapContainer').hide();
        $('#txnComparison').empty();

        $.ajax({
            url: '/api/txns/' + txnId + '/',
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + access },
            success: function(txn) {
                var amount = parseFloat(txn.amount);
                var fuelQty = parseFloat(txn.fuel_qty);
                var kmsDriven = txn.kms_driven ? parseFloat(txn.kms_driven) : null;
                var mileage = txn.current_mileage ? parseFloat(txn.current_mileage) : null;
                var ppl = txn.price_per_liter ? parseFloat(txn.price_per_liter) : null;

                var html = '<ul>';
                html += '<li><strong>Amount</strong><span>₹' + amount.toFixed(2) + '</span></li>';
                html += '<li><strong>Fuel Qty</strong><span>' + fuelQty.toFixed(2) + ' L</span></li>';
                html += '<li><strong>Price / L</strong><span>' + (ppl ? '₹' + ppl.toFixed(2) : '—') + '</span></li>';
                html += '<li><strong>KMs Driven</strong><span>' + (kmsDriven !== null ? kmsDriven.toFixed(2) : '-') + '</span></li>';
                html += '<li><strong>Mileage</strong><span>' + (mileage !== null ? mileage.toFixed(2) + ' km/L' : 'N/A') + '</span></li>';
                html += '<li><strong>Tank</strong><span>' + (txn.tank_fully_filled ? 'Full' : 'Partial') + '</span></li>';
                html += '<li><strong>Location</strong><span>' + (txn.location || '—') + '</span></li>';
                html += '<li><strong>Date</strong><span>' + formatDateDisplay(txn.txn_date || txn.created_at) + '</span></li>';
                html += '</ul>';
                $('#txnDetailsContent').html(html);

                // Show map if location exists
                if (txn.location && txn.location !== '—') {
                    geocodeAndShowMap(txn.location);
                }

                // Load comparison
                loadComparison(txn);
                $('#txnDetailsModal').modal('show');
            },
            error: function() { Toast.error('Error', 'Could not load transaction details.'); }
        });
    });

    function geocodeAndShowMap(location) {
        $.ajax({
            url: 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(location),
            dataType: 'json',
            success: function(results) {
                if (!results || !results.length) return;
                var r = results[0];
                var lat = parseFloat(r.lat);
                var lon = parseFloat(r.lon);
                if (isNaN(lat) || isNaN(lon)) return;

                setTimeout(function() {
                    $('#txnMapContainer').show();
                    txnMap = L.map('txnMap').setView([lat, lon], 14);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; OpenStreetMap',
                        maxZoom: 18,
                    }).addTo(txnMap);
                    L.marker([lat, lon]).addTo(txnMap).bindPopup(location.substring(0, 60)).openPopup();
                    setTimeout(function() { txnMap.invalidateSize(); }, 200);
                }, 300);
            }
        });
    }

    function loadComparison(txn) {
        $.ajax({
            url: '/api/txns/?vehicle=' + vehicleId + '&ordering=-created_at&page_size=50',
            headers: { 'Authorization': 'Bearer ' + access },
            success: function(data) {
                var txns = Array.isArray(data) ? data : (data.results || []);
                var idx = -1;
                for (var i = 0; i < txns.length; i++) {
                    if (String(txns[i].id) === String(txn.id)) { idx = i; break; }
                }
                if (idx < 0 || idx >= txns.length - 1) return;

                var prev = txns[idx + 1];
                var currAmount = parseFloat(txn.amount);
                var prevAmount = parseFloat(prev.amount);
                var currPPL = txn.price_per_liter ? parseFloat(txn.price_per_liter) : 0;
                var prevPPL = prev.price_per_liter ? parseFloat(prev.price_per_liter) : 0;
                var currKm = txn.current_mileage ? parseFloat(txn.current_mileage) : 0;
                var prevKm = prev.current_mileage ? parseFloat(prev.current_mileage) : 0;

                var amtDiff = prevAmount > 0 ? ((currAmount - prevAmount) / prevAmount * 100) : 0;
                var pplDiff = prevPPL > 0 ? ((currPPL - prevPPL) / prevPPL * 100) : 0;
                var kmDiff = prevKm > 0 ? ((currKm - prevKm) / prevKm * 100) : 0;

                var compHtml = '<div class="comparison-box">';
                compHtml += '<div class="comp-item"><div class="comp-label">Amount vs Last</div><div class="comp-value ' + (amtDiff <= 0 ? 'up' : 'down') + '">' + (amtDiff >= 0 ? '+' : '') + amtDiff.toFixed(1) + '%</div></div>';
                compHtml += '<div class="comp-item"><div class="comp-label">₹/L vs Last</div><div class="comp-value ' + (pplDiff <= 0 ? 'up' : 'down') + '">' + (pplDiff >= 0 ? '+' : '') + pplDiff.toFixed(1) + '%</div></div>';
                compHtml += '<div class="comp-item"><div class="comp-label">Mileage vs Last</div><div class="comp-value ' + (kmDiff >= 0 ? 'up' : 'down') + '">' + (kmDiff >= 0 ? '+' : '') + kmDiff.toFixed(1) + '%</div></div>';
                compHtml += '<div class="comp-item"><div class="comp-label">Prev Location</div><div class="comp-value" style="font-weight:500;font-size:0.78rem">' + (prev.location || '—').substring(0, 25) + '</div></div>';
                compHtml += '</div>';
                $('#txnComparison').html(compHtml);
            }
        });
    }

    // Cleanup map on modal close
    $('#txnDetailsModal').on('hidden.bs.modal', function() {
        if (txnMap) { txnMap.remove(); txnMap = null; }
        $('#txnMapContainer').hide();
        $('#txnComparison').empty();
    });

    // Delete
    $(document).on('click', '.txn-action-btn.delete', async function(e) {
        e.stopPropagation();
        var id = $(this).data('id');
        var confirmed = await Toast.confirm('Delete Transaction', 'Are you sure you want to delete this transaction?');
        if (!confirmed) return;
        $.ajax({
            url: '/api/txns/' + id + '/',
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + access },
            success: function() { loadTxns(); Toast.success('Deleted', 'Transaction deleted.'); },
            error: function(xhr) { Toast.error('Error', xhr.responseJSON?.detail || 'Could not delete transaction.'); }
        });
    });

    // Location autocomplete (client-side Nominatim API)
    var locSearchTimer;
    $('#location').on('input', function() {
        var q = $(this).val().trim();
        if (q.length < 2) { $('#locationSuggestions').hide().empty(); return; }
        clearTimeout(locSearchTimer);
        locSearchTimer = setTimeout(function() {
            $.ajax({
                url: 'https://nominatim.openstreetmap.org/search?format=json&limit=5&q=' + encodeURIComponent(q),
                dataType: 'json',
                success: function(results) {
                    var $sug = $('#locationSuggestions').empty();
                    if (!results || !results.length) { $sug.hide(); return; }
                    results.forEach(function(r) {
                        $sug.append('<div class="loc-suggestion" data-lat="' + r.lat + '" data-lon="' + r.lon + '" style="padding:0.5rem 0.8rem;cursor:pointer;font-size:0.8rem;border-bottom:1px solid var(--border);color:var(--text-muted)">' + (r.display_name || '').substring(0, 80) + '</div>');
                    });
                    $('.loc-suggestion').hover(function(){$(this).css({background:'rgba(255,255,255,0.04)',color:'var(--text)'});}, function(){$(this).css({background:'transparent',color:'var(--text-muted)'});});
                    $sug.show();
                }
            });
        }, 400);
    });

    $(document).on('click', '#locationSuggestions .loc-suggestion', function() {
        $('#location').val($(this).text());
        $('#locationSuggestions').hide();
    });

    $(document).on('click', function(e) {
        if (!$(e.target).closest('#location, #locationSuggestions').length) {
            $('#locationSuggestions').hide();
        }
    });

    loadTxns();
});
