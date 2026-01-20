function options = checkOptions(options, inputArgs, doWarning)
% options = checkOptions(options, inputArgs, doWarning)
%
% options: struct with valid fields
% inputargs: a cell of inputs -> varargin of a higher function
% doWarning: true (default), false
%

if nargin == 2
    doWarning = true;
end

if isempty(inputArgs)
    return
end

% List of valid options to accept, simple way to deal with illegal user input
validEntries = fieldnames(options);

% Loop over each input name-value pair, check whether name is valid and overwrite fieldname in options structure.
ii = 1;
while ii <=length(inputArgs)
    entry = inputArgs{ii};
    
    [isValid,validEntry] = isValidEntry(validEntries,entry,doWarning);
    if isValid
        options.(validEntry) = inputArgs{ii+1};
        ii = ii + 1;  % move one additional step
        
    elseif isstruct(entry)
        fieldNames = fieldnames(entry);
        for idx = 1:length(fieldNames)
            subentry = fieldNames{idx};
            [isValid,validEntry] = isValidEntry(validEntries,subentry,doWarning);
            if isValid 
                options.(validEntry) = entry.(subentry);
            end
        end
    end
    ii = ii + 1; % go to the next input argument
end
end

function [bool,validEntry] = isValidEntry(validEntries, input,doWarning)
% allow input of an options structure that overwrites existing fieldnames with its own, for increased flexibility

% invalid options
bool = false;
validEntry = '';
if ~ischar(input)
    return
end

% Check case sensitive
valIdx = strcmp(input,validEntries); 

% Check case insensitive
if nnz(valIdx) == 0 && ~isstruct(input) && ischar(input)
    valIdx = strcmpi(input,validEntries); 
end

% Check case insensitive and allow partial finds
if nnz(valIdx) == 0 && ~isstruct(input) && ischar(input)
    valIdx = contains(validEntries,input,'IgnoreCase',true); 
end

% return if exactly one valid option found
if nnz(valIdx) == 1 
    validEntry = validEntries{valIdx};
    bool = true;
    return
end

% Return if no warning should be given
if ~doWarning
    return
end

stack = dbstack(1);
fcnName = stack(2).file;

% Do a Warning
validOptions = strjoin(validEntries,', ');

if nnz(valIdx) > 1
    warning('-%s.m: Option "%s" is not valid since multiple options could be found. Allowed options are [%s].',fcnName,input,validOptions)
else
    warning('-%s.m: Option "%s" could not be found. Allowed options are [%s].',fcnName,input,validOptions)
end
end
