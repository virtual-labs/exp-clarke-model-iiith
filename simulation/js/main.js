
    const NUM_RECEIVERS = 3;
    const RECEIVER_COLORS = ['#007bff', '#fd7e14', '#dc3545'];
    const c = 3e8;
    const ANIMATION_SPEED_MULTIPLIER = 10;
    const PHYSICS_DT = 0.005; // 200 Hz sample rate

    let obstacles = [], pathPoints = [], pathProperties = {};
    let receivers = [], simStates = [], simulationData = [];
    let animationId = null, simAreaSize = 2000, lastTimestamp = 0;
    let autocorrelationChart = null, psdChart = null;

    // --- INITIALIZATION ---
    window.onload = () => { initCharts(); generateSimulation(); };
    window.addEventListener('resize', () => { if (autocorrelationChart) autocorrelationChart.resize(); if (psdChart) psdChart.resize(); drawSimulation(); });

    function initCharts() {
        const commonOptions = { responsive: true, maintainAspectRatio: false, animation: { duration: 500 }, interaction: { intersect: false, mode: 'index' } };
        autocorrelationChart = new Chart(document.getElementById('autocorrelationChart').getContext('2d'), {
            type: 'line', data: { labels: [], datasets: [] },
            options: { ...commonOptions, plugins: { title: { display: true, text: 'Autocorrelation Comparison by Velocity' }}, scales: { x: { title: { display: true, text: 'Time Lag τ (s)' }}, y: { title: { display: true, text: 'Correlation' }, min: -0.1, max: 1.1 }}}
        });
        psdChart = new Chart(document.getElementById('psdChart').getContext('2d'), {
            type: 'line', data: { labels: [], datasets: [
                 { label: 'Simulated PSD', data: [], borderColor: '#fd7e14', tension: 0.1, pointRadius: 0, fill: true, backgroundColor: 'rgba(253, 126, 20, 0.2)' },
                 { label: "Theoretical Jakes' Spectrum", data: [], borderColor: '#28a745', borderDash: [5, 5], tension: 0.2, pointRadius: 0 }
            ]},
            options: { ...commonOptions, plugins: { title: { display: true, text: 'Power Spectral Density' }}, scales: { x: { title: { display: true, text: 'Frequency Shift from fc (Hz)' }}, y: { title: { display: true, text: 'PSD (dB)' }}}}
        });
    }

    function createCarIcon(color) {
        const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11C5.84 5 5.28 5.42 5.08 6.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`;
        return `data:image/svg+xml;base64,${btoa(svgString)}`;
    }
    const antennaIcon = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#28a745"><path d="M12 4L8 8h3v12h2V8h3l-4-4zM4 18v-2h2v2H4zm14 0v-2h2v2h-2zM6 14v-2h2v2H6zm10 0v-2h2v2h-2z"/></svg>`)}`;

    function generateSimulation() {
        stopAnimation();
        simAreaSize = parseFloat(document.getElementById('simArea').value) * 1000;
        generateObstacles();
        generatePath();
        pathProperties = calculatePathProperties();
        document.getElementById('pathLength').textContent = `${pathProperties.totalLength.toFixed(0)} m`;
        resetAllReceivers();
        clearAllPlots();
        drawSimulation();
    }

    function generateObstacles() {
        obstacles = [];
        const rate = parseFloat(document.getElementById('obstacleRate').value), areaKm2 = (simAreaSize / 1000) ** 2, meanNumObstacles = rate * areaKm2;
        const numObstacles = Math.floor(Math.random() * meanNumObstacles * 2);
        for (let i = 0; i < numObstacles; i++) obstacles.push({ x: (Math.random() - 0.5) * simAreaSize, y: (Math.random() - 0.5) * simAreaSize });
        document.getElementById('totalObstacles').textContent = obstacles.length;
    }

    function generatePath() {
        pathPoints = [];
        const numPoints = parseInt(document.getElementById('numPoints').value);
        if (numPoints < 3) return;
        for (let i = 0; i < numPoints; i++) pathPoints.push({ x: (Math.random() - 0.5) * simAreaSize * 0.8, y: (Math.random() - 0.5) * simAreaSize * 0.8 });
        pathPoints.sort((a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));
        pathPoints.push(pathPoints[0]);
    }

    function calculatePathProperties() {
        const segmentLengths = [], segmentVectors = []; let totalLength = 0;
        if (pathPoints.length < 2) return { segmentLengths, segmentVectors, totalLength };
        for (let i = 0; i < pathPoints.length - 1; i++) {
            const p1 = pathPoints[i], p2 = pathPoints[i + 1];
            const dx = p2.x - p1.x, dy = p2.y - p1.y, len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
                segmentLengths.push(len); totalLength += len;
                segmentVectors.push({ x: dx / len, y: dy / len });
            }
        }
        return { segmentLengths, segmentVectors, totalLength };
    }

    function resetAllReceivers() {
        receivers = []; simStates = []; simulationData = [];
        const startPoint = pathPoints.length > 0 ? pathPoints[0] : { x: 0, y: 0 };
        for (let i = 0; i < NUM_RECEIVERS; i++) {
            receivers.push({ x: startPoint.x, y: startPoint.y, color: RECEIVER_COLORS[i] });
            simStates.push({ isRunning: false, simulationTime: 0, currentSegment: 0, distOnSegment: 0, lapCompleted: false });
            simulationData.push({ channelCoeffs: [] });
        }
    }

    function startMultiVehicleSim() {
        stopAnimation();
        resetAllReceivers();
        clearAllPlots();
        const velocities = [parseFloat(document.getElementById('v1').value), parseFloat(document.getElementById('v2').value), parseFloat(document.getElementById('v3').value)];
        if(velocities.some(isNaN) || velocities.some(v => v <= 0)) return alert("Please enter valid, positive velocities for all vehicles.");
        
        const maxVelocity = Math.max(...velocities);
        document.getElementById('lapTime').textContent = `${(pathProperties.totalLength / maxVelocity).toFixed(1)} s`;
        document.getElementById('status').textContent = "Simulation in progress...";

        for (let i = 0; i < NUM_RECEIVERS; i++) {
            simStates[i].isRunning = true;
            simStates[i].velocity = velocities[i];
        }
        lastTimestamp = 0;
        animationId = requestAnimationFrame(animate);
    }

    function stopAnimation() {
        if (animationId) cancelAnimationFrame(animationId);
        animationId = null;
        simStates.forEach(s => s.isRunning = false);
        document.getElementById('status').textContent = "Simulation stopped.";
    }

    function animate(timestamp) {
        if(lastTimestamp === 0) lastTimestamp = timestamp;
        const real_dt = (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;
        const timeToSimulateThisFrame = real_dt * ANIMATION_SPEED_MULTIPLIER;
        const numSteps = Math.ceil(timeToSimulateThisFrame / PHYSICS_DT);

        let allFinished = true;
        for (let i = 0; i < NUM_RECEIVERS; i++) {
            if (simStates[i].isRunning) {
                allFinished = false;
                for (let step = 0; step < numSteps; step++) {
                    if (!simStates[i].isRunning) break;
                    const { lapJustCompleted } = updateReceiverPosition(i, PHYSICS_DT);
                    if (lapJustCompleted) {
                        simStates[i].isRunning = false;
                        simStates[i].lapCompleted = true;
                        break;
                    } else {
                        const velocityVector = pathProperties.segmentVectors[simStates[i].currentSegment];
                        const channelSample = calculateChannelResponse(i, velocityVector);
                        simulationData[i].channelCoeffs.push(channelSample);
                    }
                }
            }
        }
        drawSimulation();

        if (allFinished || simStates.every(s => s.lapCompleted)) {
            document.getElementById('status').textContent = "All vehicles finished. Plotting results...";
            plotComparisonResults();
            return;
        }
        animationId = requestAnimationFrame(animate);
    }

    function updateReceiverPosition(index, dt) {
        const state = simStates[index], receiver = receivers[index], props = pathProperties;
        state.simulationTime += dt;
        let distToMove = state.velocity * dt;
        while (distToMove > 0) {
            const currentSegmentLength = props.segmentLengths[state.currentSegment];
            const remainingDistOnSegment = currentSegmentLength - state.distOnSegment;
            if (distToMove >= remainingDistOnSegment) {
                distToMove -= remainingDistOnSegment;
                state.distOnSegment = 0;
                const prevSegment = state.currentSegment;
                state.currentSegment = (state.currentSegment + 1) % props.segmentVectors.length;
                if(state.currentSegment < prevSegment) {
                    receiver.x = pathPoints[0].x; receiver.y = pathPoints[0].y;
                    return { lapJustCompleted: true };
                }
            } else {
                state.distOnSegment += distToMove;
                distToMove = 0;
            }
        }
        const startPoint = pathPoints[state.currentSegment], segmentVector = props.segmentVectors[state.currentSegment];
        receiver.x = startPoint.x + segmentVector.x * state.distOnSegment;
        receiver.y = startPoint.y + segmentVector.y * state.distOnSegment;
        return { lapJustCompleted: false };
    }

    function calculateChannelResponse(receiverIndex, velocityVector) {
        const state = simStates[receiverIndex], receiver = receivers[receiverIndex];
        const frequency = parseFloat(document.getElementById('frequency').value) * 1e9;
        const threshold = parseFloat(document.getElementById('threshold').value);
        const fD = frequency * state.velocity / c, d0 = Math.sqrt(receiver.x ** 2 + receiver.y ** 2);
        
        const relevantObstacles = obstacles.filter(obs => {
            const d1 = Math.sqrt(obs.x ** 2 + obs.y ** 2), d2 = Math.sqrt((obs.x - receiver.x) ** 2 + (obs.y - receiver.y) ** 2);
            return Math.abs((d1 + d2) - d0) <= threshold;
        });
        const angles = relevantObstacles.map(obs => {
            const signalVector = { x: obs.x - receiver.x, y: obs.y - receiver.y };
            const dotProduct = signalVector.x * velocityVector.x + signalVector.y * velocityVector.y, magSignal = Math.sqrt(signalVector.x ** 2 + signalVector.y ** 2);
            return magSignal === 0 ? 0 : Math.acos(Math.max(-1, Math.min(1, dotProduct / magSignal)));
        });

        let realPart = 0, imagPart = 0;
        if (angles.length > 0) {
            angles.forEach(angle => { const phase = 2 * Math.PI * fD * Math.cos(angle) * state.simulationTime; realPart += Math.cos(phase); imagPart += Math.sin(phase); });
            const norm = Math.sqrt(angles.length);
            realPart /= norm; imagPart /= norm;
        }
        return { real: realPart, imag: imagPart, time: state.simulationTime };
    }

    function plotComparisonResults() {
        clearAllPlots();
        
        // --- Autocorrelation Plot ---
        const MAX_TIME_LAG = 0.025; // Zoom in to the first 50 milliseconds
        let acfPlotDatasets = [], acfMasterLabels = [];

        for(let i=0; i < NUM_RECEIVERS; i++) {
            const data = simulationData[i].channelCoeffs;
            if (data.length < 50) continue;
            
            const avgDt = data.length > 1 ? (data[data.length-1].time - data[0].time) / (data.length - 1) : 0;
            if (avgDt <= 0) continue;
            
            const maxLagInSamples = Math.ceil(MAX_TIME_LAG / avgDt);
            const { autocorr, lags } = calculateAutocorrelation(data, avgDt, maxLagInSamples);
            
            if (lags.length > acfMasterLabels.length) {
                acfMasterLabels = lags.map(l => l.toFixed(4));
            }

            acfPlotDatasets.push({
                label: `V = ${simStates[i].velocity} m/s`,
                data: autocorr, borderColor: RECEIVER_COLORS[i],
                borderWidth: 2.5, tension: 0.1, pointRadius: 0
            });
        }
        autocorrelationChart.data.labels = acfMasterLabels;
        autocorrelationChart.data.datasets = acfPlotDatasets;
        autocorrelationChart.update();

        if (simulationData[0] && simulationData[0].channelCoeffs.length > 256) {
            const psdData = simulationData[0].channelCoeffs;
            const psdState = simStates[0];
            const avgDt = (psdData[psdData.length-1].time - psdData[0].time) / (psdData.length - 1);
            const sampleRate = 1 / avgDt;

            const { frequencies, psd } = calculatePSD_Welch(psdData, sampleRate);
            const fD = (parseFloat(document.getElementById('frequency').value) * 1e9 * psdState.velocity) / c;
            const { theoreticalFreqs, theoreticalPSD } = calculateTheoreticalPSD(fD, psd);

            psdChart.data.labels = theoreticalFreqs.map(f => f.toFixed(1));
            psdChart.data.datasets[0].label = `Simulated PSD (V=${psdState.velocity} m/s)`;
            psdChart.data.datasets[0].data = psd;
            psdChart.data.datasets[1].label = `Theoretical (V=${psdState.velocity} m/s)`;
            psdChart.data.datasets[1].data = theoreticalPSD;
            psdChart.update();
        }
    }

    function calculateAutocorrelation(data, avgDt, maxLagInSamples) {
        const autocorr = [], lags = [];
        const maxLag = Math.min(maxLagInSamples || data.length - 1, data.length - 1);

        for (let lag = 0; lag <= maxLag; lag++) {
            let sum_real = 0, sum_imag = 0;
            for (let i = 0; i < data.length - lag; i++) {
                const h_t_lag = data[i + lag], h_t_conj = { real: data[i].real, imag: -data[i].imag };
                sum_real += h_t_lag.real * h_t_conj.real - h_t_lag.imag * h_t_conj.imag;
                sum_imag += h_t_lag.real * h_t_conj.imag + h_t_lag.imag * h_t_conj.real;
            }
            const count = data.length - lag;
            autocorr.push(Math.sqrt((sum_real / count) ** 2 + (sum_imag / count) ** 2));
            lags.push(lag * avgDt);
        }
        const r0 = autocorr[0] || 1;
        return { autocorr: autocorr.map(val => val / r0), lags };
    }

    function calculatePSD_Welch(data, sampleRate, segLen = 256, overlap = 0.5) {
        const N = data.length; const step = segLen * (1 - overlap);
        const numSegments = Math.floor((N - segLen) / step) + 1;
        if (numSegments < 1) return { frequencies: [], psd: [] };
        const avgSpectrum = new Array(segLen).fill(0);
        const hannWindow = Array.from({length: segLen}, (_, i) => 0.5 * (1 - Math.cos(2 * Math.PI * i / (segLen - 1))));
        for (let i = 0; i < numSegments; i++) {
            const segment = data.slice(i * step, i * step + segLen);
            const dft_real = new Array(segLen).fill(0), dft_imag = new Array(segLen).fill(0);
            for (let k = 0; k < segLen; k++) {
                for (let n = 0; n < segLen; n++) {
                    const angle = -2 * Math.PI * k * n / segLen;
                    const windowed = {real: segment[n].real * hannWindow[n], imag: segment[n].imag * hannWindow[n]};
                    dft_real[k] += windowed.real * Math.cos(angle) - windowed.imag * Math.sin(angle);
                    dft_imag[k] += windowed.real * Math.sin(angle) + windowed.imag * Math.cos(angle);
                }
            }
            for (let k = 0; k < segLen; k++) avgSpectrum[k] += (dft_real[k]**2 + dft_imag[k]**2);
        }
        const windowPower = hannWindow.reduce((sum, val) => sum + val**2, 0);
        const scale = 1 / (sampleRate * windowPower * numSegments);
        const periodogram = avgSpectrum.map(val => val * scale);
        const shiftedPeriodogram = ((arr) => { const mid = Math.ceil(arr.length / 2); return arr.slice(mid).concat(arr.slice(0, mid)); })(periodogram);
        const psd = shiftedPeriodogram.map(p => 10 * Math.log10(p + 1e-20));
        const frequencies = Array.from({length: segLen}, (_, i) => (i - Math.floor(segLen/2)) * sampleRate / segLen);
        return { frequencies, psd };
    }

    function calculateTheoreticalPSD(fD, simulatedPSD) {
        const numPoints = 256; const theoreticalFreqs = [], theoreticalPSD = [];
        const maxSimulatedPSD = Math.max(...simulatedPSD.filter(isFinite));
        for(let i=0; i < numPoints; i++){
            const f_norm = -1 + (2 * i / (numPoints - 1));
            const f = f_norm * fD; theoreticalFreqs.push(f);
            const term = 1 - (f_norm * f_norm);
            if (term <= 1e-6) { theoreticalPSD.push(maxSimulatedPSD + 3);
            } else {
                const val = 1 / (Math.PI * fD * Math.sqrt(term));
                theoreticalPSD.push(10 * Math.log10(val));
            }
        }
        const maxTheoreticalPSD = Math.max(...theoreticalPSD.filter(isFinite));
        const offset = maxSimulatedPSD - maxTheoreticalPSD;
        return { theoreticalFreqs, theoreticalPSD: theoreticalPSD.map(v => isFinite(v) ? v + offset : NaN) };
    }

    function clearAllPlots() {
        autocorrelationChart.data.labels = []; autocorrelationChart.data.datasets = []; autocorrelationChart.update();
        psdChart.data.labels = []; psdChart.data.datasets.forEach(ds => ds.data = []); psdChart.update();
    }

    function drawSimulation() {
        const svg = document.getElementById('simulationSVG'), rect = svg.getBoundingClientRect();
        const scale = Math.min(rect.width, rect.height) / simAreaSize, centerX = rect.width / 2, centerY = rect.height / 2;
        svg.innerHTML = '';
        if (pathPoints.length > 1) {
            const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            let pathData = `M ${centerX + pathPoints[0].x * scale} ${centerY + pathPoints[0].y * scale}`;
            for (let i = 1; i < pathPoints.length; i++) pathData += ` L ${centerX + pathPoints[i].x * scale} ${centerY + pathPoints[i].y * scale}`;
            pathEl.setAttribute('d', pathData);
            pathEl.setAttribute('fill', 'none'); pathEl.setAttribute('stroke', '#6c757d');
            pathEl.setAttribute('stroke-width', '2'); pathEl.setAttribute('stroke-dasharray', '5,5');
            svg.appendChild(pathEl);
        }
        if(receivers.length > 0 && simStates.some(s=>s.isRunning)) drawSignalPaths(svg, scale, centerX, centerY, receivers[0]);
        obstacles.forEach(obs => { const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); circle.setAttribute('cx', centerX + obs.x * scale); circle.setAttribute('cy', centerY + obs.y * scale); circle.setAttribute('r', '4'); circle.setAttribute('fill', '#6c757d'); svg.appendChild(circle); });
        const txImg = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        const iconSize = 40;
        txImg.setAttribute('href', antennaIcon); txImg.setAttribute('x', centerX - iconSize / 2); txImg.setAttribute('y', centerY - iconSize / 2); txImg.setAttribute('width', iconSize); txImg.setAttribute('height', iconSize);
        svg.appendChild(txImg);
        receivers.forEach(rx => {
            const rxImg = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            rxImg.setAttribute('href', createCarIcon(rx.color));
            rxImg.setAttribute('x', centerX + rx.x * scale - iconSize / 2);
            rxImg.setAttribute('y', centerY + rx.y * scale - iconSize / 2);
            rxImg.setAttribute('width', iconSize);
            rxImg.setAttribute('height', iconSize);
            svg.appendChild(rxImg);
        });
    }

    function drawSignalPaths(svg, scale, centerX, centerY, receiver) {
        const threshold = parseFloat(document.getElementById('threshold').value);
        const d0 = Math.sqrt(receiver.x ** 2 + receiver.y ** 2);
        obstacles.forEach(obs => {
            const d1 = Math.sqrt(obs.x ** 2 + obs.y ** 2), d2 = Math.sqrt((obs.x - receiver.x) ** 2 + (obs.y - receiver.y) ** 2);
            if (Math.abs((d1 + d2) - d0) <= threshold) {
                const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line'), line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line1.setAttribute('x1', centerX); line1.setAttribute('y1', centerY); line1.setAttribute('x2', centerX + obs.x * scale); line1.setAttribute('y2', centerY + obs.y * scale); line1.setAttribute('class', 'signal-line');
                line2.setAttribute('x1', centerX + obs.x * scale); line2.setAttribute('y1', centerY + obs.y * scale); line2.setAttribute('x2', centerX + receiver.x * scale); line2.setAttribute('y2', centerY + receiver.y * scale); line2.setAttribute('class', 'signal-line');
                svg.appendChild(line1); svg.appendChild(line2);
            }
        });
    }
