### A. One-Ring Diagram Exploration

1. **Static View:**  
   - Identify Tx (center red), Scatterers (red on ring), Rx (blue).  

2. **Change Number of Paths (K):**  
   - Use the slider to vary K (e.g., min, mid, max).  
   - Observe scatterer count updates immediately without needing to click "Update Simulation".

3. **Animate Rx Movement:**  
   - Set *Mobile Velocity* (e.g., 10–20 m/s), click **Start Animation**.  
   - Watch the Rx (blue circle) move along the ring with an orange velocity vector.  
   - Change velocity during animation to see the speed effect.  
   - Click **Stop Animation** to end.  
   - Note: Animation is visual only; it doesn't affect charts unless "Update Simulation" is clicked.

---

### B. Autocorrelation Function (R₀[n])

> After each change, click **Update Simulation** to refresh the plot.

1. **Amplitude (a):**  
   - Higher `a` increases the peak at `n=0`.  
   - The overall shape and width of the main lobe remain mostly the same.

2. **Doppler Spread (Dᵥ):**  
   - Increasing Dᵥ narrows the main lobe → faster decorrelation (shorter coherence time).  

3. **Bandwidth (W):**  
   - Increasing W → slower decay of R₀[n] (wider main lobe).  
   - Related to J₀ argument: `nπDᵥ/W`.

4. **Number of Samples:**  
   - Affects x-axis range (length of the plot), not the core shape of R₀[n].

---

### C. Doppler Power Spectrum (S(f))

> After each change, click **Update Simulation** to refresh the plot.

1. **Default Shape:**  
   - Observe the characteristic “U-shape” or “bathtub” spectrum with edge peaks.

2. **Amplitude (a):**  
   - Changes the y-axis scale (overall power).  
   - Spectrum shape and frequency extent remain unchanged.

3. **Doppler Spread (Dᵥ):**  
   - Wider Dᵥ → broader frequency range.  
   - Non-zero values for `|f| ≤ Dᵥ/(2W)`.

4. **Bandwidth (W):**  
   - Increasing W → narrower spectrum range.  
   - Inversely proportional to frequency spread (`Dᵥ/2W`).

5. **Number of Samples:**  
   - Higher sample count → smoother, more detailed plot.

---

### D. Additional Parameters

1. **Coherence Time Factor:**  
   - Vary it and observe if there's any effect.  
   - It may not directly affect R₀[n] or S(f) in this version.

2. **Number of Paths (K):**  
   - Affects only the One-Ring Diagram.  
   - Higher K better approximates the ideal infinite-scatterer assumption in Clarke’s model.

---
