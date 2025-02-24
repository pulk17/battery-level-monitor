let chart;
let lastLevel = null;
let lastTime = null;
let checkInterval = 10000;
let lastUpdateTime = 0;

// Theme Switching
document.querySelectorAll('[data-theme]').forEach(button => {
    button.addEventListener('click', () => {
        document.body.setAttribute('data-theme', button.dataset.theme);
        localStorage.setItem('preferred-theme', button.dataset.theme);
        updateChartTheme(button.dataset.theme);
    });
});

// Battery Style Switching
document.querySelectorAll('[data-battery]').forEach(button => {
    button.addEventListener('click', () => {
        const container = document.querySelector('.battery-container');
        const batteryLevel = document.querySelector('.battery-level');
        const level = batteryLevel.style.width;
        const color = batteryLevel.style.backgroundColor;

        container.innerHTML = `
            <div class="battery-${button.dataset.battery}">
                <div class="battery-level" id="batteryLevel" style="width: ${level}; background-color: ${color};"></div>
            </div>
        `;
        localStorage.setItem('preferred-battery', button.dataset.battery);
    });
});

// Display Style Selector
document.getElementById('displayStyleSelect').addEventListener('change', (e) => {
    const displayStyle = e.target.value;
    const batteryDisplayCard = document.getElementById('batteryDisplayCard');
    const speedometerDisplayCard = document.getElementById('speedometerDisplayCard');
    const currentLevel = parseInt(document.getElementById('percentage').textContent) || 0;

    if (displayStyle === 'battery') {
        batteryDisplayCard.style.display = 'block';
        speedometerDisplayCard.style.display = 'none';
    } else if (displayStyle === 'speedometer') {
        batteryDisplayCard.style.display = 'none';
        speedometerDisplayCard.style.display = 'block';
        // Animate the needle when switching to speedometer view
        setTimeout(() => animateSpeedometerNeedle(currentLevel), 100);
    }

    localStorage.setItem('preferred-display', displayStyle);
});

// Update Speedometer Needle
function updateSpeedometer(level) {
    const needle = document.querySelector('.needle');
    const angle = (level / 100) * 180 - 90; // Convert percentage to angle (-90 to 90 degrees)
    
    // If the speedometer is currently visible, animate the needle
    const speedometerVisible = document.getElementById('speedometerDisplayCard').style.display !== 'none';
    
    if (speedometerVisible) {
        needle.style.transition = 'transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)';
        needle.style.transform = `rotate(${angle}deg)`;
    } else {
        // Just update position without animation if not visible
        needle.style.transition = 'none';
        needle.style.transform = `rotate(${angle}deg)`;
    }
    
    document.getElementById('speedometerPercentage').textContent = `${level}%`;
}

// Battery tips based on state
function updateBatteryTips(level, isCharging) {
    const tipsElement = document.getElementById('batteryTips');
    const tips = [];

    if (level <= 20) {
        tips.push('Low battery! Consider charging soon to avoid power loss');
        tips.push('Close unnecessary background apps to conserve power');
    } else if (level >= 80 && isCharging) {
        tips.push('Battery is well charged. You can unplug to prevent stress on the battery');
        tips.push('Keeping battery between 20-80% can extend its lifespan');
    }

    if (isCharging) {
        tips.push('Avoid using device in high temperature conditions while charging');
        tips.push('Using original charger helps maintain battery health');
    } else {
        tips.push('Enable power saving mode to extend battery life');
        if (level < 50) {
            tips.push('Reduce screen brightness to save power');
        }
    }

    tipsElement.innerHTML = tips.map(tip => `<div class="tip-item">${tip}</div>`).join('');
}

// Get theme-specific chart colors
function getChartColors(theme) {
    const styles = getComputedStyle(document.body);
    switch (theme) {
        case 'dark':
            return {
                borderColor: '#2dd4bf',
                backgroundColor: 'rgba(45, 212, 191, 0.1)'
            };
        case 'ocean':
            return {
                borderColor: '#06b6d4',
                backgroundColor: 'rgba(6, 182, 212, 0.1)'
            };
        case 'sunset':
            return {
                borderColor: '#f97316',
                backgroundColor: 'rgba(249, 115, 22, 0.1)'
            };
        default:
            return {
                borderColor: '#2dd4bf',
                backgroundColor: '#ccfbf1'
            };
    }
}

// Update chart theme
function updateChartTheme(theme) {
    if (chart) {
        const colors = getChartColors(theme);
        chart.data.datasets[0].borderColor = colors.borderColor;
        chart.data.datasets[0].backgroundColor = colors.backgroundColor;
        chart.options.scales.y.grid.color = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        chart.options.scales.x.grid.color = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        chart.update();
    }
}

