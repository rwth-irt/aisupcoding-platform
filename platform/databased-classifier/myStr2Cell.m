
function C = myStr2Cell(txt)
    validateattributes(txt,{'char','string'},{},mfilename,'txt',1);

    bytes = matlab.net.base64decode(txt);
    C     = getArrayFromByteStream(bytes);      % exact copy of original
end