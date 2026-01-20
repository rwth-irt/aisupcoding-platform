function [exercise, task, subtask, figureNumber] = split_taskIdentifier(taskIdentifier)

% function that splits the task identifier:
splitString = strsplit(taskIdentifier, '_');

exercise = str2num(splitString{1}); %#ok<*ST2NM>
task     = str2num(splitString{2}); 
subtask  = splitString{3}; 

if length(splitString) > 3
    figureNumber = str2num(splitString{4}); 
else
    figureNumber = []; 
end



