function answer = classify_exercise(exercise, task, subtask, varargin)
% Documentation:
% 
%    - exercise:     Nummer der Übung (Woche) (1, 2, ...)
%    - task:         Aufgabennummer (1, 2, 3, ...)
%    - subtask:      Unteraufgabe (a, b, ...)

if ischar(exercise) || isstring(exercise)
    exercise = str2double(exercise);
end
% make a double out of this string in case:
if ischar(task) || isstring(task)
    task = str2double(task);
end

%% default options:
opts.timeOut              = 15;                       % time out to prevent user from spamming
opts.resultsBasedFeedback = true;                     % true or false for results-based feedback 
% overwrite default options:
opts = checkOptions(opts, varargin, true);

% Erstelle eine komplette Aufgabenbeschreibung:
completeTaskIdentifier = [num2str(exercise), '_', num2str(task), '_', subtask];

%% Get the id of the students:
[studentID, developer] = generate_studentID();

%% Check for timeout:
fieldName = ['task_', completeTaskIdentifier];
persistent lastCallTime
if isempty(lastCallTime)
    lastCallTime = containers.Map();
end

currentTime = now * 86400; % convert days to seconds
if isKey(lastCallTime, fieldName)
    elapsed = currentTime - lastCallTime(fieldName);
    if elapsed < opts.timeOut && ~developer
        remaining = ceil(opts.timeOut - elapsed);
        answer = sprintf('Please wait %d more seconds before retrying.', remaining);
        return;
    end
end

%% Getting and saving the number of attempts:
persistent attemptCounter
if isempty(attemptCounter)
    attemptCounter = struct();
end

if ~isfield(attemptCounter, fieldName)
    attemptCounter.(fieldName) = 1;
else
    attemptCounter.(fieldName) = attemptCounter.(fieldName) + 1;
end
thisAttemptCounter = attemptCounter.(fieldName);

%% Get all figures that match the task identifier:
foundFigures = {};
nFoundFigures = 0;
while true
    thisIdentifier = [completeTaskIdentifier, '_', num2str(nFoundFigures + 1)];
    thisFigHandle  = search_forFigure(thisIdentifier);
    if isempty(thisFigHandle)
        break;
    end
    foundFigures{end + 1} = thisFigHandle; %#ok<AGROW>
    nFoundFigures = nFoundFigures + 1;
end

%% Classify all found figures:

anomalyFigure = cell(nFoundFigures, 1);
for figIndex = 1 : nFoundFigures
    % extract the data and send to server:
    thisData = extract_dataFromFigure(foundFigures{figIndex});
    isAnomaly = send_dataToServer([completeTaskIdentifier, '_', num2str(figIndex)], ...
                thisAttemptCounter, studentID, thisData);
    anomalyFigure{figIndex} = strrep(isAnomaly, '\n', '');
end

%% Build figure correctness summary:

figuresCorrect = false(nFoundFigures, 1);
figureCorrectnessString = '';

try
    for figIndex = 1 : nFoundFigures
        
        % the found figures:
        assert(strcmp(anomalyFigure{figIndex}, '0') || strcmp(anomalyFigure{figIndex}, '1'), ...
            'Anomaly Detection failed');
        figuresCorrect(figIndex) = strcmp(anomalyFigure{figIndex}, '0');
        figureCorrectnessString = [figureCorrectnessString, 'Figure ', ...
                                  [completeTaskIdentifier, '_', num2str(figIndex)], ' looks '];  %#ok<AGROW>
        
        % add the information for the figures: 
        if figuresCorrect(figIndex)
            toAdd = 'correct. ';
        else
            toAdd = '**INCORRECT**. ';
        end
        figureCorrectnessString = [figureCorrectnessString, toAdd]; %#ok<AGROW>
    end
    
    if all(figuresCorrect) && nFoundFigures > 0
        % all figures are correct, we do not need to check for errors and
        % escape here. Append some nice words at the end: 
        answer = [figureCorrectnessString, 'Well done!']; 
        return; 
    end

catch
    disp(['Warning: Server anomaly detection failed, ' ...
          'continuing with code-based analysis...']);
end

