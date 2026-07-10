const multer = require("multer");
const multerS3 = require("multer-s3");
const { randomUUID } = require("crypto");
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../aws-config");

const BUCKET = process.env.S3_BUCKET || "oa-files-bucket";
const FOLDER = "panillas-pagos-pda";

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: BUCKET,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, `${FOLDER}/${randomUUID()}-${file.originalname}`);
    },
  }),
});

const uploadFields = upload.fields([
  { name: "adjunto", maxCount: 1 },
  { name: "comprobante", maxCount: 1 },
]);

const s3Client = new S3Client({ region: process.env.AWS_REGION });

const deleteFileFromS3 = async (key) => {
  const params = { Bucket: BUCKET, Key: key };
  try {
    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);
    console.log(`File deleted successfully: ${key}`);
  } catch (err) {
    console.error("Error deleting file from S3:", err);
  }
};

module.exports = { uploadFields, deleteFileFromS3 };
