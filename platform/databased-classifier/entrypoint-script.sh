#!/bin/bash

# This script runs the server in an infinite loop, ensuring that if the MATLAB
# process ever exits (due to an error or otherwise), it will be
# automatically restarted after a short delay.

echo "--- MATLAB Server Supervisor ---"

# Loop forever.
while true
do
    # Run the MATLAB command. We wrap the MATLAB code itself in a try-catch
    # to ensure errors are displayed, and then call 'quit' to ensure a clean exit
    # of the MATLAB process, which this loop will then catch and restart.
    matlab -nodisplay -r "try; cd('/home/matlab'); addpath(genpath(cd)); databasedClassifierServer; catch e; fprintf('[ERROR] MATLAB script failed:\n'); disp(getReport(e)); end; quit;"

    # If the matlab process exits, this line will be reached.
    echo "[SUPERVISOR] MATLAB process exited. Restarting in 5 seconds..."
    sleep 5
done