% If figures are correct and we have figures, we might want to return early, 
% BUT since we want text feedback now, we only return here if explicitly desired.
% For now, we continue to allow text feedback even if figures are correct.

%% Extract the student solution from the MLX file:
try
    % trying to read the exercise mlx: 
    completeString = liveScriptToString(['Uebung_', num2str(exercise), '.mlx']);
catch
    % respond that we could not read the exercise mlx file: 
    answer = sprintf(['[Error] Could not read Uebung_%d.mlx.' ...
        ' Please check if the file exists in your directory.'], exercise);
    return;
end

%% 1. Find Code Snippets

nCodeSnippetsFound = 0;
foundCodeSnippets = {};

while true
    % code words for the end and the start of the student solutions: 
    codeWordStart = ['% - start solution ', completeTaskIdentifier, '_', ...
                    num2str(nCodeSnippetsFound + 1)];
    codeWordEnd   = ['% - end solution ', completeTaskIdentifier, '_', ...
                    num2str(nCodeSnippetsFound + 1)];
    
    % trying to pick the relevant parts: 
    thisCodeSnippet = pick_relevantPartInString(completeString, codeWordStart, codeWordEnd);
    if ~isempty(thisCodeSnippet)
        nCodeSnippetsFound = nCodeSnippetsFound + 1;
        foundCodeSnippets{nCodeSnippetsFound} = thisCodeSnippet; %#ok<AGROW>
    else
        % jump out here: 
        break; 
    end
end

%% 2. Find Free Text Snippets
nTextSnippetsFound = 0;
foundTextSnippets = {};

while true
    % code words for the end and the start of the student free text: 
    codeWordStart = ['% - start freeText ', completeTaskIdentifier, '_', ...
                    num2str(nTextSnippetsFound + 1)];
    codeWordEnd   = ['% - end freeText ', completeTaskIdentifier, '_', ...
                    num2str(nTextSnippetsFound + 1)];
    
    % trying to pick the relevant parts: 
    thisTextSnippet = pick_relevantPartInString(completeString, codeWordStart, codeWordEnd);
    if ~isempty(thisTextSnippet)
        nTextSnippetsFound = nTextSnippetsFound + 1;
        foundTextSnippets{nTextSnippetsFound} = thisTextSnippet; %#ok<AGROW>
    else
        % jump out here: 
        break; 
    end
end

%% Validate findings
if nCodeSnippetsFound == 0 && nTextSnippetsFound == 0
    % write a warning that we could not find any code OR text snippets: 
    disp(['[Warning] No code or text snippets found. ' ...
          'Please check that the start and end markers exist' ...
          ' in your .mlx file.']);
      
    % return the solution from the figure classification only:
    if ~isempty(figureCorrectnessString)
        answer = figureCorrectnessString; 
    else
        % write an error message:
        answer = '[Error] No content (Code/Text) found and Anomaly Detection unavailable.'; 
    end
    return; 
end

%% Prepare Data for Server
% Combine findings into single strings:
studentCode = strjoin(foundCodeSnippets, newline); 
studentText = strjoin(foundTextSnippets, newline);

% Initialize answer with figure results
answer = figureCorrectnessString; 

% Add separator if we have figure results and are adding text results
if ~isempty(answer)
    answer = [answer, newline, newline]; 
end

%% Send data to Server
    % We prioritize the LLM call which likely handles both code and text context
    % Note: Assuming send_studentTextToLLM can take the combined info or just text.
    % Based on your prompt, we pass the text and figure string.
    
    try
        if nTextSnippetsFound > 0 
            studentText = string(studentText); 
            llmResponse = send_studentTextToLLM(completeTaskIdentifier, ...
                                        thisAttemptCounter, ...
                                        studentID, ...
                                        studentText);
        end

        if nCodeSnippetsFound > 0
            studentCode = string(studentCode); 
            llmResponse = send_studentSolutionToLLM(completeTaskIdentifier, ...
                                        thisAttemptCounter, ...
                                        studentID, ...
                                        studentCode, ...
                                        figureCorrectnessString);
        end

        % Append LLM response to the answer
        answer = llmResponse;
    catch ME
        answer = [answer, '[Error] Server communication failed: ', ME.message];
    end

% update last call time:
lastCallTime(fieldName) = now * 86400;

end