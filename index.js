const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const uploadDir = path.join(__dirname, 'uploads');

// Tạo thư mục uploads nếu chưa có
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.error('Không thể tạo thư mục uploads:', err);
  process.exit(1);
}

// view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// middleware
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir));

// multer
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/zip', 'application/x-rar-compressed',
      'application/x-7z-compressed', 'application/x-tar',
      'audio/mpeg', 'video/mp4',
      'text/html', 'text/css', 'application/javascript', 'application/json'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Loại file ${file.mimetype} không được hỗ trợ.`), false);
    }
  }
});

// validate
const validateFilename = (req, res, next) => {
  const filename = path.basename(req.params.filename);
  if (filename.includes('..') || filename.includes('/')) {
    return res.status(400).render('error', { message: 'Tên file không hợp lệ' });
  }
  next();
};

// trang chính
app.get('/', (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      console.error('Lỗi đọc thư mục:', err);
      return res.status(500).render('error', { message: 'Lỗi server' });
    }

    const fileList = files.map((file) => {
      const originalName = file.substring(file.indexOf('-') + 1);
      return {
        storedName: file,
        originalName
      };
    }).sort((a, b) => a.originalName.localeCompare(b.originalName));

    res.render('index', { files: fileList });
  });
});

// upload file
app.post('/upload', upload.single('file'), (req, res) => {
  res.redirect('/');
}, (err, req, res, next) => {
  res.status(400).render('error', { message: err.message });
});

// xem thông tin file
app.get('/file/:filename', validateFilename, (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  fs.stat(filePath, (err, stats) => {
    if (err) return res.status(404).render('error', { message: 'Không tìm thấy file' });
    res.render('file', { filename: req.params.filename, stats });
  });
});

// tải file
app.get('/download/:filename', validateFilename, (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) return res.status(404).render('error', { message: 'File không tồn tại' });
    res.download(filePath);
  });
});

// xóa file
app.post('/delete/:filename', validateFilename, (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  fs.unlink(filePath, (err) => {
    if (err) return res.status(404).render('error', { message: 'Xóa file thất bại' });
    res.redirect('/');
  });
});

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
