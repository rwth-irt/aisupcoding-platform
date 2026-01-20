function [anomaly, minDiffs] = detect_anomalyResultsBased(studentString, ...
    completeTaskIdentifier, acceptedLoss)
% Function that gets the json string from the TCP request and then decides
% whether or not it is correct (anomaly detection)


% 1) Set defaults and validate inputs
anomaly = true; % Fail-safe default: assume anomaly unless proven otherwise
minDiffs = Inf; % Default difference is infinite
origDir = pwd; % Remember where we came from
cDir = onCleanup(@() cd(origDir)); % Always return to original folder

% Validate 'acceptedLoss' *before* any processing
try
    acceptedLossNum = str2double(acceptedLoss);
    if isnan(acceptedLossNum) || acceptedLossNum < 0
        % Create a specific error to catch
        error('MATLAB:detect_anomaly:InvalidLoss', ...
            'acceptedLoss ("%s") must be a valid non-negative number.', acceptedLoss);
    end
catch ME
    warning(ME.identifier, '[Error] Invalid acceptedLoss input: %s', ME.message);
    return % Exit function
end

% 2) Decode the student submission
try
    studentData = myStr2Cell(studentString);
catch ME
    warning(ME.identifier, '[Error] Could not decode student submission: %s', ME.message);
    return
end

% 3) Split the task identifier
try
    [exercise, task, subtask, figureNumber] = split_taskIdentifier(completeTaskIdentifier);
catch ME
    warning(ME.identifier, '[Error] Task identifier could not be parsed: %s', ME.message);
    return
end

% 4) Prepare paths
% Use sprintf for clean, two-digit formatting (e.g., 9 -> "09")
exerciseChar = sprintf('%02d', exercise);
% Use fullfile to build paths reliably across operating systems (Win/Mac/Linux)
fullFolderName = fullfile(exerciseChar, 'documents');
fprintf('[Info] Detected exercise: %s\n', exerciseChar);

% 5) Navigate to the correct folder
try
    cd(fullFolderName);
    fprintf('[Info] Navigating to folder: %s\n', fullFolderName);
catch ME
    warning(ME.identifier, '[Error] Could not change directory to "%s": %s', ...
        fullFolderName, ME.message);
    return
end

% 6) Open figure, extract data, and compare
try
    % Open the figure (invisible)
    figFileName = [char(completeTaskIdentifier), '.fig'];
    fprintf('[Info] Trying to open figure: %s\n', figFileName);
    referenceFigure = openfig(figFileName, 'invisible');
    
    % CRITICAL: Ensure the figure is closed when the function exits or errors
    cFig = onCleanup(@() close(referenceFigure));
    
    fprintf('[Info] Opened figure: %s\n', figFileName);
    
    % Extract data
    referenceData = extract_dataFromFigure(referenceFigure);
    
    % Compare both ways and find the maximum mean difference
    meanDiff_StuToRef = mean(compare_dataFromFigure(studentData, referenceData));
    meanDiff_RefToStu = mean(compare_dataFromFigure(referenceData, studentData));
    
    % Check for the maximum:
    minDiffs = max([meanDiff_StuToRef, meanDiff_RefToStu]);
    
    % Print the differences
    fprintf('[Info] Mean Difference (Student -> Ref): %s\n', num2str(meanDiff_StuToRef));
    fprintf('[Info] Mean Difference (Ref -> Student): %s\n', num2str(meanDiff_RefToStu));
    fprintf('[Info] Max Mean Difference for comparison: %s\n', num2str(minDiffs));
    
catch ME
    warning(ME.identifier, '[Error] Data extraction / comparison failed: %s', ME.message);
    return
end

% 7) Decide whether this is an anomaly
anomaly = minDiffs > acceptedLossNum;

% Provide a clear final status message
if ~anomaly
    fprintf('[Info] Result ACCEPTED. Difference (%f) is within threshold (%f).\n', minDiffs, acceptedLossNum);
else
    fprintf('[Info] ANOMALY DETECTED. Difference (%f) exceeds threshold (%f).\n', minDiffs, acceptedLossNum);
end

end