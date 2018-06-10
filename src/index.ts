import * as aws from 'aws-sdk';
import * as gm from 'gm';

const im = gm.subClass({ imageMagick: true });

const s3 = new aws.S3();

const sizes = {
    avatar: { width: 64, height: 64 },
    card: { width: 320, height: 200 },
    feature: { width: 800, height: 400 },
    small: { width: 600, height: 460 },
    square: { width: 360, height: 360 },
    thumb: { width: 96, height: 96 },
};

const bucket = 'media.whhc.uk';

const getMimeType = (filename: string): string => {
    const ext = /(?:\.([^.]+))?$/.exec(filename.toLowerCase())[1];

    let mimeType;
    switch (ext) {
        case 'gif':
            mimeType = 'image/gif';
            break;
        case 'png':
            mimeType = 'image/png';
            break;
        case 'jpg':
        default:
            mimeType = 'image/jpeg';
    }

    return mimeType;
};

const loadFileFromBucket = (bucketName, fileName) => s3.getObject({
    Bucket: bucketName,
    Key: fileName,
}).promise();

const saveFileToBucket = (bucketName, fileName, body) => s3.putObject({
    Bucket: bucketName,
    Key: fileName,
    Body: body,
}).promise();

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

const resizeImage = (image, size) => {
    return new Promise((resolve, reject) => {
        try {
            im(image, 'image.png')
                .resize(size.width, size.height)
                .toBuffer((err, buffer) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(buffer);
                    }
                });
        } catch (err) {
            reject(err);
        }
    });
};

exports.handler = (event, context, callback) => {
    const path = event.path;
    const filename = path.substr(1);

    const size = (event.queryStringParameters && event.queryStringParameters.size)
        ? event.queryStringParameters.size
        : 'native';

    if (size !== 'native' && Object.keys(sizes).indexOf(size) < 0) {
        return errorResponse(callback, 'invalid size', 400);
    }

    const mimeType = getMimeType(filename);

    const originalKey = `native/${filename}`;
    const expectedKey = `${size}/${filename}`;

    loadFileFromBucket(bucket, expectedKey)
        .then((expected) => {
            console.log('FOUND EXPECTED KEY:', expectedKey);
            return successResponse(callback, expected.Body, mimeType);
        })
        .catch(() => {
            loadFileFromBucket(bucket, originalKey)
                .then((original) => {
                    console.log('FOUND ORIGINAL KEY:', expectedKey);

                    resizeImage(original.Body, sizes[size])
                        .then((resizedFile) => {
                            saveFileToBucket(bucket, expectedKey, resizedFile)
                                .then(() => {
                                    console.log('CREATED KEY:', expectedKey);
                                    return successResponse(callback, resizedFile, mimeType);
                                })
                                .catch(err => {
                                    console.log('ERROR:', 'creating key', expectedKey, err);
                                    return errorResponse(callback, 'image could not be generated', 500);
                                });
                        })
                        .catch(err => {
                            console.log('ERROR:', 'resizeImage', expectedKey, err);
                            return errorResponse(callback, 'image could not be generated', 500);
                        });
                })
                .catch(err => {
                    console.log('ERROR:', 'originalKey not found', expectedKey, err);
                    return errorResponse(callback, 'image not found', 404);
                });
        });
};