// Setup Chart
function setupChart() {
    const ctx = document.getElementById('batteryChart').getContext('2d');
    const theme = document.body.getAttribute('data-theme') || 'light';
    const colors = getChartColors(theme);

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Battery Level',
                data: [],
                borderColor: colors.borderColor,
                backgroundColor: colors.backgroundColor,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    grid: {
                        color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        }
    });
}

// Update Chart
function updateChart(level) {
    const now = Date.now();
    if (now - lastUpdateTime < checkInterval) return;
    lastUpdateTime = now;

    const time = new Date().toLocaleTimeString();

    if (chart.data.labels.length > 20) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }

    chart.data.labels.push(time);
    chart.data.datasets[0].data.push(level);
    chart.update();
}

// Calculate Battery Speed
function calculateSpeed(battery, level) {
    const now = Date.now();

    if (!lastLevel || !lastTime) {
        lastLevel = level;
        lastTime = now;
        return;
    }

    if (now - lastTime >= 5000) {
        const hoursDiff = (now - lastTime) / 3600000;
        const levelDiff = level - lastLevel;
        const speed = Math.abs(levelDiff / hoursDiff).toFixed(1);

        document.getElementById('batterySpeed').textContent = `${speed} %/hr`;
        document.getElementById('powerRateType').textContent =
            battery.charging ? 'Charge Rate' : 'Discharge Rate';

        lastLevel = level;
        lastTime = now;
    }
}

// Assess Battery Health
function assessBatteryHealth(battery) {
    let health = "Excellent";
    let healthColor = getComputedStyle(document.body).getPropertyValue('--primary');

    if (battery.charging && battery.chargingTime === Infinity) {
        health = "Check Charger";
        healthColor = getComputedStyle(document.body).getPropertyValue('--danger');
    } else if (battery.dischargingTime !== Infinity && battery.level === 1) {
        const expectedDuration = 4 * 60 * 60;
        if (battery.dischargingTime < expectedDuration) {
            health = "Degraded";
            healthColor = getComputedStyle(document.body).getPropertyValue('--warning');
        }
    }

    const healthElement = document.getElementById('batteryHealth');
    healthElement.textContent = health;
    healthElement.style.color = healthColor;
}

// Update Battery UI with Animation
function updateBatteryUI(battery) {
    const level = Math.floor(battery.level * 100);
    const batteryLevel = document.getElementById('batteryLevel');
    const styles = getComputedStyle(document.body);

    // Update Battery Display
    document.getElementById('percentage').textContent = `${level}%`;
    document.getElementById('status').textContent =
        `Status: ${battery.charging ? 'Charging' : 'Discharging'}`;

    let batteryColor = level <= 20 ? styles.getPropertyValue('--danger') :
        level <= 50 ? styles.getPropertyValue('--warning') :
            styles.getPropertyValue('--primary');

    // Reset width to 0% before animating
    batteryLevel.style.width = '0%';
    batteryLevel.style.backgroundColor = batteryColor;

    // Animate to the current level
    setTimeout(() => {
        batteryLevel.style.width = `${level}%`;
    }, 10); // Small delay to allow the reset to take effect

    // Update Speedometer Display
    updateSpeedometer(level);
    document.getElementById('speedometerPercentage').textContent = `${level}%`;
    document.getElementById('speedometerStatus').textContent =
        `Status: ${battery.charging ? 'Charging' : 'Discharging'}`;

    const time = battery.charging ? battery.chargingTime : battery.dischargingTime;
    if (time !== Infinity) {
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        document.getElementById('timeRemaining').textContent =
            `${hours}h ${minutes}m`;
    } else if (battery.charging && battery.level === 1) {
        document.getElementById('timeRemaining').textContent = 'Fully Charged';
    } else {
        document.getElementById('timeRemaining').textContent = '--:--';
    }

    calculateSpeed(battery, level);
    updateChart(level);
    assessBatteryHealth(battery);
    updateBatteryTips(level, battery.charging);
}

// Age Modal Handling
const ageModal = document.getElementById('ageModal');
document.getElementById('newDevice').addEventListener('click', () => {
    checkInterval = 60000; // 60 seconds for new devices
    ageModal.style.display = 'none';
    localStorage.setItem('deviceAge', 'new');
});
document.getElementById('oldDevice').addEventListener('click', () => {
    checkInterval = 10000; // 10 seconds for old devices
    ageModal.style.display = 'none';
    localStorage.setItem('deviceAge', 'old');
});

