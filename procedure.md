In this experiment, you will experimentally verify Clarke's fading model. You will do this by comparing the `autocorrelation function` and the `power spectral density` generated analytically by the model and the ones generated experimentally by simulating a realistic scenario.

### Clarke's Model
In this tab named `Clarke's model` you will have the following parameters that you can vary.

- `Velocities of upto 3 vehicles` These parameters can take any positive value. Vehicle here refers to the receiver, which has a ring of scatterers surrounding it (direction of the velocity does not matter since it is a radially symmetric setting). You can add or remove vehicles to compare the autocorrelation and power spectral density in different settings.
- `Carrier frequency`

In the center, you can see the setting of Clarke's model, with the receiver $R_X$ in the center (red), surrounded by scatterers (green) situated on a circle.

On the right of the screen you can the autocorrelation and power spectral density plots for the different cases corresponding to the three different vehicle velocities (each plot has 3 color-coded curves).

### Realistic Model
In this tab, you will make the comparison between the results generated using the Clarke's model against the one using computer simulations.

In the input tab on the left, you can enter,

- `Vehicle velocity` The velocity at which the receiver is moving
- `Signal Frequency` This is the frequency (in Hz) of the sinusoid we are transmitting as the message
- `Carrier Frequency` This is the frequency (in MHz) of the carrier used for communication
- `No. of multipaths` How many multipath components are considered in the simulation. This is same as the no. of scatterers considered (considering more paths will give more accurate results)
- `No. of samples` This is another simulation parameter (a larger value will give more accurate results)

In the image in the center you are given the setting with the receiver surrounded by multiple scatterers at different distances within a range. The received signal envelope is also given for reference.

In the output section, the autocorrelation and power spectral density plots are given for both the theoretical and experimental cases.

You can vary all the different parameters and check which values give better agreement between the theoretical and simulated results. For example, on increasing the no. of multipaths/scatterers will bring the curves closer because when we have more scatterers in the real-world setting, it is closer to the setting assumed by Clarke's model.