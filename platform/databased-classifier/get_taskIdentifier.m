
function taskIdentifier = get_taskIdentifier(exercise, task, subtask, figureNumber)
    
    if nargin < 4
        figureNumber = 1;
    end

assert(ischar(subtask), 'subtask must be of type char'); 

% function builds the task identifier: 
taskIdentifier = [num2str(exercise), '_', num2str(task), '_' , subtask, '_', num2str(figureNumber)];

