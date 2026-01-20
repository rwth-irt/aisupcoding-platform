function txt = myCell2Str(C)
    validateattributes(C,{'cell'},{},mfilename,'C',1);

    bytes = getByteStreamFromArray(C);          % binary serialisation
    txt   = matlab.net.base64encode(bytes);     % → printable ASCII
end