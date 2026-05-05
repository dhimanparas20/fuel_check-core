$(document).ready(function() {
    const access = sessionStorage.getItem('access');
    if (!access) { window.location.href = '/login'; return; }

    const vehicleId = window.location.pathname.split('/').filter(Boolean).pop();

    let vehicleData = null;
    let mileageChart = null, spendingChart = null, priceChart = null;

    function loadVehicle() {
        $.ajax({
            url: `/api/vehicles/${vehicleId}/`,
            headers: { 'Authorization': 'Bearer ' + access },
            success: function(data) {
                vehicleData = data;
                $('#vehicleName').text(data.name + ' · ' + data.regno.toUpperCase());
            }
        });
    }

    function loadAnalytics() {
        $.ajax({
            url: `/api/vehicles/${vehicleId}/analytics/`,
            headers: { 'Authorization': 'Bearer ' + access },
            success: function(data) {
                renderSummary(data.summary);
                renderMileageChart(data.mileage_trend);
                renderSpendingChart(data.spending_trend);
                renderPriceChart(data.price_trend);
            },
            error: function() { Toast.error('Error', 'Failed to load analytics.'); }
        });
    }

    function renderSummary(s) {
        const bestMi = s.best_mileage ? s.best_mileage.toFixed(1) + ' km/L' : '—';
        const worstMi = s.worst_mileage ? s.worst_mileage.toFixed(1) + ' km/L' : '—';

        $('#summaryCards').html(`
            <div class="summary-card">
                <div class="sc-icon">📊</div>
                <div class="sc-label">Total Transactions</div>
                <div class="sc-value blue">${s.total_txns}</div>
            </div>
            <div class="summary-card">
                <div class="sc-icon">₹</div>
                <div class="sc-label">Total Spent</div>
                <div class="sc-value green">₹${s.total_spent.toLocaleString()}</div>
            </div>
            <div class="summary-card">
                <div class="sc-icon">🛣️</div>
                <div class="sc-label">Total KMs</div>
                <div class="sc-value">${s.total_kms.toLocaleString()}</div>
            </div>
            <div class="summary-card">
                <div class="sc-icon">💰</div>
                <div class="sc-label">Cost / KM</div>
                <div class="sc-value">₹${s.cost_per_km.toFixed(2)}</div>
            </div>
            <div class="summary-card">
                <div class="sc-icon">📈</div>
                <div class="sc-label">Avg Mileage</div>
                <div class="sc-value green">${s.avg_mileage.toFixed(1)} km/L</div>
            </div>
            <div class="summary-card">
                <div class="sc-icon">🏆</div>
                <div class="sc-label">Best / Worst</div>
                <div class="sc-value" style="font-size:1rem">${bestMi} / ${worstMi}</div>
            </div>
        `);
    }

    function renderMileageChart(trend) {
        if (mileageChart) mileageChart.destroy();
        const ctx = document.getElementById('mileageChart').getContext('2d');

        if (!trend.length) {
            ctx.canvas.parentElement.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:3rem">No mileage data yet. Fill a full tank to record mileage.</p>';
            return;
        }

        mileageChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trend.map(t => t.date),
                datasets: [{
                    label: 'Mileage (km/L)',
                    data: trend.map(t => t.mileage),
                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56,189,248,0.1)',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointBackgroundColor: '#38bdf8',
                    borderWidth: 2.5,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#94a3b8', maxTicksLimit: 10 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }

    function renderSpendingChart(trend) {
        if (spendingChart) spendingChart.destroy();
        const ctx = document.getElementById('spendingChart').getContext('2d');

        if (!trend.length) {
            ctx.canvas.parentElement.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:3rem">No spending data yet.</p>';
            return;
        }

        spendingChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: trend.slice(-12).map(t => t.date),
                datasets: [{
                    label: 'Amount (₹)',
                    data: trend.slice(-12).map(t => t.amount),
                    backgroundColor: 'rgba(34,197,94,0.3)',
                    borderColor: '#22c55e',
                    borderWidth: 1.5,
                    borderRadius: 6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#94a3b8', maxTicksLimit: 8 }, grid: { display: false } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }

    function renderPriceChart(trend) {
        if (priceChart) priceChart.destroy();
        const ctx = document.getElementById('priceChart').getContext('2d');

        if (!trend.length) {
            ctx.canvas.parentElement.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:3rem">No price data yet.</p>';
            return;
        }

        priceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trend.slice(-12).map(t => t.date),
                datasets: [{
                    label: '₹/Litre',
                    data: trend.slice(-12).map(t => t.price_per_liter),
                    borderColor: '#fbbf24',
                    backgroundColor: 'rgba(251,191,36,0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: '#fbbf24',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#94a3b8', maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }

    // --- Service Records ---
    function loadServices() {
        $.ajax({
            url: `/api/services/?vehicle=${vehicleId}`,
            headers: { 'Authorization': 'Bearer ' + access },
            success: function(data) {
                const list = Array.isArray(data) ? data : (data.results || []);
                const $slist = $('#serviceList').empty();

                if (!list.length) {
                    $slist.append('<div style="text-align:center;color:var(--text-muted);padding:1.5rem">No service records yet.</div>');
                    return;
                }

                list.forEach(function(sr) {
                    const cost = parseFloat(sr.cost);
                    const costDisplay = cost > 0 ? '₹' + cost.toFixed(2) : '';

                    $slist.append(`
                        <div class="service-item">
                            <span class="service-type-badge">${sr.service_type_display}</span>
                            <div class="si-meta">
                                <span>📅 ${sr.service_date}</span>
                                ${sr.odometer_reading ? '<span>🔢 ' + sr.odometer_reading + ' km</span>' : ''}
                                ${sr.garage_name ? '<span>🏪 ' + sr.garage_name + '</span>' : ''}
                            </div>
                            ${costDisplay ? '<span class="si-cost">' + costDisplay + '</span>' : ''}
                            <button class="si-delete" data-id="${sr.id}">×</button>
                        </div>
                    `);
                });
            }
        });
    }

    $('#addServiceBtn').click(function() { $('#serviceForm').toggleClass('active'); });
    $('#cancelServiceBtn').click(function() { $('#serviceForm').removeClass('active'); });

    $('#saveServiceBtn').click(function() {
        const data = {
            vehicle: vehicleId,
            service_date: $('#sr_date').val() || new Date().toISOString().split('T')[0],
            service_type: $('#sr_type').val(),
            cost: parseFloat($('#sr_cost').val()) || 0,
            garage_name: $('#sr_garage').val().trim(),
            odometer_reading: parseFloat($('#sr_odo').val()) || null,
        };

        $.ajax({
            url: '/api/services/',
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + access, 'Content-Type': 'application/json' },
            data: JSON.stringify(data),
            success: function() {
                $('#serviceForm').removeClass('active');
                loadServices();
                Toast.success('Added', 'Service record saved.');
            },
            error: function(xhr) {
                Toast.error('Error', xhr.responseJSON?.detail || 'Could not save.');
            }
        });
    });

    $(document).on('click', '.si-delete', function(e) {
        e.stopPropagation();
        const id = $(this).data('id');
        if (!id) return;

        Toast.confirm('Delete Service Record', 'Remove this service record?').then(function(ok) {
            if (!ok) return;
            $.ajax({
                url: `/api/services/${id}/`,
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + access },
                success: function() {
                    loadServices();
                    Toast.success('Deleted', 'Service record removed.');
                }
            });
        });
    });

    loadVehicle();
    loadAnalytics();
    loadServices();
});
