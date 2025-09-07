Imagine the scenario where a moving transmitter is transmitting pulses. . At the receiver, the observed signal undergoes variations in amplitude, delay, and the number of multipath components due to mobility and scattering.  The corresponding received signal can be modeled as the superposition of the line-of-sight (LOS) path and all resolvable multipath components as

$$
\begin{equation}
      r(t) = \sum_{n=0}^{N} \alpha_n(t) e^{j2\pi f_c(t-\tau_n(t)) + \Phi_{D_n}(t)}
\end{equation}
$$

where $N$ is the number of resolvable multipath components, $\alpha_n(t)$ and $\tau_n(t)$ are the amplitudes and delays respectively corresponding to the $n$-th path and $\Phi_{D_n}(t) = \int 2\pi f_{D_n}(t)dt$ is the doppler phase shift and $f_{D_n}(t)$ is the doppler frequency. Since the parameters $\alpha_n(t)$, $\tau_n(t)$ and $\Phi_{D_n}(t)$ associated with each resolvable multipath component change over time, they are characterized as random processes which we assume to be both stationary and ergodic. Consequently, the received signal is also a stationary and ergodic random process.

Deriving the statistical properties of such a channel directly is generally intractable. Thus, Clarke's model introduces some simplistic assumptions to derive it.
- **Quasi-stationarity**: Assuming that $\alpha_n(t)$, $\tau_n(t)$ and $f_{D_n}(t)$ are changing slowly enough such that they are constant over the time intervals of interest, we have $\alpha_n(t) \approx \alpha_n$, $\tau_n(t) \approx \tau_n$ and $f_{D_n}(t) \approx f_{D_n}$. With this assumption the Doppler phase shift becomes $\Phi_{D_n}(t) = 2\pi f_{D_n}t$. Hence, the overall phase of the $n$-th multipath component is

$$\phi_n(t) = 2\pi f_c \tau_n - 2\pi f_{D_n}t.$$

- **Rapid carrier induced phase deviation**: We assume that for the $n$-th multipath component the term $2\pi f_c τ_n$ in $\Phi_n(t)$ changes rapidly relative to all other phase terms. This is a reasonable assumption since $f_c$ is large and hence the term $2\pi f_c τ_n$ can go through a 360 degree rotation for a small change in multipath delay $τ_n$. Under this assumption $\Phi_n(t)$ is uniformly distributed on $[-\pi, \pi]$. Thus, we assume $N$ multipath components with angle of arrival $\Phi_n = n \Delta \Phi$, where $\Delta \phi = \frac{2\pi}{N}$ as depicted in the figure below.

<p align="center">
<img src="./images/exp4_model.jpg", width='40%'>
</p>  

Now we move ahead to derive the various statistical properties of such a model.

## Autocorrelation function (ACF) and Power spectral density (PSD) of the recieved signal

We can evaluate the ACF of the recieved signal as 

$$ A_r(\tau) = E[r(t)r(t+\tau)].$$

Considering that the number of scatterers $N \rightarrow \infty$ which is realistic in rich scattering environments, the $\Delta\Phi \rightarrow 0$. In this limit, Clarke’s model yields the ACF of the received signal as

$$ A_r(\tau) = P_r J_0 \left(2\pi f_D\tau\right)$$

where $J_0$ is the Bessel function of $0^{th}$ order of first kind given by

$$
\begin{aligned}
      J_0(x) \triangleq \frac{1}{\pi} \int_0^\pi e^{-jx \cos\theta} \ d\theta
\end{aligned}
$$

The Bessel form reflects the isotropic scattering assumption: contributions from all directions average to this compact closed form.

The PSD can now be obtained as usual by taking the Fourier transform of the ACF

$$
\begin{aligned}
      S_r(f)=
      \begin{cases}
      \frac{P_r}{4\pi f_D}\frac{1}{\sqrt{1-\left(\frac{|f-f_c|}{f_D}\right)^2}}  &  |f-f_c| \leq f_{D} \\
      0 & \text{otherwise}
      \end{cases}
\end{aligned}
$$

### Impact of reciever motion (velocity) on ACF and PSD

The doppler frequency $f_D = \frac{v}{\lambda}$ where $v$ is the velocity of reciever and $\lambda$ is the carrier wavelength. Clearly, f_D$ increases with velocity. This directly influences both ACF and PSD of the received signal.
- **Slow motion** (small $f_D$): The oscillations of $J_0 \left(2\pi f_D\tau\right)$ are slow, and the ACF decays gradually. Thus, the channel remains correlated over a longer time (i.e. large coherence time).
- **Fast motion** (large $f_D$): The oscillations are faster and the ACF decays quickly and the channel becomes uncorrelated in a shorter time (i.e. small coherence time).

Thus, a faster-moving receiver experiences quicker channel variations, meaning fading becomes more rapid.

In the frequency domain, the effect of velocity appears as follows:
- Low velocity narrow Doppler spectrum (PSD is concentrated around the carrier).
- High velocity → wider Doppler spectrum (PSD spreads out more, increasing Doppler spread).

This widening of the PSD indicates stronger time selectivity of the channel, which has direct implications for system design (e.g., increased inter-carrier interference in OFDM systems which are explained in the upcoming experiments).

The figure below illustrates these effects.


| <img src="./images/expt4_R0.jpeg"> <br> *Autocorrelation of the tap gain process* | <img src="./images/expt4_PSD.jpeg"> <br> *Power spectral density of tap gain process* |
|:----------------------------------------------------------------------------------:|:--------------------------------------------------------------------------:|

Finally, we can define the coherence time as the time it takes for the auto-correlation function to go below a certain threshold $\alpha$ for the first time. This yeilds the following expression fro coherence time

$$
\begin{aligned}
      T_c = \frac{J_0^{-1}(\alpha)}{\pi f_D}
\end{aligned}
$$
