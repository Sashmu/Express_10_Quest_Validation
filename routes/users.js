const usersRouter = require("express").Router();
const loginRouter = require("express").Router();

const connection = require("../db-config");
const Joi = require("joi");

const argon2 = require("argon2");

const hashingOptions = {
  type: argon2.argon2id,
  memoryCost: 2 ** 16,
  timeCost: 5,
  parallelism: 1,
};

const hashPassword = (plainPassword) => {
  return argon2.hash(plainPassword, hashingOptions);
};

const verifyPassword = (plainPassword, hashedPassword) => {
  return argon2.verify(hashedPassword, plainPassword, hashingOptions);
};

// GET Route (Get all user's details)

usersRouter.get("/", (req, res) => {
  let sql = "SELECT * FROM users";
  const sqlValues = [];
  if (req.query.language) {
    sql += " WHERE language = ?";
    sqlValues.push(req.query.language);
  }
  connection.query(sql, sqlValues, (err, results) => {
    if (err) {
      res.status(500).send("Error retrieving users from database");
    } else {
      res.json(results);
    }
  });
});

usersRouter.get("/", (req, res) => {
  const userId = req.params.id;
  connection.query(
    "SELECT * FROM users WHERE id = ?",
    [userId],
    (err, results) => {
      if (err) {
        res.status(500).send("Error retrieving user from database");
      } else {
        if (results.length) res.json(results[0]);
        else res.status(404).send("User not found");
      }
    }
  );
});

// Post a new user with password and check if email already exists 

usersRouter.post("/", async (req, res) => {
  const { firstname, lastname, email, password, city, language } = req.body;
  const db = connection.promise();
  let validationErrors = null;

  console.log(req.body);

  try {
    let [emailExist] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    // console.log(emailExist);
    if (emailExist.length > 0) {
      return await Promise.reject("DUPLICATE_EMAIL");
    }

    validationErrors = Joi.object({
      firstname: Joi.string().max(255).required(),
      lastname: Joi.string().max(255).required(),
      email: Joi.string().email().max(255).required(),
      password: Joi.string().alphanum().max(255).required(),
      city: Joi.string().optional().max(255),
      language: Joi.string().optional().max(255),
    }).validate(
      { firstname, lastname, email, password, city, language },
      { abortEarly: false }
    ).error;
    if (validationErrors) return await Promise.reject("INVALID_DATA");

    // Hashing the password input
    const hashedPassword = await hashPassword(password);
    // console.log(hashedPassword)
    const [data] = await db.query(
      "INSERT INTO users (firstname, lastname, email, city, language, hashedPassword) VALUES (?, ?, ?, ?, ?, ?)",
      [firstname, lastname, email, city, language, hashedPassword]
    );

    if (data) {
      res.status(201).json({
        id: data.insertId,
        firstname,
        lastname,
        email,
        city,
        language,
        password: hashedPassword,
      });
    }
  } catch (err) {
    console.error(err);
    if (err === "DUPLICATE_EMAIL") {
      res.status(409).json({ message: "This email is already used" });
    } else if (err === "INVALID_DATA") {
      res.status(422).json({ validationErrors });
    } else res.status(500).send("Error saving the user");
  }
});

// Post route For Login(check if email and password already exists)

loginRouter.post("/checkCredentials", async (req, res) => {
  const db = connection.promise();
  const { email, password } = req.body;

  try {
    let [userExist] = await db.query("SELECT * FROM users WHERE email = ? ", [
      email,
    ]);

    console.log(userExist);
    if (userExist.length >= 0) {
      const result = await verifyPassword(
        password,
        userExist[0].hashedPassword
      );

      if (result) {
        res.status(200).send("User Found and Password matched");
      } else {
        await Promise.reject("PASSWORD INCORRECT");
      }
    } else {
      await Promise.reject("NOT FOUND");
    }
  } catch (err) {
    if (err === "NOT FOUND") {
      res.status(500).send("User Not found");
    } else if (err === "PASSWORD INCORRECT") {
      res.status(500).send("Incorrect Password");
    } else {
      res.status(500).send("Error saving the user");
    }
  }
});

// Update Route (Validate the inputs and update the users table only if the id exists)

usersRouter.put("/:id", async (req, res) => {
  const userId = req.params.id;
  const db = connection.promise();
  let existingUser = null;
  const { firstname, lastname, email, city, language } = req.body;
  let validationErrors = null;
  try {
    validationErrors = Joi.object({
      firstname: Joi.string().optional().max(255),
      lastname: Joi.string().max(255).optional(),
      email: Joi.string().email().max(255).optional(),
      city: Joi.string().optional().max(255),
      language: Joi.string().optional().max(255),
    }).validate(
      { firstname, lastname, email, city, language },
      { abortEarly: false }
    ).error;

    if (validationErrors) return await Promise.reject("INVALID_DATA");

    const [details] = await db.query("SELECT * FROM users WHERE id = ?", [
      userId,
    ]);
    if ([details]) {
      existingUser = details[0];
      if (!existingUser) {
        return await Promise.reject("RECORD_NOT_FOUND");
      } else {
        await db.query("UPDATE users SET ? WHERE id = ?", [req.body, userId]);
        res.status(200).json({ ...existingUser, ...req.body });
      }
    }
  } catch (err) {
    console.error(err);
    if (err === "RECORD_NOT_FOUND") {
      res.status(404).send(`User with id ${userId} not found.`);
    } else if (err === "INVALID_DATA") {
      res.status(404).json({ validationErrors });
    } else res.status(500).send("Error updating a user");
  }
});

// Delete route

usersRouter.delete("/d", (req, res) => {
  connection.query(
    "DELETE FROM users WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error deleting an user");
      } else {
        if (result.affectedRows) res.status(200).send("🎉 User deleted!");
        else res.status(404).send("User not found.");
      }
    }
  );
});

module.exports = {
  usersRouter,
  loginRouter,
  hashPassword,
  verifyPassword,
};
