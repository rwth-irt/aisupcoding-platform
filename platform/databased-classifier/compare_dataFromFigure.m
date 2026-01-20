function [minDiffs, assignment, costMatrix, totalMinCost] = compare_dataFromFigure(data1, data2)
    % Compare plotted data in two figures using Frobenius norm.
    % Requires Optimization Toolbox (matchpairs).

    n1 = numel(data1);
    n2 = numel(data2);
    costMatrix = inf(n1, n2);

    % --- Build cost matrix (only same-dimension matches)
    for i = 1:n1
        A = data1{i};
        [rA, cA] = size(A);
        for j = 1:n2
            B = data2{j};
            [rB, cB] = size(B);
            if rA == rB && cA == cB
                costMatrix(i, j) = (1/numel(A)) * norm(A - B, 'fro');
            end
        end
    end

    % --- Solve assignment problem
    [assignment, totalMinCost] = matchpairs(costMatrix, 1e50);

    % --- Initialize minDiffs for all plots in fig1
    minDiffs = inf(1, n1);

    % --- Fill with actual matches
    for k = 1:size(assignment, 1)
        i = assignment(k, 1);
        j = assignment(k, 2);
        minDiffs(i) = costMatrix(i, j);
    end

end
