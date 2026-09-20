const { v2: cloudinary } = require('cloudinary');
const { Readable } = require('stream');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const getMissingCloudinaryConfig = () =>
  ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].filter(
    (key) => !process.env[key]
  );

const configureCloudinary = () => {
  const missingConfig = getMissingCloudinaryConfig();
  if (missingConfig.length) {
    const error = new Error(
      `Cloudinary is not configured. Missing: ${missingConfig.join(', ')}.`
    );
    error.statusCode = 503;
    throw error;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
};

const uploadResumeBuffer = ({ buffer, jobId, originalname }) => {
  configureCloudinary();
  const extension = path.extname(originalname).toLowerCase();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `resumes/${jobId}`,
        public_id: `${uuidv4()}${extension}`,
        resource_type: 'raw',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
};

const deleteResumeAsset = async (publicId) => {
  if (!publicId || getMissingCloudinaryConfig().length) return;

  configureCloudinary();
  await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
};

module.exports = { uploadResumeBuffer, deleteResumeAsset };
