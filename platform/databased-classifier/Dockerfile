FROM mathworks/matlab:r2024b
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Europe/Berlin

# Switch to root user to perform installations
USER root
RUN apt-get update && \
    # Install packages. --no-install-recommends avoids unnecessary packages.
    # ADDED: dos2unix to fix Windows line ending issues
    apt-get install -y --no-install-recommends \
        tzdata \
        wget \
        unzip \
        dos2unix && \
    \
    # Configure the system timezone non-interactively
    ln -fs /usr/share/zoneinfo/$TZ /etc/localtime && \
    dpkg-reconfigure --frontend noninteractive tzdata && \
    \
    # --- MATLAB Toolbox Installation ---
    wget https://www.mathworks.com/mpm/glnxa64/mpm && \
    chmod +x mpm && \
    # Install the specified toolboxes
    ./mpm install --release=R2024b --products Instrument_Control_Toolbox Optimization_Toolbox --destination /opt/matlab/R2024b && \
    \
    # Remove downloaded mpm installer
    rm mpm && \
    # Remove packages that were only needed for the build, not at runtime
    apt-get purge -y --auto-remove wget unzip && \
    # Clean the apt cache to reduce image size
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Switch back to the default non-root 'matlab' user
USER matlab

WORKDIR /home/matlab/
COPY ./platform/databased-classifier/. .
COPY exercises/. .
USER root
RUN dos2unix entrypoint-script.sh && \
    chmod +x entrypoint-script.sh && \
    chown -R matlab:matlab /home/matlab

USER matlab
EXPOSE 56000
ENTRYPOINT ["./entrypoint-script.sh"]