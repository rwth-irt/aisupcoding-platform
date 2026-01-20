% MATLAB TCP local server: 
% A tiny TCP server that waits for clients, prints what it receives,
% and echoes the message back with a time stamp.

clear all

% -------- 1) parameters -----------------------------------------------
port = 56000;                 % pick any free port above 1024
bindAddress = "0.0.0.0";      
term = "LF";                  

% -------- 2) create server object -------------------------------------
s = tcpserver(bindAddress, port, "ConnectionChangedFcn", @onConnection);
s.configureTerminator(term);
s.configureCallback('terminator', @onData);

disp(" Databased classifier server is up:");
fprintf("   - Listening on %s:%d\n", bindAddress, port);
disp("===============================================");

while true
    pause(0.01);
end

% -------- 3) callback: client connected or disconnected --------------
function onConnection(src, evt)
    switch evt.Connected
        case true
            fprintf("[Info] Client %s connected.\n", src.ClientAddress);
        case false
            fprintf("[Info] Client %s disconnected.\n", evt.ClientAddress);
            disp('--------------------------------')
    end
end


% -------- 4) callback: when data arrives ------------------------------
function onData(thisTCP, ~)
    thisFolder = '/home/matlab/';
    cd(thisFolder);

    % --- Parse input safely ---
    tcpString = strtrim(readline(thisTCP)); 
    splitString = split(tcpString, '#'); 
    if numel(splitString) < 3
        error('[Error] Bad TCP format: expected "task#data#acceptedLoss".');
    end

    taskIdentifier = splitString(1); 
    dataString = splitString(2); 
    dataString = strrep(dataString, '\n', '');
    acceptedLoss = splitString(3);

    if isempty(dataString)
        error('[Error] Data could not be parsed.');
    end

    fprintf('[Info] Task identifier: %s\n', taskIdentifier);
    
    [result, loss] = detect_anomalyResultsBased(dataString, taskIdentifier, acceptedLoss);

    % --- Send result ---
    reply = [num2str(result), '#', num2str(loss), '\n']; 
    safeReply(thisTCP, reply);
        
    % --- Always restore working directory ---
    cd(thisFolder);
end


% -------- 5) Helper: send safely --------------------------------------
function safeReply(thisTCP, reply)
    try
        thisTCP.writeline(reply);
        flush(thisTCP);
    catch err
        disp(['[Error] Failed to send reply: ', err.message]);
    end
end
