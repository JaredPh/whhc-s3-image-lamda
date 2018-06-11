const sendResponse = (callback, body, contentType, statusCode, errorMessage?) => {
    const response = {
        statusCode,
        headers: {
            'Content-Type': contentType,
            'X-Error': errorMessage || null,
        },
        body: body.toString('base64'),
        isBase64Encoded: true,
    };

    return callback(null, response);
};

const successResponse = (callback, body, contentType) => {
    return sendResponse(callback, body, contentType, 200);
};

const errorResponse = (callback, body, statusCode, err?) => {
    return sendResponse(callback, null, null, statusCode, body);
};

export const methods = {
    withSuccess: successResponse,
    withError: errorResponse,
};
