function range_macro(min, max, delta) {
    // range(n) creates a array from 1 to n, including n.
    // range(m,n) creates a array from m to n, including n.
    // range(n,m,delta) creates a array from n to m, by step of delta. May not include max

    var arr = [];
    var myStepCount;

    if (arguments.length === 1) {
        for (var ii = 0; ii < min; ii++) {
            arr[ii] = ii + 1;
        };
    } else {
        if (arguments.length === 2) {
            myStepCount = (max - min);
            for (var ii = 0; ii <= myStepCount; ii++) {
                arr.push(ii + min);
            };
        } else {
            myStepCount = Math.floor((max - min) / delta);
            for (var ii = 0; ii <= myStepCount; ii++) {
                arr.push(ii * delta + min);
            };
        }
    }

    return arr;

}
