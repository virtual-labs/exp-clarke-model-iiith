            // Physical constants
            const SPEED_OF_LIGHT = 3e8;

            // Current active tab
            let currentTab = 'clarkes';

            // Chart variables
            let receivedSignalChart = null;
            let autocorrelationChart = null;
            let psdChart = null;
            let realisticAutocorrelationChart = null;
            let realisticPsdChart = null;

            // DOM elements - Clarke's Ideal Model
            const velocity1Input = document.getElementById('velocity1');
            const velocity2Input = document.getElementById('velocity2');
            const velocity3Input = document.getElementById('velocity3');
            const frequencyInput = document.getElementById('frequency');
            const scatterersInput = document.getElementById('scatterers');
            const envCanvas = document.getElementById('environmentCanvas');
            const envCtx = envCanvas.getContext('2d');
            const signalFrequencyInput = document.getElementById('signal-frequency');

            // DOM elements - Realistic Model
            const velocityRealisticInput = document.getElementById('velocity-realistic');
            const frequencyRealisticInput = document.getElementById('frequency-realistic');
            const multipathsInput = document.getElementById('multipaths');
            const samplesInput = document.getElementById('samples');
            const realisticEnvCanvas = document.getElementById('realisticEnvironmentCanvas');
            const realisticEnvCtx = realisticEnvCanvas.getContext('2d');

            // Checkboxes for plots
            const v1AutocorrCheck = document.getElementById('v1-autocorr-check');
            const v2AutocorrCheck = document.getElementById('v2-autocorr-check');
            const v3AutocorrCheck = document.getElementById('v3-autocorr-check');
            const v1PsdCheck = document.getElementById('v1-psd-check');
            const v2PsdCheck = document.getElementById('v2-psd-check');
            const v3PsdCheck = document.getElementById('v3-psd-check');

            // Switch between tabs
            function switchTab(tabName, event) {
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.querySelectorAll('.tab-button').forEach(button => {
                    button.classList.remove('active');
                });
                document.getElementById(tabName).classList.add('active');
                event.target.classList.add('active');
                currentTab = tabName;
                
                if (tabName === 'clarkes') {
                    drawEnvironment();
                } else {
                    drawRealisticEnvironment();
                }
            }

            // Bessel function J0 approximation
            function besselJ0(x) {
                if (Math.abs(x) < 8.0) {
                    const y = x * x;
                    const ans1 = 57568490574.0 + y * (-13362590354.0 + y * (651619640.7 +
                        y * (-11214424.18 + y * (77392.33017 + y * (-184.9052456)))));
                    const ans2 = 57568490411.0 + y * (1029532985.0 + y * (9494680.718 +
                        y * (59272.64853 + y * (267.8532712 + y * 1.0))));
                    return ans1 / ans2;
                } else {
                    const z = 8.0 / x;
                    const y = z * z;
                    const xx = x - 0.785398164;
                    const ans1 = 1.0 + y * (-0.1098628627e-2 + y * (0.2734510407e-4 +
                        y * (-0.2073370639e-5 + y * 0.2093887211e-6)));
                    const ans2 = -0.1562499995e-1 + y * (0.1430488765e-3 +
                        y * (-0.6911147651e-5 + y * (0.7621095161e-6 - y * 0.934935152e-7)));
                    return Math.sqrt(0.636619772 / x) * (Math.cos(xx) * ans1 - z * Math.sin(xx) * ans2);
                }
            }

            // Generate Rayleigh fading using Jakes' sum of sinusoids
            function generateJakesRayleighFading(velocity, frequency, N, numSamples, Ts) {
                const wavelength = SPEED_OF_LIGHT / (frequency * 1e6);
                const fD = velocity / wavelength;
                
                const hI = new Array(numSamples).fill(0);
                const hQ = new Array(numSamples).fill(0);
                
                // Jakes' model parameters
                const alpha_m = new Array(N).fill(0).map((_, m) => (2 * Math.PI * m) / N);
                const a_m = new Array(N).fill(0).map(() => Math.random() * 2 * Math.PI);
                const b_m = new Array(N).fill(0).map(() => Math.random() * 2 * Math.PI);

                for (let n = 0; n < numSamples; n++) {
                    const t = n * Ts;
                    for (let m = 0; m < N; m++) {
                        const angle = alpha_m[m];
                        const doppler_freq = fD * Math.cos(angle);
                        const cos_arg = 2 * Math.PI * doppler_freq * t + a_m[m];
                        const sin_arg = 2 * Math.PI * doppler_freq * t + b_m[m];

                        hI[n] += Math.cos(cos_arg);
                        hQ[n] += Math.sin(sin_arg);
                    }
                }
                
                // Normalize
                const norm = 1 / Math.sqrt(N);
                const hIn = hI.map(val => val * norm);
                const hQn = hQ.map(val => val * norm);
                
                return { hI: hIn, hQ: hQn };
            }

            // Simple FFT implementation (Cooley-Tukey algorithm)
            function fft(x) {
                const N = x.length;
                if (N <= 1) return x;

                const even = fft(x.filter((_, i) => i % 2 === 0));
                const odd = fft(x.filter((_, i) => i % 2 !== 0));

                const y = new Array(N);
                const halfN = N / 2;
                for (let k = 0; k < halfN; k++) {
                    const t_real = Math.cos(2 * Math.PI * k / N);
                    const t_imag = -Math.sin(2 * Math.PI * k / N);
                    
                    const odd_k = odd[k];
                    const odd_k_real = odd_k[0];
                    const odd_k_imag = odd_k[1];
                    
                    const product_real = odd_k_real * t_real - odd_k_imag * t_imag;
                    const product_imag = odd_k_real * t_imag + odd_k_imag * t_real;

                    y[k] = [even[k][0] + product_real, even[k][1] + product_imag];
                    y[k + halfN] = [even[k][0] - product_real, even[k][1] - product_imag];
                }
                return y;
            }

            // Calculate PSD from complex time series
            function calculatePSDFromComplexSeries(hI, hQ, N, Ts) {
                const h_complex = hI.map((real, idx) => [real, hQ[idx]]);
                const fft_result = fft(h_complex);

                const psd = fft_result.map(pair => (pair[0] * pair[0] + pair[1] * pair[1]));
                const fs = 1 / Ts;
                
                const halfN = Math.floor(N / 2);
                const shiftedPSD = [...psd.slice(halfN), ...psd.slice(0, halfN)];

                const freqs = [];
                for (let i = 0; i < N; i++) {
                    freqs.push((i - halfN) * fs / N);
                }

                const maxPSD = Math.max(...shiftedPSD);
                const normalizedPSD = maxPSD > 0 ? shiftedPSD.map(p => p / maxPSD) : shiftedPSD;
                
                return {
                    freqs: freqs,
                    psd: normalizedPSD
                };
            }

            // Calculate autocorrelation from complex time series
            function calculateAutocorrelationFromComplexSeries(hI, hQ) {
                const N = hI.length;
                const autocorr = [];
                const maxLag = Math.floor(N / 4);
                
                for (let lag = 0; lag <= maxLag; lag++) {
                    let sumReal = 0;
                    let count = 0;
                    
                    for (let i = 0; i < N - lag; i++) {
                        sumReal += (hI[i] * hI[i + lag] + hQ[i] * hQ[i + lag]);
                        count++;
                    }
                    
                    autocorr.push(sumReal / count);
                }
                
                const R0 = autocorr[0];
                return autocorr.map(val => val / R0);
            }

            // Calculate ideal autocorrelation for Clarke's model
            function calculateAutocorrelation(velocity, frequency, maxTau) {
                const wavelength = SPEED_OF_LIGHT / (frequency * 1e6);
                const fD = velocity / wavelength;
                const numPoints = 100;
                const tauStep = maxTau / numPoints;
                
                const data = [];
                for (let i = 0; i <= numPoints; i++) {
                    const tau = i * tauStep;
                    const correlation = besselJ0(2 * Math.PI * fD * tau);
                    data.push({ x: tau * 1000, y: correlation });
                }
                
                return data;
            }

            // Calculate ideal PSD for Clarke's model
            function calculatePSD(velocity, frequency) {
                const wavelength = SPEED_OF_LIGHT / (frequency * 1e6);
                const fD = velocity / wavelength;

                const numPoints = 200;
                const data = [];
                
                for (let i = 0; i <= numPoints; i++) {
                    const f = -fD + (i * 2 * fD) / numPoints;
                    let psd = 0;
                    
                    if (Math.abs(f) < fD) {
                        psd = 1 / (Math.PI * fD * Math.sqrt(1 - (f / fD) ** 2));
                    }
                    
                    data.push({ x: f, y: psd });
                }
                
                // Normalize
                const maxPSD = data.reduce((max, point) => Math.max(max, point.y), 0);
                
                if (maxPSD > 0) {
                    return data.map(point => ({ x: point.x, y: point.y / maxPSD }));
                } else {
                    return data;
                }
            }

            // Draw Clarke's environment
            function drawEnvironment() {
                const width = envCanvas.width = envCanvas.offsetWidth;
                const height = envCanvas.height = envCanvas.offsetHeight;
                
                envCtx.clearRect(0, 0, width, height);
                
                const centerX = width / 2;
                const centerY = height / 2;
                const radius = Math.min(width, height) * 0.35;
                const numScatterers = parseInt(scatterersInput.value);

                // Draw scattering circle
                envCtx.strokeStyle = '#667eea';
                envCtx.lineWidth = 3;
                envCtx.beginPath();
                envCtx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                envCtx.stroke();

                // Draw scatterers
                envCtx.fillStyle = '#48bb78';
                for (let i = 0; i < numScatterers; i++) {
                    const angle = (2 * Math.PI * i) / numScatterers;
                    const x = centerX + radius * Math.cos(angle);
                    const y = centerY + radius * Math.sin(angle);
                    
                    envCtx.beginPath();
                    envCtx.arc(x, y, 6, 0, 2 * Math.PI);
                    envCtx.fill();
                    
                    // Draw ray
                    envCtx.strokeStyle = 'rgba(102, 126, 234, 0.3)';
                    envCtx.lineWidth = 1;
                    envCtx.beginPath();
                    envCtx.moveTo(centerX, centerY);
                    envCtx.lineTo(x, y);
                    envCtx.stroke();
                }

                // Draw receiver
                envCtx.fillStyle = '#e53e3e';
                envCtx.beginPath();
                envCtx.arc(centerX, centerY, 10, 0, 2 * Math.PI);
                envCtx.fill();
                
                envCtx.fillStyle = '#2d3748';
                envCtx.font = 'bold 14px Arial';
                envCtx.textAlign = 'center';
                envCtx.fillText('Rx', centerX, centerY + 5);

                // Draw velocity arrow
                const velocity = parseFloat(velocity1Input.value);
                if (velocity > 0) {
                    envCtx.strokeStyle = '#e53e3e';
                    envCtx.lineWidth = 3;
                    envCtx.beginPath();
                    envCtx.moveTo(centerX, centerY - 20);
                    envCtx.lineTo(centerX + 30, centerY - 20);
                    envCtx.stroke();
                    
                    // Arrow head
                    envCtx.beginPath();
                    envCtx.moveTo(centerX + 30, centerY - 20);
                    envCtx.lineTo(centerX + 25, centerY - 25);
                    envCtx.moveTo(centerX + 30, centerY - 20);
                    envCtx.lineTo(centerX + 25, centerY - 15);
                    envCtx.stroke();
                    
                    // Velocity label
                    envCtx.fillStyle = '#2d3748';
                    envCtx.font = '12px Arial';
                    envCtx.fillText(`v = ${velocity} m/s`, centerX + 15, centerY - 30);
                }
            }

            // Draw realistic environment
            function drawRealisticEnvironment() {
                const width = realisticEnvCanvas.width = realisticEnvCanvas.offsetWidth;
                const height = realisticEnvCanvas.height = realisticEnvCanvas.offsetHeight;
                
                realisticEnvCtx.clearRect(0, 0, width, height);
                
                const centerX = width / 2;
                const centerY = height / 2;
                const radius = Math.min(width, height) * 0.35;
                const numMultipaths = parseInt(multipathsInput.value);

                // Draw concentric circles
                for (let r = 1; r <= 3; r++) {
                    realisticEnvCtx.strokeStyle = `rgba(102, 126, 234, ${0.3 - r * 0.08})`;
                    realisticEnvCtx.lineWidth = 2;
                    realisticEnvCtx.beginPath();
                    realisticEnvCtx.arc(centerX, centerY, radius * r / 3, 0, 2 * Math.PI);
                    realisticEnvCtx.stroke();
                }

                // Generate random angles for multipath scatterers
                const angles = Array.from({length: numMultipaths}, () => Math.random() * 2 * Math.PI);

                // Draw multipath scatterers with random angles
                realisticEnvCtx.fillStyle = '#48bb78';
                for (let i = 0; i < numMultipaths; i++) {
                    const angle = angles[i]; // Use random angle instead of uniform distribution
                    const r = radius * (2/3 + (1/3) * Math.random());
                    const x = centerX + r * Math.cos(angle);
                    const y = centerY + r * Math.sin(angle);
                    
                    realisticEnvCtx.beginPath();
                    realisticEnvCtx.arc(x, y, 4, 0, 2 * Math.PI);
                    realisticEnvCtx.fill();
                    
                    // Draw ray
                    realisticEnvCtx.strokeStyle = 'rgba(102, 126, 234, 0.4)';
                    realisticEnvCtx.lineWidth = 1;
                    realisticEnvCtx.beginPath();
                    realisticEnvCtx.moveTo(centerX, centerY);
                    realisticEnvCtx.lineTo(x, y);
                    realisticEnvCtx.stroke();
                }

                // Draw receiver
                realisticEnvCtx.fillStyle = '#e53e3e';
                realisticEnvCtx.beginPath();
                realisticEnvCtx.arc(centerX, centerY, 10, 0, 2 * Math.PI);
                realisticEnvCtx.fill();
                
                realisticEnvCtx.fillStyle = '#2d3748';
                realisticEnvCtx.font = 'bold 14px Arial';
                realisticEnvCtx.textAlign = 'center';
                realisticEnvCtx.fillText('Rx', centerX, centerY + 5);

                // Draw velocity arrow
                const velocity = parseFloat(velocityRealisticInput.value);
                if (velocity > 0) {
                    realisticEnvCtx.strokeStyle = '#e53e3e';
                    realisticEnvCtx.lineWidth = 3;
                    realisticEnvCtx.beginPath();
                    realisticEnvCtx.moveTo(centerX, centerY - 20);
                    realisticEnvCtx.lineTo(centerX + 30, centerY - 20);
                    realisticEnvCtx.stroke();
                    
                    // Arrow head
                    realisticEnvCtx.beginPath();
                    realisticEnvCtx.moveTo(centerX + 30, centerY - 20);
                    realisticEnvCtx.lineTo(centerX + 25, centerY - 25);
                    realisticEnvCtx.moveTo(centerX + 30, centerY - 20);
                    realisticEnvCtx.lineTo(centerX + 25, centerY - 15);
                    realisticEnvCtx.stroke();
                    
                    // Velocity label
                    realisticEnvCtx.fillStyle = '#2d3748';
                    realisticEnvCtx.font = '12px Arial';
                    realisticEnvCtx.fillText(`v = ${velocity} m/s`, centerX + 15, centerY - 30);
                }
            }

            // Update ideal plots
            function updateIdealPlots() {
                const velocities = [
                    parseFloat(velocity1Input.value),
                    parseFloat(velocity2Input.value),
                    parseFloat(velocity3Input.value)
                ];
                const frequency = parseFloat(frequencyInput.value);
                const maxTau = 0.02;

                const autocorrDatasets = [];
                const psdDatasets = [];
                const colors = ['#e53e3e', '#48bb78', '#9f7aea'];
                const labels = ['Vehicle 1', 'Vehicle 2', 'Vehicle 3'];
                const autocorrChecks = [v1AutocorrCheck, v2AutocorrCheck, v3AutocorrCheck];
                const psdChecks = [v1PsdCheck, v2PsdCheck, v3PsdCheck];

                // Prepare autocorrelation datasets
                for (let i = 0; i < 3; i++) {
                    if (autocorrChecks[i].checked) {
                        const data = calculateAutocorrelation(velocities[i], frequency, maxTau);
                        autocorrDatasets.push({
                            label: `${labels[i]} (${velocities[i]} m/s)`,
                            data: data,
                            borderColor: colors[i],
                            backgroundColor: colors[i] + '20',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.4,
                            pointRadius: 0
                        });
                    }
                }

                // Prepare PSD datasets
                for (let i = 0; i < 3; i++) {
                    if (psdChecks[i].checked) {
                        const data = calculatePSD(velocities[i], frequency);
                        psdDatasets.push({
                            label: `${labels[i]} (${velocities[i]} m/s)`,
                            data: data,
                            borderColor: colors[i],
                            backgroundColor: colors[i] + '20',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.2,
                            pointRadius: 0
                        });
                    }
                }

                // Update charts
                if (autocorrelationChart) autocorrelationChart.destroy();
                if (psdChart) psdChart.destroy();

                // Create autocorrelation chart
                autocorrelationChart = new Chart(document.getElementById('autocorrelationChart'), {
                    type: 'line',
                    data: { datasets: autocorrDatasets },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: true } },
                        scales: {
                            x: {
                                type: 'linear',
                                title: { display: true, text: 'Time τ (ms)' },
                                grid: { color: 'rgba(0,0,0,0.1)' }
                            },
                            y: {
                                title: { display: true, text: 'R(τ)' },
                                min: -1,
                                max: 1,
                                grid: { color: 'rgba(0,0,0,0.1)' }
                            }
                        }
                    }
                });

                // Create PSD chart
                psdChart = new Chart(document.getElementById('psdChart'), {
                    type: 'line',
                    data: { datasets: psdDatasets },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: true } },
                        scales: {
                            x: {
                                type: 'linear',
                                title: { display: true, text: 'Frequency (Hz)' },
                                grid: { color: 'rgba(0,0,0,0.1)' }
                            },
                            y: {
                                type: 'linear',
                                title: { display: true, text: 'Power Spectral Density S(f)' },
                                min: 0,
                                grid: { color: 'rgba(0,0,0,0.1)' }
                            }
                        }
                    }
                });

                // Show panels
                document.getElementById('autocorrelationPanel').style.display = 'block';
                document.getElementById('psdPanel').style.display = 'block';
            }

            // Simulate Clarke's ideal model
            function simulateIdeal() {
                updateIdealPlots();
                drawEnvironment();
            }

            // Simulate realistic model
            function simulateRealistic() {
                // // Show panels first
                // document.getElementById('realisticAutocorrelationPanel').style.display = 'block';
                // document.getElementById('realisticPsdPanel').style.display = 'block';

                const velocity = parseFloat(velocityRealisticInput.value);
                const frequency = parseFloat(frequencyRealisticInput.value);
                const N = parseInt(multipathsInput.value);
                const numSamples = parseInt(samplesInput.value);
                const signalFreq = parseFloat(document.getElementById('signal-frequency').value);


                const wavelength = SPEED_OF_LIGHT / (frequency * 1e6);
                const fD = velocity / wavelength;
                const Ts = 1 / (20 * Math.max(fD, 1));
                
                // Generate channel response
                const channelResponse = generateJakesRayleighFading(velocity, frequency, N, numSamples, Ts);
                const hI = channelResponse.hI;
                const hQ = channelResponse.hQ;

                // Generate transmitted sine signal
                const transmittedSignal = Array.from({length: numSamples}, (_, n) => 
                    Math.sin(2 * Math.PI * signalFreq * n * Ts)
                );

                // Calculate received signal: r(t) = h(t) * s(t) (convolution simplified to multiplication for baseband)
                const receivedI = hI.map((h, idx) => h * transmittedSignal[idx]);
                const receivedQ = hQ.map((h, idx) => h * transmittedSignal[idx]);

                // Calculate envelope
                const envelope = receivedI.map((real, idx) => Math.sqrt(real * real + receivedQ[idx] * receivedQ[idx]));
                
                // Plot received signal envelope
                const plotSamples = Math.min(200, numSamples);
                const timeAxis = Array.from({length: plotSamples}, (_, i) => i * Ts * 1000);
                const envelopeData = envelope.slice(0, plotSamples).map((val, idx) => ({
                    x: timeAxis[idx],
                    y: val
                }));

                if (receivedSignalChart) receivedSignalChart.destroy();
                
                receivedSignalChart = new Chart(document.getElementById('receivedSignalChart'), {
                    type: 'line',
                    data: {
                        datasets: [{
                            label: 'Envelope |r(t)|',
                            data: envelopeData,
                            borderColor: '#48bb78',
                            backgroundColor: 'rgba(72, 187, 120, 0.1)',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.1,
                            pointRadius: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: true } },
                        scales: {
                            x: {
                                type: 'linear',
                                title: { display: true, text: 'Time (ms)' },
                                grid: { color: 'rgba(0,0,0,0.1)' }
                            },
                            y: {
                                type: 'linear',
                                title: { display: true, text: 'Amplitude' },
                                min: 0,
                                grid: { color: 'rgba(0,0,0,0.1)' }
                            }
                        }
                    }
                });

                // Calculate autocorrelation
                const maxLag = Math.min(Math.floor(numSamples / 4), 50);
                const simulatedAutocorr = calculateAutocorrelationFromComplexSeries(hI, hQ);
                
                const idealAutocorr = [];
                const timeAxisCorr = [];
                
                for (let i = 0; i <= maxLag; i++) {
                    const tau = i * Ts;
                    timeAxisCorr.push(tau * 1000);
                    idealAutocorr.push(besselJ0(2 * Math.PI * fD * tau));
                }
                
                const realisticAutocorrData = simulatedAutocorr.slice(0, maxLag + 1).map((val, idx) => ({
                    x: timeAxisCorr[idx],
                    y: val
                }));
                
                const idealAutocorrData = idealAutocorr.map((val, idx) => ({
                    x: timeAxisCorr[idx],
                    y: val
                }));
                
                // Calculate PSD
                const realisticPSDResult = calculatePSDFromComplexSeries(hI, hQ, numSamples, Ts);
                const idealPSD = calculatePSD(velocity, frequency);
                
                const realisticPSDData = realisticPSDResult.psd.map((val, idx) => ({
                    x: realisticPSDResult.freqs[idx],
                    y: val
                }));

                // Update autocorrelation chart
                if (realisticAutocorrelationChart) realisticAutocorrelationChart.destroy();
                
                realisticAutocorrelationChart = new Chart(document.getElementById('realisticAutocorrelationChart'), {
                    type: 'line',
                    data: {
                        datasets: [
                            {
                                label: 'Jakes Model (Simulated)',
                                data: realisticAutocorrData,
                                borderColor: '#e53e3e',
                                backgroundColor: 'rgba(229, 62, 62, 0.1)',
                                borderWidth: 2,
                                fill: false,
                                tension: 0.1,
                                pointRadius: 0
                            },
                            {
                                label: 'Clarke Model (Theoretical)',
                                data: idealAutocorrData,
                                borderColor: '#667eea',
                                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                borderWidth: 2,
                                fill: false,
                                tension: 0.4,
                                pointRadius: 0,
                                borderDash: [5, 5]
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: true } },
                        scales: {
                            x: {
                                type: 'linear',
                                title: { display: true, text: 'Time τ (ms)' },
                                grid: { color: 'rgba(0,0,0,0.1)' }
                            },
                            y: {
                                title: { display: true, text: 'R(τ)' },
                                min: -1,
                                max: 1,
                                grid: { color: 'rgba(0,0,0,0.1)' }
                            }
                        }
                    }
                });
                
                // Update PSD chart
                if (realisticPsdChart) realisticPsdChart.destroy();
                
                realisticPsdChart = new Chart(document.getElementById('realisticPsdChart'), {
                    type: 'line',
                    data: {
                        datasets: [
                            {
                                label: 'Jakes Model (Simulated)',
                                data: realisticPSDData,
                                borderColor: '#e53e3e',
                                backgroundColor: 'rgba(229, 62, 62, 0.1)',
                                borderWidth: 2,
                                fill: false,
                                tension: 0.1,
                                pointRadius: 0
                            },
                            {
                                label: 'Clarke Model (Theoretical)',
                                data: idealPSD,
                                borderColor: '#667eea',
                                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                borderWidth: 2,
                                fill: false,
                                tension: 0.2,
                                pointRadius: 0,
                                borderDash: [5, 5]
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: true } },
                        scales: {
                            x: {
                                type: 'linear',
                                title: { display: true, text: 'Frequency (Hz)' },
                                min: -500,
                                max: 500,
                                grid: { color: 'rgba(0,0,0,0.1)' }
                            },
                            y: {
                                type: 'linear',
                                title: { display: true, text: 'Power Spectral Density S(f)' },
                                min: 0,
                                grid: { color: 'rgba(0,0,0,0.1)' }
                            }
                        }
                    }
                });
                
                // Show panels
                document.getElementById('realisticAutocorrelationPanel').style.display = 'block';
                document.getElementById('realisticPsdPanel').style.display = 'block';
                drawRealisticEnvironment();
            }

            // Event listeners for Clarke's model
            velocity1Input.addEventListener('input', () => {
                updateIdealPlots();
                drawEnvironment();
            });
                    velocity2Input.addEventListener('input', updateIdealPlots);
             velocity3Input.addEventListener('input', updateIdealPlots);
             frequencyInput.addEventListener('input', updateIdealPlots);
             scatterersInput.addEventListener('input', drawEnvironment);

            // Event listeners for realistic model 
            velocityRealisticInput.addEventListener('input', drawRealisticEnvironment);
            frequencyRealisticInput.addEventListener('input', drawRealisticEnvironment);
            multipathsInput.addEventListener('input', drawRealisticEnvironment);
            signalFrequencyInput.addEventListener('input', drawRealisticEnvironment);

             // Listeners for checkboxes to update ideal plots
             v1AutocorrCheck.addEventListener('change', updateIdealPlots);
             v2AutocorrCheck.addEventListener('change', updateIdealPlots);
             v3AutocorrCheck.addEventListener('change', updateIdealPlots);
             v1PsdCheck.addEventListener('change', updateIdealPlots);
             v2PsdCheck.addEventListener('change', updateIdealPlots);
             v3PsdCheck.addEventListener('change', updateIdealPlots);
             
             window.addEventListener('resize', () => {
             setTimeout(() => {
              if (currentTab === 'clarkes') {
             simulateIdeal();
             drawEnvironment();
              } else if (currentTab === 'realistic') {
             simulateRealistic();
             drawRealisticEnvironment();
              }
             }, 100);
             });

             document.addEventListener('DOMContentLoaded', () => {
            //  document.getElementById('autocorrelationPanel').style.display = 'none';
            //  document.getElementById('psdPanel').style.display = 'none';
            //  document.getElementById('realisticAutocorrelationPanel').style.display = 'none';
            //  document.getElementById('realisticPsdPanel').style.display = 'none';
             drawEnvironment();
             });