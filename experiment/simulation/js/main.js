     // Global variables for charts and animation
     let autocorrelationChart = null;
     let spectrumChart = null;
     let animationRunning = false;
     let animationId = null;
     let currentAngle = 0; // Angle in degrees for mobile receiver position
     let lastTime = 0;     // For deltaTime calculation in animation
     
     // Bessel function J0 approximation (good for small to medium arguments)
     function besselJ0(x) {
         if (Math.abs(x) < 8) {
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
                 y * (-0.6911147651e-5 + y * (0.7621095161e-6 - y * 0.934945152e-7)));
             return Math.sqrt(0.636619772 / x) * (Math.cos(xx) * ans1 - z * Math.sin(xx) * ans2);
         }
     }
     
     // Initialize sliders and their displays
     function initializeControls() {
         const sliders = ['amplitude', 'bandwidth', 'dopplerSpread', 'coherenceTime', 'numSamples', 'numPaths', 'velocity'];
         
         sliders.forEach(id => {
             const slider = document.getElementById(id);
             const display = document.getElementById(id + 'Value');
             
             if (slider && display) {
                 slider.oninput = function() {
                     display.textContent = this.value;
                     if (id === 'numPaths') {
                         document.getElementById('scattererCount').textContent = this.value;
                         drawOneRingModel(); // Redraw if number of paths changes
                     } else if (id === 'velocity') {
                         document.getElementById('currentVelocity').textContent = this.value;
                         // If animation is not running, still update the velocity vector display
                         if (!animationRunning) drawOneRingModel(); 
                     }
                 };
             }
         });
         
         // Initialize display values from defaults
         document.getElementById('scattererCount').textContent = document.getElementById('numPaths').value;
         document.getElementById('currentVelocity').textContent = document.getElementById('velocity').value;
         
         // Animation toggle button
         const toggleBtn = document.getElementById('toggleAnimation');
         toggleBtn.onclick = function() {
             if (animationRunning) {
                 stopAnimation();
                 this.textContent = 'Start Animation';
                 this.style.background = '#48bb78';
             } else {
                 startAnimation();
                 this.textContent = 'Stop Animation';
                 this.style.background = '#e53e3e';
             }
         };
     }
     
     // One-Ring Model Drawing Functions
     function drawOneRingModel() {
         const canvas = document.getElementById('oneRingCanvas');
         const ctx = canvas.getContext('2d');
         const centerX = canvas.width / 2;
         const centerY = canvas.height / 2;
         const radius = 120; // Fixed radius for scatterer ring
         const K = parseInt(document.getElementById('numPaths').value);
         const velocity = parseFloat(document.getElementById('velocity').value);
         
         ctx.clearRect(0, 0, canvas.width, canvas.height);
         ctx.fillStyle = '#f8fafc';
         ctx.fillRect(0, 0, canvas.width, canvas.height);
         
         ctx.strokeStyle = '#cbd5e0';
         ctx.lineWidth = 2;
         ctx.setLineDash([5, 5]);
         ctx.beginPath();
         ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
         ctx.stroke();
         ctx.setLineDash([]);
         
         for (let i = 0; i < K; i++) {
             const angle = (2 * Math.PI * i) / K;
             const x = centerX + radius * Math.cos(angle);
             const y = centerY + radius * Math.sin(angle);
             ctx.fillStyle = '#e53e3e';
             ctx.beginPath();
             ctx.arc(x, y, 5, 0, 2 * Math.PI);
             ctx.fill();
             ctx.fillStyle = '#2d3748';
             ctx.font = '11px Arial';
             ctx.textAlign = 'center';
             ctx.fillText(`S${i+1}`, x, y - 12);
         }
         
         ctx.fillStyle = '#f56565';
         ctx.beginPath();
         ctx.arc(centerX, centerY, 10, 0, 2 * Math.PI);
         ctx.fill();
         ctx.fillStyle = 'white';
         ctx.font = 'bold 11px Arial';
         ctx.textAlign = 'center';
         ctx.fillText('Tx', centerX, centerY + 4);
         
         const mobileAngleRad = (currentAngle * Math.PI) / 180;
         const mobileRadius = radius * 0.35;
         const mobileX = centerX + mobileRadius * Math.cos(mobileAngleRad);
         const mobileY = centerY + mobileRadius * Math.sin(mobileAngleRad);
         
         ctx.fillStyle = '#3182ce';
         ctx.beginPath();
         ctx.arc(mobileX, mobileY, 10, 0, 2 * Math.PI);
         ctx.fill();
         ctx.fillStyle = 'white';
         ctx.font = 'bold 11px Arial';
         ctx.fillText('Rx', mobileX, mobileY + 4);
         
         ctx.strokeStyle = '#90cdf4';
         ctx.lineWidth = 1;
         ctx.setLineDash([2, 2]);
         ctx.beginPath();
         ctx.arc(centerX, centerY, mobileRadius, 0, 2 * Math.PI);
         ctx.stroke();
         ctx.setLineDash([]);
         
         ctx.lineWidth = 2;
         ctx.globalAlpha = 0.7;
         for (let i = 0; i < K; i++) {
             const scatterAngle = (2 * Math.PI * i) / K;
             const scatterX = centerX + radius * Math.cos(scatterAngle);
             const scatterY = centerY + radius * Math.sin(scatterAngle);
             
             ctx.strokeStyle = '#48bb78';
             ctx.beginPath();
             ctx.moveTo(centerX, centerY);
             ctx.lineTo(scatterX, scatterY);
             ctx.stroke();
             drawSignalArrow(ctx, centerX, centerY, scatterX, scatterY, '#48bb78', 0.7);
             
             ctx.strokeStyle = '#2b6cb0';
             ctx.beginPath();
             ctx.moveTo(scatterX, scatterY);
             ctx.lineTo(mobileX, mobileY);
             ctx.stroke();
             drawSignalArrow(ctx, scatterX, scatterY, mobileX, mobileY, '#2b6cb0', 0.7);
         }
         ctx.globalAlpha = 1.0;
         
         const velLength = Math.min(50, velocity * 2);
         const velAngleRad = mobileAngleRad + Math.PI/2; 
         const velEndX = mobileX + velLength * Math.cos(velAngleRad);
         const velEndY = mobileY + velLength * Math.sin(velAngleRad);
         
         ctx.strokeStyle = '#ed8936';
         ctx.lineWidth = 4;
         ctx.beginPath();
         ctx.moveTo(mobileX, mobileY);
         ctx.lineTo(velEndX, velEndY);
         ctx.stroke();
         drawSignalArrow(ctx, mobileX, mobileY, velEndX, velEndY, '#ed8936', 1.0);
         
         ctx.fillStyle = '#ed8936';
         ctx.font = 'bold 14px Arial';
         ctx.textAlign = 'left'; // Adjust alignment for better positioning
         ctx.fillText(`v=${velocity}m/s`, velEndX + 5, velEndY + 5); // Adjusted label position
         
         drawLegend(ctx, canvas.width - 140, 20);
     }
     
     function drawSignalArrow(ctx, fromX, fromY, toX, toY, color, alpha = 1.0) {
         const angle = Math.atan2(toY - fromY, toX - fromX);
         const arrowLength = 12;
         const arrowAngle = Math.PI / 5;
         
         const arrowPos = 0.75;
         const arrowX = fromX + (toX - fromX) * arrowPos;
         const arrowY = fromY + (toY - fromY) * arrowPos;
         
         ctx.save();
         ctx.globalAlpha = alpha;
         ctx.strokeStyle = color;
         ctx.fillStyle = color;
         ctx.lineWidth = 2;
         
         ctx.beginPath();
         ctx.moveTo(arrowX, arrowY);
         ctx.lineTo(arrowX - arrowLength * Math.cos(angle - arrowAngle), 
                   arrowY - arrowLength * Math.sin(angle - arrowAngle));
         ctx.lineTo(arrowX - arrowLength * Math.cos(angle + arrowAngle), 
                   arrowY - arrowLength * Math.sin(angle + arrowAngle));
         ctx.closePath();
         ctx.fill();
         
         ctx.restore();
     }
     
     function drawLegend(ctx, x, y) {
         ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
         ctx.fillRect(x - 10, y - 5, 140, 140);
         ctx.strokeStyle = '#e2e8f0';
         ctx.lineWidth = 1;
         ctx.strokeRect(x - 10, y - 5, 140, 140);
         
         ctx.font = '11px Arial';
         ctx.textAlign = 'left';
         
         ctx.fillStyle = '#f56565'; ctx.beginPath(); ctx.arc(x, y + 12, 5, 0, 2 * Math.PI); ctx.fill();
         ctx.fillStyle = '#2d3748'; ctx.fillText('Transmitter', x + 12, y + 16);
         
         ctx.fillStyle = '#3182ce'; ctx.beginPath(); ctx.arc(x, y + 32, 5, 0, 2 * Math.PI); ctx.fill();
         ctx.fillStyle = '#2d3748'; ctx.fillText('Mobile Rx', x + 12, y + 36);
         
         ctx.fillStyle = '#e53e3e'; ctx.beginPath(); ctx.arc(x, y + 52, 4, 0, 2 * Math.PI); ctx.fill();
         ctx.fillStyle = '#2d3748'; ctx.fillText('Scatterers', x + 12, y + 56);
         
         ctx.strokeStyle = '#48bb78'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 74); ctx.lineTo(x + 20, y + 74); ctx.stroke();
         ctx.fillStyle = '#48bb78'; ctx.beginPath(); ctx.moveTo(x + 15, y + 74); ctx.lineTo(x + 12, y + 71); ctx.lineTo(x + 12, y + 77); ctx.closePath(); ctx.fill();
         ctx.fillStyle = '#2d3748'; ctx.fillText('Tx → Scatterer', x + 25, y + 78);
         
         ctx.strokeStyle = '#2b6cb0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 94); ctx.lineTo(x + 20, y + 94); ctx.stroke();
         ctx.fillStyle = '#2b6cb0'; ctx.beginPath(); ctx.moveTo(x + 15, y + 94); ctx.lineTo(x + 12, y + 91); ctx.lineTo(x + 12, y + 97); ctx.closePath(); ctx.fill();
         ctx.fillStyle = '#2d3748'; ctx.fillText('Scatterer → Rx', x + 25, y + 98);
         
         ctx.strokeStyle = '#ed8936'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y + 114); ctx.lineTo(x + 20, y + 114); ctx.stroke();
         ctx.fillStyle = '#ed8936'; ctx.beginPath(); ctx.moveTo(x + 15, y + 114); ctx.lineTo(x + 12, y + 111); ctx.lineTo(x + 12, y + 117); ctx.closePath(); ctx.fill();
         ctx.fillStyle = '#2d3748'; ctx.fillText('Velocity', x + 25, y + 118);
     }
     
     // Animation functions
     function startAnimation() {
         if (!animationRunning) { // Prevent multiple animation loops
             animationRunning = true;
             lastTime = performance.now(); // Initialize lastTime for the first frame
             animationId = requestAnimationFrame(animate); // Start the animation loop
         }
     }
     
     function stopAnimation() {
         animationRunning = false;
         if (animationId) {
             cancelAnimationFrame(animationId);
             animationId = null; // Clear the animation ID
         }
     }
     
     function animate(currentTime) {
         if (!animationRunning) return; // Stop if animationRunning is false

         if (!lastTime) { // Fallback for the first frame if lastTime wasn't set by startAnimation
             lastTime = currentTime;
         }
         const deltaTime = currentTime - lastTime; // Time elapsed since last frame in milliseconds
         lastTime = currentTime;
         
         const velocity = parseFloat(document.getElementById('velocity').value);
         // Angular speed factor: 0.18 degrees per "ideal 60fps frame" for a velocity unit of 1.
         // (1000 / 60) is the duration of one frame at 60 FPS in ms (approx 16.67ms)
         const angularSpeedFactor = 0.18; 
         const angularChange = velocity * angularSpeedFactor * (deltaTime / (1000 / 60));
         
         currentAngle = (currentAngle + angularChange) % 360;
         drawOneRingModel(); // Redraw the model with the new angle
         
         animationId = requestAnimationFrame(animate); // Request the next frame
     }

     // Calculate autocorrelation
     function calculateAutocorrelation(a, W, Dv, numSamples) {
         const autocorr = [];
         const nValues = [];
         
         for (let n = 0; n < numSamples; n++) {
             nValues.push(n);
             const arg = n * Math.PI * Dv / W;
             const R0n = 2 * a * a * Math.PI * besselJ0(arg);
             autocorr.push(R0n);
         }
         
         return { nValues, autocorr };
     }
     
     // Calculate Doppler spectrum
     function calculateDopplerSpectrum(a, W, Dv, numSamples) {
         const spectrum = [];
         const frequencies = [];
         const maxFreq = Dv / (2 * W); // Max Doppler frequency shift, f_m = Dv / (2W) is incorrect. Max Doppler is Dv.
                                       // The spectrum S(f) is defined for |f| <= f_m. The formula uses f_m as Dv.
                                       // The formula in the HTML is S(f) = ... for |f| <= D_v / (2W). This is unusual.
                                       // Clarke's model classical Doppler spectrum is non-zero for |f| <= f_D, where f_D is max Doppler shift.
                                       // Assuming D_v in the HTML means f_D (max Doppler shift).
                                       // The argument of the square root should be 1 - (f/f_D)^2.
                                       // If the formula given: S(f) for |f| <= Dᵥ/(2W) is taken literally, then f_max_plot = Dᵥ/(2W).
                                       // Let's use f_D = D_v (Doppler Spread = Max Doppler Shift). The spectrum should be for |f| <= D_v.
                                       // The given formula S(f) = 4a²W / (π√(1-(2fW/Dᵥ)²)) implies the x-axis limit for f is Dᵥ/(2W).
                                       // Let's stick to the formula provided in the HTML: |f| <= D_v / (2W)
         const fLimit = Dv / (2 * W);


         for (let i = 0; i < numSamples; i++) {
             // Generate frequencies from -fLimit to +fLimit
             const f = -fLimit + (i / (numSamples - 1)) * (2 * fLimit);
             frequencies.push(f);
             
             const absF = Math.abs(f);
             if (absF <= fLimit) { // Check if f is within the valid range
                 const termInsideSqrt = 1 - Math.pow((2 * f * W) / Dv, 2);
                 if (termInsideSqrt > 0) { // Ensure argument of sqrt is positive
                     const denominator = Math.PI * Math.sqrt(termInsideSqrt);
                     const Sf = (4 * a * a * W) / denominator;
                     spectrum.push(Sf);
                 } else {
                     // This case (termInsideSqrt <= 0) should ideally not happen if |f| <= fLimit.
                     // It might happen due to floating point inaccuracies at the very edge |f| = fLimit.
                     // Or if the condition |f| <= fLimit is slightly violated.
                     // Push a large value or handle appropriately; pushing 0 for simplicity if it results in NaN/Infinity.
                     spectrum.push(spectrum.length > 0 ? spectrum[spectrum.length-1] : 0); // Use previous or 0
                 }
             } else {
                 spectrum.push(0); // Spectrum is zero outside this range
             }
         }
         
         return { frequencies, spectrum };
     }
     
     // Create or update autocorrelation chart
     function updateAutocorrelationChart(nValues, autocorr) {
         const ctx = document.getElementById('autocorrelationChart').getContext('2d');
         
         if (autocorrelationChart) {
             autocorrelationChart.destroy();
         }
         
         autocorrelationChart = new Chart(ctx, {
             type: 'line',
             data: {
                 labels: nValues,
                 datasets: [{
                     label: 'R₀[n]',
                     data: autocorr,
                     borderColor: '#667eea',
                     backgroundColor: 'rgba(102, 126, 234, 0.1)',
                     borderWidth: 2,
                     fill: true,
                     tension: 0.4,
                     pointRadius: 1,
                     pointHoverRadius: 4
                 }]
             },
             options: {
                 responsive: true,
                 maintainAspectRatio: false,
                 plugins: {
                     legend: { display: true, position: 'top' }
                 },
                 scales: {
                     x: {
                         title: { display: true, text: 'Sample Index (n)', font: { size: 12, weight: 'bold' }},
                         grid: { color: '#e2e8f0' }
                     },
                     y: {
                         title: { display: true, text: 'R₀[n]', font: { size: 12, weight: 'bold' }},
                         grid: { color: '#e2e8f0' }
                     }
                 },
                 interaction: { intersect: false, mode: 'index' }
             }
         });
     }
     
     // Create or update spectrum chart
     function updateSpectrumChart(frequencies, spectrum) {
         const ctx = document.getElementById('spectrumChart').getContext('2d');
         
         if (spectrumChart) {
             spectrumChart.destroy();
         }
         
         spectrumChart = new Chart(ctx, {
             type: 'line',
             data: {
                 labels: frequencies.map(f => f.toFixed(3)), // Increased precision for frequency labels
                 datasets: [{
                     label: 'S(f)',
                     data: spectrum,
                     borderColor: '#48bb78',
                     backgroundColor: 'rgba(72, 187, 120, 0.1)',
                     borderWidth: 2,
                     fill: true,
                     tension: 0.1, // Low tension for 'spiky' spectrum
                     pointRadius: 0,
                     pointHoverRadius: 4
                 }]
             },
             options: {
                 responsive: true,
                 maintainAspectRatio: false,
                 plugins: {
                     legend: { display: true, position: 'top' }
                 },
                 scales: {
                     x: {
                         title: { display: true, text: 'Frequency (f) [Hz]', font: { size: 12, weight: 'bold' }},
                         grid: { color: '#e2e8f0' }
                     },
                     y: {
                         title: { display: true, text: 'Power Spectral Density S(f)', font: { size: 12, weight: 'bold' }},
                         grid: { color: '#e2e8f0' },
                         // beginAtZero: true // Useful if spectrum can be negative (not typical for PSD)
                     }
                 },
                 interaction: { intersect: false, mode: 'index' }
             }
         });
     }
     
     // Main update function, called by button
     function updatePlots() {
         const a = parseFloat(document.getElementById('amplitude').value);
         const W = parseFloat(document.getElementById('bandwidth').value);
         const Dv = parseFloat(document.getElementById('dopplerSpread').value);
         const numSamples = parseInt(document.getElementById('numSamples').value);
         
         const { nValues, autocorr } = calculateAutocorrelation(a, W, Dv, numSamples);
         updateAutocorrelationChart(nValues, autocorr);
         
         const { frequencies, spectrum } = calculateDopplerSpectrum(a, W, Dv, numSamples);
         updateSpectrumChart(frequencies, spectrum);
     }
     
     // Initialize the application on window load
     window.onload = function() {
         initializeControls();
         drawOneRingModel(); // Initial draw of the one-ring model
         updatePlots();      // Initial calculation and display of plots
     };