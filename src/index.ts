import * as im from './image';
import { methods as respond } from './response';
import * as s3 from './s3';

const sizes = {
    avatar: { width: 64, height: 64 },
    card: { width: 320, height: 200 },
    feature: { width: 800, height: 400 },
    small: { width: 600, height: 460 },
    square: { width: 360, height: 360 },
    thumb: { width: 96, height: 96 },
};

exports.handler = (event, context, callback) => {
    const bucket = process.env.BUCKET;

    const path = event.path;
    const filename = path.substr(1);

    const size = (event.queryStringParameters && event.queryStringParameters.size)
        ? event.queryStringParameters.size
        : 'native';

    if (size !== 'native' && Object.keys(sizes).indexOf(size) < 0) {
        return respond.withError(callback, 'invalid size', 400);
    }

    const mimeType = im.getMimeType(filename);

    const originalKey = `native/${filename}`;
    const expectedKey = `${size}/${filename}`;

    s3.loadFileFromBucket(bucket, expectedKey)
        .then((expected) => {
            console.log('FOUND EXPECTED KEY:', expectedKey);
            return respond.withSuccess(callback, expected.Body, mimeType);
        })
        .catch(() => {
            s3.loadFileFromBucket(bucket, originalKey)
                .then((original) => {
                    console.log('FOUND ORIGINAL KEY:', expectedKey);

                    im.resizeImage(original.Body, sizes[size])
                        .then((resizedFile) => {
                            s3.saveFileToBucket(bucket, expectedKey, resizedFile)
                                .then(() => {
                                    console.log('CREATED KEY:', expectedKey);
                                    return respond.withSuccess(callback, resizedFile, mimeType);
                                })
                                .catch(err => {
                                    console.log('ERROR:', 'creating key', expectedKey, err);
                                    return respond.withError(callback, 'image could not be generated', 500);
                                });
                        })
                        .catch(err => {
                            console.log('ERROR:', 'resizeImage', expectedKey, err);
                            return respond.withError(callback, 'image could not be generated', 500);
                        });
                })
                .catch(err => {
                    console.log('ERROR:', 'originalKey not found', expectedKey, err);
                    return respond.withError(callback, 'image not found', 404);
                });
        });
};
