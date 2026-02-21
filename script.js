// server.js - Guinée Flox PRO Fullstack avec likes + commentaires
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = "guinee-flox-secret"; // JWT secret

// -------------------- CLOUDINARY --------------------
cloudinary.config({
  cloud_name: "dwbqhkory",         // remplace par ton cloud name
  api_key: "<your_api_key>",       // remplace par ton api key
  api_secret: "<your_api_secret>", // remplace par ton api secret
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: "guinee-flox", resource_type: "auto" },
});

const upload = multer({ storage });

// -------------------- MONGODB --------------------
mongoose.connect("TON_URL_MONGODB", { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connecté ✅"))
  .catch(err => console.log(err));

// -------------------- MODELS --------------------
const User = mongoose.model("User", { email: String, password: String });

const Post = mongoose.model("Post", {
  user: String,
  text: String,
  media: String,
  mediaType: String,
  date: String,
  likes: { type: [String], default: [] },
  comments: { type: [{ user: String, text: String, date: String }], default: [] },
});

// -------------------- ROUTES --------------------

// REGISTER
app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ error: "Utilisateur existe" });

  const hashed = await bcrypt.hash(password, 10);
  await User.create({ email, password: hashed });
  res.json({ message: "Compte créé" });
});

// LOGIN
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: "Utilisateur introuvable" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Mot de passe incorrect" });

  const token = jwt.sign({ email }, SECRET, { expiresIn: "7d" });
  res.json({ token, email });
});

// UPLOAD MEDIA
app.post("/upload", upload.single("media"), (req, res) => {
  res.json({
    url: req.file.path,
    type: req.file.mimetype.startsWith("video") ? "video" : "image",
  });
});

// CREATE POST
app.post("/posts", async (req, res) => {
  const { user, text, media, mediaType } = req.body;
  const post = await Post.create({
    user,
    text,
    media,
    mediaType,
    date: new Date().toLocaleString(),
  });
  res.json(post);
});

// GET POSTS
app.get("/posts", async (req, res) => {
  const posts = await Post.find().sort({ _id: -1 });
  res.json(posts);
});

// LIKE / UNLIKE POST
app.post("/posts/:id/like", async (req, res) => {
  const { email } = req.body;
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post introuvable" });

  if (post.likes.includes(email)) {
    post.likes = post.likes.filter(e => e !== email);
  } else {
    post.likes.push(email);
  }

  await post.save();
  res.json({ likes: post.likes.length });
});

// ADD COMMENT
app.post("/posts/:id/comment", async (req, res) => {
  const { user, text } = req.body;
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post introuvable" });

  post.comments.push({ user, text, date: new Date().toLocaleString() });
  await post.save();
  res.json(post.comments);
});

// -------------------- SERVER --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend PRO lancé 🚀 sur port ${PORT}`));