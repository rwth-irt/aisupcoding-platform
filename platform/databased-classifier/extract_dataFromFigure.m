function dataCell = extract_dataFromFigure(fig)
% Extracts data from lines, scatter, and surf/surface plots in a figure.

if nargin < 1 || ~ishandle(fig)
    fig = gcf;
end

% Find relevant graphics objects
lines    = findall(fig, 'Type', 'line');
scatters = findall(fig, 'Type', 'scatter');   % lowercase
surfaces = findall(fig, 'Type', 'surface');   % surf, mesh, pcolor, etc.

% Combine
allObjs = [lines; scatters; surfaces];

% Initialize cell array
dataCell = cell(numel(allObjs), 1);

for i = 1:numel(allObjs)
    obj = allObjs(i);
    t = get(obj, 'Type');

    switch t
        case {'line','scatter'}
            x = get(obj, 'XData');
            y = get(obj, 'YData');
            z = [];
            if isprop(obj, 'ZData')
                z = get(obj, 'ZData');
            end
            if isempty(z)
                arr = [x(:)'; y(:)'];
            else
                arr = [x(:)'; y(:)'; z(:)'];
            end

        case 'surface'
            % surf-like objects have matrix X,Y,Z (same size)
            X = get(obj, 'XData');
            Y = get(obj, 'YData');
            Z = get(obj, 'ZData');
            % Optionally remove NaNs (breaks in surface)
            mask = isfinite(X) & isfinite(Y) & isfinite(Z);
            X = X(mask); Y = Y(mask); Z = Z(mask);
            arr = [X(:)'; Y(:)'; Z(:)'];
            % If you also want color values:
            % C = get(obj, 'CData'); % may be matrix same size as Z

        otherwise
            % Fallback (shouldn't trigger with the above types)
            x = get(obj, 'XData');
            y = get(obj, 'YData');
            if isprop(obj, 'ZData') && ~isempty(get(obj, 'ZData'))
                z = get(obj, 'ZData');
                arr = [x(:)'; y(:)'; z(:)'];
            else
                arr = [x(:)'; y(:)'];
            end
    end

    dataCell{i} = arr;
end