import * as gm from 'gm';

const im = gm.subClass({ imageMagick: true });

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

export {
    getMimeType,
    resizeImage,
};