// Settings Dropdown
document.getElementById('settingsButton').addEventListener('click', () => {
    document.getElementById('settingsDropdown').classList.toggle('show');
});

// Close Dropdown When Clicking Outside
window.addEventListener('click', (e) => {
    if (!e.target.closest('.settings-menu')) {
        document.getElementById('settingsDropdown').classList.remove('show');
    }
});

// Theme Select
document.getElementById('themeSelect').addEventListener('change', (e) => {
    const theme = e.target.value;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('preferred-theme', theme);
    updateChartTheme(theme);
});

// Battery Style Select
document.getElementById('batteryStyleSelect').addEventListener('change', (e) => {
    const style = e.target.value;
    const container = document.querySelector('.battery-container');
    const currentLevel = document.querySelector('.battery-level')?.style.width || '0%';
    const currentColor = document.querySelector('.battery-level')?.style.backgroundColor || getComputedStyle(document.body).getPropertyValue('--primary');

    container.innerHTML = `
        <div class="battery-${style}">
            <div class="battery-level" id="batteryLevel" style="width: ${currentLevel}; background-color: ${currentColor}"></div>
        </div>
    `;
    localStorage.setItem('preferred-battery', style);
});

// Load Saved Preferences and Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Show age modal if not previously set
    if (!localStorage.getItem('deviceAge')) {
        ageModal.style.display = 'flex';
    } else {
        checkInterval = localStorage.getItem('deviceAge') === 'new' ? 60000 : 10000;
    }

    // Initialize selects
    const savedTheme = localStorage.getItem('preferred-theme') || 'light';
    const savedBattery = localStorage.getItem('preferred-battery') || 'default';
    const savedDisplayStyle = localStorage.getItem('preferred-display') || 'battery';
    document.getElementById('themeSelect').value = savedTheme;
    document.getElementById('batteryStyleSelect').value = savedBattery;
    document.getElementById('displayStyleSelect').value = savedDisplayStyle;

    // Set initial display style
    const batteryDisplayCard = document.getElementById('batteryDisplayCard');
    const speedometerDisplayCard = document.getElementById('speedometerDisplayCard');
    if (savedDisplayStyle === 'speedometer') {
        batteryDisplayCard.style.display = 'none';
        speedometerDisplayCard.style.display = 'block';
    } else {
        batteryDisplayCard.style.display = 'block';
        speedometerDisplayCard.style.display = 'none';
    }

    // Initialize Battery API
    if ('getBattery' in navigator) {
        setupChart();
        navigator.getBattery().then(battery => {
            updateBatteryUI(battery);

            ['levelchange', 'chargingchange', 'chargingtimechange', 'dischargingtimechange']
                .forEach(event => battery.addEventListener(event, () => updateBatteryUI(battery)));
        });
    } else {
        alert('Battery API not supported on this device');
    }

    // Animate speedometer needle if speedometer is the initial display
    if (savedDisplayStyle === 'speedometer' && 'getBattery' in navigator) {
        navigator.getBattery().then(battery => {
            const level = Math.floor(battery.level * 100);
            setTimeout(() => animateSpeedometerNeedle(level), 500);
        });
    }
});

// Animate Speedometer Needle
function animateSpeedometerNeedle(targetLevel) {
    const needle = document.querySelector('.needle');
    if (!needle) return;
    
    const startAngle = -90; // Starting position (left side)
    const targetAngle = (targetLevel / 100) * 180 - 90; // Target position based on battery level
    
    // Reset to starting position
    needle.style.transition = 'none';
    needle.style.transform = `rotate(${startAngle}deg)`;
    
    // Force reflow to ensure the reset is applied before animation starts
    void needle.offsetWidth;
    
    // Apply smooth animation to target position
    needle.style.transition = 'transform 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
    needle.style.transform = `rotate(${targetAngle}deg)`;
}

// Toggle Display Style
function toggleDisplayStyle(displayStyle) {
    const batteryDisplayCard = document.getElementById('batteryDisplayCard');
    const speedometerDisplayCard = document.getElementById('speedometerDisplayCard');
    const currentLevel = parseInt(document.getElementById('percentage').textContent) || 0;

    if (displayStyle === 'battery') {
        batteryDisplayCard.style.display = 'block';
        speedometerDisplayCard.style.display = 'none';
    } else if (displayStyle === 'speedometer') {
        batteryDisplayCard.style.display = 'none';
        speedometerDisplayCard.style.display = 'block';
        // Animate the needle when switching to speedometer view
        setTimeout(() => animateSpeedometerNeedle(currentLevel), 100);
    }

    localStorage.setItem('preferred-display', displayStyle);
}