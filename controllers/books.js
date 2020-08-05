const connection = require("../db/mysql_connection");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const moment = require("moment");

// @desc    회원가입
// @route   POST /api/v1/books/users
// @parameters  email, password
exports.createUser = async (req, res, next) => {
  let email = req.body.email;
  let password = req.body.passwd;
  let age = req.body.age;

  const hashedPassword = await bcrypt.hash(password, 8);

  // 이메일이 정상적인가 체크
  if (!validator.isEmail(email)) {
    res.status(500).json({ success: false });
    return;
  }

  let query = "insert into book_user (email, passwd, age) values ?";

  data = [email, hashedPassword, age];
  let user_id;
  try {
    [result] = await connection.query(query, [[data]]);
    user_id = result.insertId;
  } catch (e) {
    if (e.errno == 1062) {
      //이메일 중복된것이다
      res
        .status(400)
        .json({ success: false, errno: 1, message: "이메일 중복" });
      return;
    } else {
      console.log(e);
      res.status(500).json({ success: false, error: e });
      return;
    }
  }
  // 토큰 토큰 토큰
  let token = jwt.sign({ user_id: user_id }, process.env.ACCESS_TOKEN_SECRET);
  query = "insert into book_user_token (token, user_id) values (?,?)";
  data = [token, user_id];
  try {
    [result] = await connection.query(query, data);
    res.status(200).json({ success: true, result: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e });
  }
};

// 로그인 api를 개발.
// @desc    로그인
// @route   POST /api/v1/books/users/login
// @parameters email, passwd
exports.loginUser = async (req, res, next) => {
  let email = req.body.email;
  let password = req.body.passwd;

  let query = `select * from book_user where email = "${email}" `;

  try {
    [rows] = await connection.query(query);

    // 비밀번호 체크 : 비밀번호가 서로 맞는지 체크
    let savedPassword = rows[0].passwd;
    let isMatch = bcrypt.compareSync(password, savedPassword);

    if (isMatch == false) {
      res.status(400).json({ success: false, result: isMatch });
      return;
    }

    let token = jwt.sign(
      { user_id: rows[0].id },
      process.env.ACCESS_TOKEN_SECRET
    );

    query = `insert into book_user_token (token, user_id) values (?,?)`;
    let data = [token, rows[0].id];

    try {
      [result] = await connection.query(query, data);
      res.status(200).json({ success: true, result: isMatch, token: token });
    } catch (e) {
      console.log("  ************  1번째  ", e);
      res.status(500).json({ success: false, error: e });
    }
  } catch (e) {
    console.log("  ************  2번째  ", e);
    res.status(500).json({ success: false, error: e });
  }
};

// @desc  로그아웃 api : DB에 해당 유저의 현재 토큰값을 삭제
// @route POST /api/v1/books/users/logout
// @parameters  no
exports.logout = async (req, res, next) => {
  // 토큰테이블에서 현재 이 헤더에 있는 토큰으로 삭제한다
  let token = req.user.token;
  let user_id = req.user.id;

  let query = `delete from book_user_token where user_id = ${user_id} and token = "${token}"`;

  try {
    [result] = await connection.query(query);
    if (result.affectedRows == 1) {
      res.status(200).json({ success: true, result: result });
      return;
    } else {
      res.status(400).json({ success: false });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: e });
  }
};

// @desc  모든 책 목록 불러오기 api
// @route GET /api/v1/books/
// @parameters  offset, limit
exports.getBooks = async (req, res, next) => {
  let offset = req.query.offset;
  let limit = req.query.limit;

  let query = `select * from book limit ${offset},${limit}`;
  try {
    const [rows, fields] = await connection.query(query);
    res.status(200).json({ success: true, items: rows });
  } catch (e) {
    console.log(e);
    next(new ErrorResponse("도서목록을 가져오는 중 에러 발생", 400));
  }
};

// @desc  책 선택 대여 api
// @route POST /api/v1/books/
// @parameters no
exports.rentalBook = async (req, res, next) => {
  let book_id = req.body.book_id;
  let user_id = req.user.id;
  let token = req.user.token;

  var today = new Date(); //현재 날짜 및 시간   //현재시간 기준 계산
  let limit_date = new Date(Date.parse(today) + 7 * 1000 * 60 * 60 * 24); //일주일후
  limit_date = moment(limit_date).utc().format("YYYY-MM-DD HH:mm:ss");

  let query = `SELECT * FROM book_user AS BU , book AS B WHERE BU.age >= B.limit_age AND B.id = ${book_id} AND BU.id = ${user_id};`;
  try {
    [rows] = await connection.query(query);
    console.log(rows.length);
    if (rows.length == 0) {
      res.status(400).json();
      return;
    }
  } catch (e) {
    res.status(500).json();
    return;
  }

  query = `insert into book_rental (book_id,user_id,limit_date) values (${book_id},${user_id},"${limit_date}")`;
  try {
    [result] = await connection.query(query);
    res.status(200).json({ success: true, result });
  } catch (e) {
    res.status(500).json(e);
    return;
  }
};

// @desc  내가 대여 중인 책목록 api
// @route GET /api/v1/books/rental
// @parameters no
exports.rentalbookList = async (req, res, next) => {
  let user_id = req.user.id;

  let query = `select * from book_rental as br join book as b on r.book_id = b.id where user_id = ${user_id} `;

  try {
    [result] = await connection.query(query);
    res.status(200).json({ success: true, result: result });
  } catch (e) {
    console.log(e);
    res.status(400).json({ e });
  }
};

// @desc  내가 대여한 책 반납
// @route GET /api/v1/books/rental
// @parameters no
exports.returnBook = async (req, res, next) => {
  let user_id = req.user.id;
  let token = req.user.token;
  let book_id = req.body.book_id;

  let query = `select * from book_user_token where user_id = ${user_id} and token = "${token}"`;

  try {
    [rows] = await connection.query(query);
    console.log(rows.length);
    if (rows.length == 0) {
      res.status(400).json();
      return;
    }
  } catch (e) {
    res.status(500).json();
    return;
  }

  query = `delete from book_rental where book_id = ${book_id}`;

  try {
    [result] = await connection.query(query);
    res.status(200).json({ success: true, result: result });
  } catch (e) {
    console.log(e);
    res.status(400).json({ e });
  }
};
