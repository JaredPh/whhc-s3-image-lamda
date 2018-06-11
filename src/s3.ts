import * as aws from 'aws-sdk';
import * as moment from 'moment';

const s3 = new aws.S3();

const loadFileFromBucket = (bucketName, fileName) => s3.getObject({
    Bucket: bucketName,
    Key: fileName,
}).promise();

const saveFileToBucket = (bucketName, fileName, body) => s3.putObject({
    Bucket: bucketName,
    Key: fileName,
    Body: body,
    Expires: moment().add(+process.env.EXPIRATION_TIME, process.env.EXPIRATION_UNIT).toDate(),
}).promise();

export {
    loadFileFromBucket,
    saveFileToBucket,
};
