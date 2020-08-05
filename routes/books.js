const express = require("express");
const auth = require("../middleware/auth");

const { createUser, loginUser, logout } = require("../controllers/books");

const router = express.Router();

// 각 경로 별로 데이터 가져올 수 있도록, router 셋팅
router.route("/users").post(createUser);
router.route("/users/login").post(loginUser);
router.route("/users/logout").delete(auth, logout);

module.exports = router;
